// SPDX-License-Identifier: AGPL-3.0-only

package app

import (
	"bytes"
	"crypto/sha256"
	"fmt"
	"io"
	"os"
	"path/filepath"
	"strings"
	"sync"
	"time"

	"github.com/Fizm00/organizer/internal/config"
	"github.com/fsnotify/fsnotify"
	"gopkg.in/yaml.v3"
)

// ConfigService manages application configuration, disk persistence with backups,
// comment preservation, and filesystem change detection.
type ConfigService struct {
	configPath      string
	currentCfg      *config.Config
	eventSink       EventSink
	mu              sync.RWMutex
	fsWatcher       *fsnotify.Watcher
	stopWatcher     chan struct{}
	lastWrittenHash [32]byte
	recentHashes    map[[32]byte]time.Time
	isFirstRun      bool
}

// NewConfigService creates and initializes a ConfigService.
func NewConfigService(configPath string, sink EventSink) (*ConfigService, error) {
	if configPath == "" {
		defaultPath, err := config.DefaultConfigPath()
		if err != nil {
			return nil, fmt.Errorf("failed to locate default config path: %w", err)
		}
		configPath = defaultPath
	}

	if sink == nil {
		sink = &NoopEventSink{}
	}

	cs := &ConfigService{
		configPath:   configPath,
		eventSink:    sink,
		stopWatcher:  make(chan struct{}),
		recentHashes: make(map[[32]byte]time.Time),
	}

	// Try loading initial config; if missing, initialize defaults
	var cfg *config.Config
	expandedPath := config.ExpandPath(configPath)
	if data, readErr := os.ReadFile(expandedPath); readErr == nil {
		h := sha256.Sum256(data)
		cs.lastWrittenHash = h
		cs.recentHashes[h] = time.Now()
	}

	if _, statErr := os.Stat(expandedPath); os.IsNotExist(statErr) {
		cs.isFirstRun = true
		cfg = config.Default()
		cfg.Settings.OnboardingCompleted = false
	} else {
		loadedCfg, loadErr := config.Load(expandedPath)
		if loadErr != nil {
			return nil, NewAppError(ErrConfigInvalid, "Failed to load config", "Check YAML syntax in config.yaml", loadErr.Error())
		}
		cfg = loadedCfg
		cs.isFirstRun = false
	}
	cs.currentCfg = cfg

	// Start background watcher for external disk changes
	_ = cs.startFileWatcher()

	return cs, nil
}

// Path returns the absolute path to the active config file.
func (cs *ConfigService) Path() string {
	return cs.configPath
}

// Get returns the current configuration formatted as a JSON-friendly DTO.
func (cs *ConfigService) Get() ConfigDTO {
	cs.mu.RLock()
	defer cs.mu.RUnlock()
	return ConfigToDTO(cs.currentCfg)
}

// GetConfig returns the underlying internal *config.Config.
func (cs *ConfigService) GetConfig() *config.Config {
	cs.mu.RLock()
	defer cs.mu.RUnlock()
	return cs.currentCfg
}

// IsFirstRun reports whether the application is running without prior onboarding completion.
func (cs *ConfigService) IsFirstRun() bool {
	cs.mu.RLock()
	defer cs.mu.RUnlock()
	return cs.isFirstRun
}

// CompleteOnboarding applies the initial configuration choices from the onboarding wizard.
func (cs *ConfigService) CompleteOnboarding(req OnboardingRequestDTO) error {
	defaultCfg := config.Default()
	var watchEntries []WatchEntryDTO
	for _, folder := range req.WatchFolders {
		trimmed := strings.TrimSpace(folder)
		if trimmed != "" {
			watchEntries = append(watchEntries, WatchEntryDTO{
				Path:      trimmed,
				Recursive: false,
			})
		}
	}
	if len(watchEntries) == 0 {
		for _, w := range defaultCfg.Watch {
			watchEntries = append(watchEntries, WatchEntryDTO{
				Path:      w.Path,
				Recursive: w.Recursive,
			})
		}
	}

	var rules []RuleDTO
	if req.RuleSet == "recommended" || req.RuleSet == "" {
		for _, r := range defaultCfg.Rules {
			rules = append(rules, RuleDTO{
				Name:     r.Name,
				Disabled: r.Disabled,
				MoveTo:   r.MoveTo,
				Match: MatchDTO{
					Ext:       r.Match.Ext,
					NameGlob:  r.Match.NameGlob,
					NameRegex: r.Match.NameRegex,
					MinSize:   r.Match.MinSize,
					MaxSize:   r.Match.MaxSize,
					OlderThan: r.Match.OlderThan,
				},
			})
		}
	} else {
		// "empty" rule set starts with an empty list
		rules = []RuleDTO{}
	}

	closeToTray := true
	dto := ConfigDTO{
		Settings: SettingsDTO{
			StableAfterSeconds:   defaultCfg.Settings.StableAfterSeconds,
			Conflict:             defaultCfg.Settings.Conflict,
			FallbackDir:          "",
			IgnoreHidden:         true,
			IgnoreExt:            defaultCfg.Settings.IgnoreExt,
			IgnoreNames:          defaultCfg.Settings.IgnoreNames,
			CloseToTray:          &closeToTray,
			NotificationsEnabled: false,
			Autostart:            req.Autostart,
			OnboardingCompleted:  true,
		},
		Watch: watchEntries,
		Rules: rules,
	}

	if err := cs.Save(dto); err != nil {
		return err
	}

	cs.mu.Lock()
	cs.isFirstRun = false
	cs.mu.Unlock()
	return nil
}

// Validate checks whether the provided ConfigDTO satisfies all configuration rules.
func (cs *ConfigService) Validate(dto ConfigDTO) []ValidationErrorDTO {
	cfg, err := DTOToConfig(dto)
	if err != nil {
		return []ValidationErrorDTO{
			{Field: "config", Message: err.Error()},
		}
	}

	var dtos []ValidationErrorDTO
	if err := config.Validate(cfg); err != nil {
		if valErr, ok := err.(*config.ValidationError); ok {
			for _, msg := range valErr.Errors {
				dtos = append(dtos, ValidationErrorDTO{
					Field:   "config",
					Message: msg,
				})
			}
		} else {
			dtos = append(dtos, ValidationErrorDTO{
				Field:   "config",
				Message: err.Error(),
			})
		}
	}
	return dtos
}

// Save validates, creates a .bak backup of the existing config, writes the updated config
// preserving comments where possible, and emits a config:changed event.
func (cs *ConfigService) Save(dto ConfigDTO) error {
	cs.mu.Lock()
	defer cs.mu.Unlock()

	cfg, err := DTOToConfig(dto)
	if err != nil {
		return NewAppError(ErrConfigInvalid, "Invalid configuration format", "Verify field values", err.Error())
	}

	if err := config.Validate(cfg); err != nil {
		return NewAppError(ErrConfigInvalid, "Configuration validation failed", "Correct the highlighted fields", err.Error())
	}

	// 1. Create backup if current file exists on disk
	if _, err := os.Stat(cs.configPath); err == nil {
		bakPath := cs.configPath + ".bak"
		if err := copyFileAtomic(cs.configPath, bakPath); err != nil {
			return NewAppError(ErrConfigSaveFailed, "Failed to create config backup", "Ensure write permissions in config directory", err.Error())
		}
	}

	// 2. Serialize YAML with comment preservation best-effort via Node API
	data, err := serializeConfigWithComments(cs.configPath, cfg)
	if err != nil {
		return NewAppError(ErrConfigSaveFailed, "Failed to serialize YAML", "", err.Error())
	}

	// Ensure parent directory exists
	if err := os.MkdirAll(filepath.Dir(cs.configPath), 0755); err != nil {
		return NewAppError(ErrConfigSaveFailed, "Failed to create config directory", "", err.Error())
	}

	// 3. Write atomically to temporary file, then rename
	tempPath := cs.configPath + ".tmp"
	if err := os.WriteFile(tempPath, data, 0644); err != nil {
		return NewAppError(ErrConfigSaveFailed, "Failed to write temporary config file", "", err.Error())
	}

	if err := os.Rename(tempPath, cs.configPath); err != nil {
		_ = os.Remove(tempPath)
		return NewAppError(ErrConfigSaveFailed, "Failed to finalize config file", "", err.Error())
	}

	h := sha256.Sum256(data)
	cs.lastWrittenHash = h
	cs.recentHashes[h] = time.Now()
	now := time.Now()
	for k, t := range cs.recentHashes {
		if now.Sub(t) > 10*time.Second {
			delete(cs.recentHashes, k)
		}
	}
	cs.currentCfg = cfg
	internalChange := false
	cs.eventSink.Emit(EventConfigChanged, ConfigChangedPayload{Path: cs.configPath, External: &internalChange})

	return nil
}

// ResetToDefaults resets the in-memory and on-disk config to application default values.
func (cs *ConfigService) ResetToDefaults() error {
	defaultCfg := config.Default()
	defaultCfg.Settings.OnboardingCompleted = true
	return cs.Save(ConfigToDTO(defaultCfg))
}

// Close stops the external file watcher.
func (cs *ConfigService) Close() {
	if cs.fsWatcher != nil {
		close(cs.stopWatcher)
		_ = cs.fsWatcher.Close()
	}
}

// startFileWatcher sets up fsnotify monitoring on the config file.
func (cs *ConfigService) startFileWatcher() error {
	w, err := fsnotify.NewWatcher()
	if err != nil {
		return err
	}
	cs.fsWatcher = w

	dir := filepath.Dir(cs.configPath)
	if err := os.MkdirAll(dir, 0755); err == nil {
		_ = w.Add(dir)
	}

	go func() {
		for {
			select {
			case <-cs.stopWatcher:
				return
			case ev, ok := <-w.Events:
				if !ok {
					return
				}
				if filepath.Clean(ev.Name) == filepath.Clean(cs.configPath) {
					if ev.Has(fsnotify.Write) || ev.Has(fsnotify.Create) {
						cs.handleDiskFileChanged()
					}
				}
			case _, ok := <-w.Errors:
				if !ok {
					return
				}
			}
		}
	}()

	return nil
}

// handleDiskFileChanged reloads config from disk when modified externally.
func (cs *ConfigService) handleDiskFileChanged() {
	rawBytes, readErr := os.ReadFile(cs.configPath)
	if readErr != nil {
		return
	}

	// If this disk change was produced by our own Save(), skip reloading
	h := sha256.Sum256(rawBytes)
	cs.mu.RLock()
	_, isSelf := cs.recentHashes[h]
	cs.mu.RUnlock()

	if isSelf {
		return
	}

	newCfg, err := config.Load(cs.configPath)
	if err != nil {
		// Do NOT overwrite current valid config if disk contains invalid syntax
		cs.eventSink.Emit(EventAppError, NewAppError(
			ErrConfigInvalid,
			"External config modification contains invalid syntax",
			"Fix syntax errors in config.yaml; keeping last valid configuration active",
			err.Error(),
		))
		return
	}

	if err := config.Validate(newCfg); err != nil {
		cs.eventSink.Emit(EventAppError, NewAppError(
			ErrConfigInvalid,
			"External config modification failed validation",
			"Correct validation errors in config.yaml; keeping last valid configuration active",
			err.Error(),
		))
		return
	}

	cs.mu.Lock()
	cs.currentCfg = newCfg
	cs.lastWrittenHash = sha256.Sum256(rawBytes)
	cs.mu.Unlock()

	externalChange := true
	cs.eventSink.Emit(EventConfigChanged, ConfigChangedPayload{Path: cs.configPath, External: &externalChange})
}

// copyFileAtomic copies src to dst.
func copyFileAtomic(src, dst string) error {
	in, err := os.Open(src)
	if err != nil {
		return err
	}
	defer in.Close()

	out, err := os.Create(dst)
	if err != nil {
		return err
	}
	defer out.Close()

	if _, err := io.Copy(out, in); err != nil {
		return err
	}
	return out.Sync()
}

// serializeConfigWithComments attempts to preserve existing comments using yaml.Node.
func serializeConfigWithComments(existingPath string, newCfg *config.Config) ([]byte, error) {
	// If existing file exists, attempt to parse its AST
	if existingBytes, err := os.ReadFile(existingPath); err == nil && len(existingBytes) > 0 {
		var rootNode yaml.Node
		if err := yaml.Unmarshal(existingBytes, &rootNode); err == nil && len(rootNode.Content) > 0 {
			// Update root node content with new config while preserving node structures
			var newRootNode yaml.Node
			newBytes, mErr := yaml.Marshal(newCfg)
			if mErr == nil && yaml.Unmarshal(newBytes, &newRootNode) == nil {
				updateNodeMapping(rootNode.Content[0], newRootNode.Content[0])
				var buf bytes.Buffer
				enc := yaml.NewEncoder(&buf)
				enc.SetIndent(2)
				if encErr := enc.Encode(&rootNode); encErr == nil {
					_ = enc.Close()
					return buf.Bytes(), nil
				}
			}
		}
	}

	// Fallback to standard clean marshalling
	var buf bytes.Buffer
	enc := yaml.NewEncoder(&buf)
	enc.SetIndent(2)
	if err := enc.Encode(newCfg); err != nil {
		return nil, err
	}
	_ = enc.Close()
	return buf.Bytes(), nil
}

// updateNodeMapping updates target mapping node with values from source mapping node.
func updateNodeMapping(target, source *yaml.Node) {
	if target.Kind != yaml.MappingNode || source.Kind != yaml.MappingNode {
		*target = *source
		return
	}

	// Index target keys
	targetKeys := make(map[string]int)
	for i := 0; i < len(target.Content); i += 2 {
		targetKeys[target.Content[i].Value] = i
	}

	for i := 0; i < len(source.Content); i += 2 {
		key := source.Content[i].Value
		val := source.Content[i+1]

		if idx, exists := targetKeys[key]; exists {
			// Preserve existing comment on key
			source.Content[i].HeadComment = target.Content[idx].HeadComment
			source.Content[i].LineComment = target.Content[idx].LineComment
			source.Content[i].FootComment = target.Content[idx].FootComment
			target.Content[idx+1] = val
		} else {
			target.Content = append(target.Content, source.Content[i], val)
		}
	}
}

// ---- DTO Conversion Helpers ----

func ConfigToDTO(cfg *config.Config) ConfigDTO {
	if cfg == nil {
		return ConfigDTO{}
	}
	var watch []WatchEntryDTO
	for _, w := range cfg.Watch {
		watch = append(watch, WatchEntryDTO{
			Path:      w.Path,
			Recursive: w.Recursive,
		})
	}

	var rules []RuleDTO
	for _, r := range cfg.Rules {
		rules = append(rules, RuleDTO{
			Name:     r.Name,
			Disabled: r.Disabled,
			MoveTo:   r.MoveTo,
			Match: MatchDTO{
				Ext:       r.Match.Ext,
				NameGlob:  r.Match.NameGlob,
				NameRegex: r.Match.NameRegex,
				MinSize:   r.Match.MinSize,
				MaxSize:   r.Match.MaxSize,
				OlderThan: r.Match.OlderThan,
			},
		})
	}

	ignoreHidden := true
	if cfg.Settings.IgnoreHidden != nil {
		ignoreHidden = *cfg.Settings.IgnoreHidden
	}

	return ConfigDTO{
		Settings: SettingsDTO{
			StableAfterSeconds:   cfg.Settings.StableAfterSeconds,
			Conflict:             cfg.Settings.Conflict,
			FallbackDir:          cfg.Settings.FallbackDir,
			IgnoreHidden:         ignoreHidden,
			IgnoreExt:            cfg.Settings.IgnoreExt,
			IgnoreNames:          cfg.Settings.IgnoreNames,
			CloseToTray:          cfg.Settings.CloseToTray,
			NotificationsEnabled: cfg.Settings.NotificationsEnabled,
			Autostart:            cfg.Settings.Autostart,
			OnboardingCompleted:  cfg.Settings.OnboardingCompleted,
		},
		Watch: watch,
		Rules: rules,
	}
}

func DTOToConfig(dto ConfigDTO) (*config.Config, error) {
	watch := make([]config.WatchEntry, 0, len(dto.Watch))
	for _, w := range dto.Watch {
		watch = append(watch, config.WatchEntry{
			Path:      w.Path,
			Recursive: w.Recursive,
		})
	}

	rules := make([]config.RuleConfig, 0, len(dto.Rules))
	for _, r := range dto.Rules {
		rules = append(rules, config.RuleConfig{
			Name:     r.Name,
			Disabled: r.Disabled,
			MoveTo:   r.MoveTo,
			Match: config.MatchConfig{
				Ext:       r.Match.Ext,
				NameGlob:  r.Match.NameGlob,
				NameRegex: r.Match.NameRegex,
				MinSize:   r.Match.MinSize,
				MaxSize:   r.Match.MaxSize,
				OlderThan: r.Match.OlderThan,
			},
		})
	}

	ignoreHidden := dto.Settings.IgnoreHidden

	return &config.Config{
		Version: 1,
		Settings: config.Settings{
			StableAfterSeconds:   dto.Settings.StableAfterSeconds,
			Conflict:             dto.Settings.Conflict,
			FallbackDir:          dto.Settings.FallbackDir,
			IgnoreHidden:         &ignoreHidden,
			IgnoreExt:            dto.Settings.IgnoreExt,
			IgnoreNames:          dto.Settings.IgnoreNames,
			CloseToTray:          dto.Settings.CloseToTray,
			NotificationsEnabled: dto.Settings.NotificationsEnabled,
			Autostart:            dto.Settings.Autostart,
			OnboardingCompleted:  dto.Settings.OnboardingCompleted,
		},
		Watch: watch,
		Rules: rules,
	}, nil
}

// CheckFolderWarnings detects whether any rule destination sits inside a recursively monitored folder.
func CheckFolderWarnings(cfg ConfigDTO) []FolderWarningDTO {
	var warnings []FolderWarningDTO

	for _, w := range cfg.Watch {
		if !w.Recursive || strings.TrimSpace(w.Path) == "" {
			continue
		}
		wExpanded := filepath.Clean(config.ExpandPath(w.Path))

		for _, r := range cfg.Rules {
			if strings.TrimSpace(r.MoveTo) == "" {
				continue
			}
			destBase := r.MoveTo
			if idx := strings.Index(destBase, "{"); idx != -1 {
				destBase = destBase[:idx]
			}
			destBase = strings.TrimRight(destBase, `/\`)
			if destBase == "" {
				continue
			}
			destExpanded := filepath.Clean(config.ExpandPath(destBase))

			rel, err := filepath.Rel(wExpanded, destExpanded)
			if err == nil && !strings.HasPrefix(rel, "..") {
				warnings = append(warnings, FolderWarningDTO{
					FolderPath: w.Path,
					RuleName:   r.Name,
					MoveTo:     r.MoveTo,
					Message:    fmt.Sprintf("Rule %q destination (%s) is inside this recursive folder. Files moved here will be re-scanned unless excluded.", r.Name, r.MoveTo),
				})
			}
		}
	}

	return warnings
}

// GetFolderWarnings returns recursive folder warnings for the current configuration.
func (cs *ConfigService) GetFolderWarnings() []FolderWarningDTO {
	return CheckFolderWarnings(cs.Get())
}
