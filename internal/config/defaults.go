// SPDX-License-Identifier: AGPL-3.0-only

package config

import (
	"os"
	"path/filepath"
)

const (
	// DefaultStableAfterSeconds is the default debounce/stability duration in seconds.
	DefaultStableAfterSeconds = 3
	// DefaultConflictStrategy is the default file conflict resolution strategy ("rename").
	DefaultConflictStrategy = "rename"
)

// DefaultIgnoreExt lists temporary and in-progress download extensions ignored by default.
var DefaultIgnoreExt = []string{"crdownload", "part", "tmp", "download", "partial", "opdownload"}

// DefaultIgnoreNames lists system and desktop metadata files ignored by default.
var DefaultIgnoreNames = []string{"desktop.ini", "thumbs.db", ".DS_Store"}

// Default returns a fresh Config struct populated with standard defaults.
func Default() *Config {
	defaultIgnoreHidden := true
	return &Config{
		Version: 1,
		Settings: Settings{
			StableAfterSeconds: DefaultStableAfterSeconds,
			IgnoreExt:          append([]string(nil), DefaultIgnoreExt...),
			IgnoreNames:        append([]string(nil), DefaultIgnoreNames...),
			IgnoreHidden:       &defaultIgnoreHidden,
			Conflict:           DefaultConflictStrategy,
			FallbackDir:        "",
		},
		Watch: []WatchEntry{
			{Path: "~/Downloads", Recursive: false},
			{Path: "~/Desktop", Recursive: false},
		},
		Rules: []RuleConfig{
			{
				Name: "Images",
				Match: MatchConfig{
					Ext: []string{"jpg", "jpeg", "png", "gif", "webp", "bmp", "svg"},
				},
				MoveTo: "~/Pictures/Sorted/{year}",
			},
			{
				Name: "Documents",
				Match: MatchConfig{
					Ext: []string{"pdf", "docx", "doc", "xlsx", "xls", "pptx", "txt", "md"},
				},
				MoveTo: "~/Documents/Inbox/{ext}",
			},
			{
				Name: "Invoices",
				Match: MatchConfig{
					NameRegex: "(?i)(invoice|faktur|receipt|kwitansi)",
				},
				MoveTo: "~/Documents/Finance/{year}-{month}",
			},
			{
				Name: "Installers",
				Match: MatchConfig{
					Ext: []string{"exe", "msi", "dmg", "deb", "pkg"},
				},
				MoveTo: "~/Downloads/_Installers",
			},
			{
				Name: "Archives",
				Match: MatchConfig{
					Ext:     []string{"zip", "rar", "7z", "tar", "gz"},
					MinSize: "1MB",
				},
				MoveTo: "~/Downloads/_Archives",
			},
			{
				Name: "Old stuff",
				Match: MatchConfig{
					OlderThan: "90d",
				},
				MoveTo: "~/Downloads/_Old",
			},
		},
	}
}

// DefaultYAML returns the default configuration formatted as commented YAML.
func DefaultYAML() string {
	return `# ClutterLess Organizer Configuration
# Documentation: https://github.com/Fizm00/ClutterLess-Organizer

version: 1

settings:
  stable_after_seconds: 3        # file size/mtime must be unchanged this long before moving (watch mode)
  ignore_ext: [crdownload, part, tmp, download, partial, opdownload]
  ignore_names: ["desktop.ini", "thumbs.db", ".DS_Store"]
  ignore_hidden: true
  conflict: rename               # only "rename" and "skip" are allowed. Never overwrite.
  fallback_dir: ""               # if non-empty, unmatched files go here; empty = leave in place

watch:
  - path: ~/Downloads
    recursive: false
  - path: ~/Desktop
    recursive: false

rules:
  - name: Images
    match:
      ext: [jpg, jpeg, png, gif, webp, bmp, svg]
    move_to: ~/Pictures/Sorted/{year}

  - name: Documents
    match:
      ext: [pdf, docx, doc, xlsx, xls, pptx, txt, md]
    move_to: ~/Documents/Inbox/{ext}

  - name: Invoices
    match:
      name_regex: "(?i)(invoice|faktur|receipt|kwitansi)"
    move_to: ~/Documents/Finance/{year}-{month}

  - name: Installers
    match:
      ext: [exe, msi, dmg, deb, pkg]
    move_to: ~/Downloads/_Installers

  - name: Archives
    match:
      ext: [zip, rar, 7z, tar, gz]
      min_size: 1MB
    move_to: ~/Downloads/_Archives

  - name: Old stuff
    match:
      older_than: 90d
    move_to: ~/Downloads/_Old
`
}

// DefaultConfigPath returns the standard configuration file path on the current OS:
// os.UserConfigDir()/organizer/config.yaml.
func DefaultConfigPath() (string, error) {
	configDir, err := os.UserConfigDir()
	if err != nil {
		return "", err
	}
	return filepath.Join(configDir, "organizer", "config.yaml"), nil
}

// ApplyDefaults applies default settings if fields were omitted in user configuration.
func ApplyDefaults(cfg *Config) {
	if cfg.Settings.StableAfterSeconds <= 0 {
		cfg.Settings.StableAfterSeconds = DefaultStableAfterSeconds
	}
	if len(cfg.Settings.IgnoreExt) == 0 {
		cfg.Settings.IgnoreExt = append([]string(nil), DefaultIgnoreExt...)
	}
	if len(cfg.Settings.IgnoreNames) == 0 {
		cfg.Settings.IgnoreNames = append([]string(nil), DefaultIgnoreNames...)
	}
	if cfg.Settings.IgnoreHidden == nil {
		defaultIgnoreHidden := true
		cfg.Settings.IgnoreHidden = &defaultIgnoreHidden
	}
	if cfg.Settings.Conflict == "" {
		cfg.Settings.Conflict = DefaultConflictStrategy
	}
}
