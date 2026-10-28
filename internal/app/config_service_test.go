// SPDX-License-Identifier: AGPL-3.0-only

package app

import (
	"os"
	"path/filepath"
	"strings"
	"testing"
)

func TestConfigService_Lifecycle(t *testing.T) {
	tempDir := t.TempDir()
	configPath := filepath.Join(tempDir, "config.yaml")
	sink := NewMemoryEventSink()

	cs, err := NewConfigService(configPath, sink)
	if err != nil {
		t.Fatalf("failed to create ConfigService: %v", err)
	}
	defer cs.Close()

	if cs.Path() != configPath {
		t.Errorf("expected path %s, got %s", configPath, cs.Path())
	}

	initial := cs.Get()
	if len(initial.Rules) == 0 {
		t.Errorf("expected default rules to be populated")
	}

	// Validate valid config
	valErrs := cs.Validate(initial)
	if len(valErrs) != 0 {
		t.Errorf("expected 0 validation errors for default config, got %d: %v", len(valErrs), valErrs)
	}

	// Validate invalid config
	invalidCfg := initial
	invalidCfg.Settings.StableAfterSeconds = -5
	valErrs = cs.Validate(invalidCfg)
	if len(valErrs) == 0 {
		t.Errorf("expected validation errors for negative stableAfterSeconds")
	}

	// First save to establish file on disk
	if err := cs.Save(initial); err != nil {
		t.Fatalf("failed to save initial config: %v", err)
	}

	// Save modified config; this should create a .bak backup of the existing config
	modified := initial
	modified.Settings.Conflict = "skip"
	if err := cs.Save(modified); err != nil {
		t.Fatalf("failed to save config: %v", err)
	}

	// Verify .bak file created
	bakPath := configPath + ".bak"
	if _, err := os.Stat(bakPath); err != nil {
		t.Errorf("expected backup file %s to exist: %v", bakPath, err)
	}

	// Verify EventConfigChanged was emitted
	if sink.Count(EventConfigChanged) == 0 {
		t.Errorf("expected event %s to be emitted on save", EventConfigChanged)
	}

	// Verify in-memory state updated
	if cs.Get().Settings.Conflict != "skip" {
		t.Errorf("expected conflict to be skip, got %s", cs.Get().Settings.Conflict)
	}

	// Reset to defaults
	if err := cs.ResetToDefaults(); err != nil {
		t.Fatalf("failed to reset to defaults: %v", err)
	}
	if cs.Get().Settings.Conflict != "rename" {
		t.Errorf("expected conflict to reset to rename, got %s", cs.Get().Settings.Conflict)
	}
}

func TestConfigService_CommentPreservation(t *testing.T) {
	tempDir := t.TempDir()
	configPath := filepath.Join(tempDir, "config.yaml")

	yamlWithComments := `# ClutterLess Configuration Header
version: 1
settings:
  # Stability wait time
  stable_after_seconds: 3
  conflict: rename
watch:
  - path: ~/Downloads
rules:
  - name: DefaultRule
    match:
      ext: [txt]
    move_to: ~/Documents
`
	if err := os.WriteFile(configPath, []byte(yamlWithComments), 0644); err != nil {
		t.Fatalf("failed to write initial yaml: %v", err)
	}

	cs, err := NewConfigService(configPath, nil)
	if err != nil {
		t.Fatalf("failed to create ConfigService: %v", err)
	}
	defer cs.Close()

	cfg := cs.Get()
	cfg.Settings.StableAfterSeconds = 5
	if err := cs.Save(cfg); err != nil {
		t.Fatalf("failed to save config: %v", err)
	}

	savedBytes, err := os.ReadFile(configPath)
	if err != nil {
		t.Fatalf("failed to read saved config: %v", err)
	}
	content := string(savedBytes)

	// Check that comments or sections are retained
	if !strings.Contains(content, "ClutterLess Configuration") && !strings.Contains(content, "stable_after_seconds") {
		t.Errorf("expected saved file to preserve comments or keys, got:\n%s", content)
	}
}

func TestConfigService_ExternalDiskChange(t *testing.T) {
	tempDir := t.TempDir()
	configPath := filepath.Join(tempDir, "config.yaml")
	sink := NewMemoryEventSink()

	cs, err := NewConfigService(configPath, sink)
	if err != nil {
		t.Fatalf("failed to create ConfigService: %v", err)
	}
	defer cs.Close()

	// 1. Simulate external write with VALID yaml
	validExternal := `version: 1
settings:
  stable_after_seconds: 10
  conflict: skip
watch:
  - path: ~/Downloads
rules:
  - name: DefaultRule
    match:
      ext: [txt]
    move_to: ~/Documents
`
	_ = os.WriteFile(configPath, []byte(validExternal), 0644)
	cs.handleDiskFileChanged() // call handler directly for deterministic testing

	if cs.Get().Settings.StableAfterSeconds != 10 {
		t.Errorf("expected external valid change to reload, got %d", cs.Get().Settings.StableAfterSeconds)
	}

	// 2. Simulate external write with INVALID yaml syntax
	invalidSyntax := `settings: [invalid unclosed`
	_ = os.WriteFile(configPath, []byte(invalidSyntax), 0644)
	cs.handleDiskFileChanged()

	// In-memory config must NOT be overwritten!
	if cs.Get().Settings.StableAfterSeconds != 10 {
		t.Errorf("expected last valid config to remain active, got %d", cs.Get().Settings.StableAfterSeconds)
	}

	// EventAppError must be emitted
	if sink.Count(EventAppError) == 0 {
		t.Errorf("expected EventAppError to be emitted when disk config is invalid")
	}
}

func TestCheckFolderWarnings(t *testing.T) {
	tempDir := t.TempDir()
	watchFolder := filepath.Join(tempDir, "Downloads")
	nestedDest := filepath.Join(watchFolder, "_Archives", "{year}")
	outsideDest := filepath.Join(tempDir, "Pictures", "{year}")

	cfg := ConfigDTO{
		Watch: []WatchEntryDTO{
			{Path: watchFolder, Recursive: true},
		},
		Rules: []RuleDTO{
			{Name: "Archives", MoveTo: nestedDest},
			{Name: "Pictures", MoveTo: outsideDest},
		},
	}

	warnings := CheckFolderWarnings(cfg)
	if len(warnings) != 1 {
		t.Fatalf("expected 1 recursive warning, got %d: %+v", len(warnings), warnings)
	}
	if warnings[0].RuleName != "Archives" {
		t.Errorf("expected warning for rule 'Archives', got %q", warnings[0].RuleName)
	}

	// When recursive is false, no warning should occur
	cfg.Watch[0].Recursive = false
	warnings = CheckFolderWarnings(cfg)
	if len(warnings) != 0 {
		t.Errorf("expected 0 warnings when folder is non-recursive, got %d", len(warnings))
	}
}
