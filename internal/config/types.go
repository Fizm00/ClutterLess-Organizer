// SPDX-License-Identifier: AGPL-3.0-only

package config

// Config represents the top-level application configuration.
type Config struct {
	Version  int          `yaml:"version"`
	Settings Settings     `yaml:"settings"`
	Watch    []WatchEntry `yaml:"watch"`
	Rules    []RuleConfig `yaml:"rules"`
}

// Settings defines global organizer settings.
type Settings struct {
	StableAfterSeconds   int      `yaml:"stable_after_seconds"`
	IgnoreExt            []string `yaml:"ignore_ext"`
	IgnoreNames          []string `yaml:"ignore_names"`
	IgnoreHidden         *bool    `yaml:"ignore_hidden"`
	Conflict             string   `yaml:"conflict"`
	FallbackDir          string   `yaml:"fallback_dir"`
	CloseToTray          *bool    `yaml:"close_to_tray,omitempty"`
	NotificationsEnabled bool     `yaml:"notifications_enabled,omitempty"`
	Autostart            bool     `yaml:"autostart,omitempty"`
	OnboardingCompleted  bool     `yaml:"onboarding_completed,omitempty"`
}

// WatchEntry defines a monitored directory.
type WatchEntry struct {
	Path      string `yaml:"path"`
	Recursive bool   `yaml:"recursive"`
}

// RuleConfig defines a file organization rule in configuration.
type RuleConfig struct {
	Name     string      `yaml:"name"`
	Disabled bool        `yaml:"disabled,omitempty"`
	Match    MatchConfig `yaml:"match"`
	MoveTo   string      `yaml:"move_to"`
}

// MatchConfig defines matching criteria for a rule.
type MatchConfig struct {
	Ext       []string `yaml:"ext"`
	NameGlob  []string `yaml:"name_glob"`
	NameRegex string   `yaml:"name_regex"`
	MinSize   string   `yaml:"min_size"`
	MaxSize   string   `yaml:"max_size"`
	OlderThan string   `yaml:"older_than"`
}
