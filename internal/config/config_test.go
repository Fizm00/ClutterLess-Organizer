// SPDX-License-Identifier: AGPL-3.0-only

package config

import (
	"os"
	"path/filepath"
	"testing"
	"time"
)

func TestParseSize_Valid(t *testing.T) {
	tests := []struct {
		input    string
		expected int64
	}{
		{"500B", 500},
		{"1024B", 1024},
		{"500KB", 500 * 1024},
		{"1K", 1024},
		{"1MB", 1024 * 1024},
		{"1.5MB", int64(1.5 * 1024 * 1024)},
		{"2GB", 2 * 1024 * 1024 * 1024},
		{"1TB", 1024 * 1024 * 1024 * 1024},
		{" 100 kb ", 100 * 1024},
	}

	for _, tc := range tests {
		tc := tc
		t.Run(tc.input, func(t *testing.T) {
			actual, err := ParseSize(tc.input)
			if err != nil {
				t.Fatalf("unexpected error for %q: %v", tc.input, err)
			}
			if actual != tc.expected {
				t.Errorf("for %q expected %d, got %d", tc.input, tc.expected, actual)
			}
		})
	}
}

func TestParseSize_Invalid(t *testing.T) {
	invalids := []string{
		"",
		"   ",
		"-10MB",
		"abc",
		"100XYZ",
		"1.2.3MB",
	}

	for _, input := range invalids {
		input := input
		t.Run(input, func(t *testing.T) {
			_, err := ParseSize(input)
			if err == nil {
				t.Errorf("expected error for %q, got nil", input)
			}
		})
	}
}

func TestParseDuration_Valid(t *testing.T) {
	tests := []struct {
		input    string
		expected time.Duration
	}{
		{"10s", 10 * time.Second},
		{"45m", 45 * time.Minute},
		{"12h", 12 * time.Hour},
		{"30d", 30 * 24 * time.Hour},
		{"2w", 2 * 7 * 24 * time.Hour},
		{" 1.5d ", 36 * time.Hour},
	}

	for _, tc := range tests {
		tc := tc
		t.Run(tc.input, func(t *testing.T) {
			actual, err := ParseDuration(tc.input)
			if err != nil {
				t.Fatalf("unexpected error for %q: %v", tc.input, err)
			}
			if actual != tc.expected {
				t.Errorf("for %q expected %v, got %v", tc.input, tc.expected, actual)
			}
		})
	}
}

func TestParseDuration_Invalid(t *testing.T) {
	invalids := []string{
		"",
		"   ",
		"-5d",
		"foo",
		"100xyz",
		"10", // missing unit
	}

	for _, input := range invalids {
		input := input
		t.Run(input, func(t *testing.T) {
			_, err := ParseDuration(input)
			if err == nil {
				t.Errorf("expected error for %q, got nil", input)
			}
		})
	}
}

func TestDefaultConfig_IsValid(t *testing.T) {
	cfg := Default()
	if err := Validate(cfg); err != nil {
		t.Fatalf("default config failed validation: %v", err)
	}
}

func TestValidate_CatchesErrors(t *testing.T) {
	cfg := Default()
	// Inject multiple errors
	cfg.Version = 2 // error 1
	cfg.Rules = append(cfg.Rules, RuleConfig{
		Name: "Images", // error 2: duplicate name
		Match: MatchConfig{
			NameRegex: "[invalid", // error 3: broken regex
			MinSize:   "10MB",
			MaxSize:   "1MB", // error 4: min > max
		},
		MoveTo: "~/Pictures/{unknown_var}", // error 5: unknown template var
	})
	cfg.Rules = append(cfg.Rules, RuleConfig{
		Name:   "EmptyMatch",
		Match:  MatchConfig{}, // error 6: empty match
		MoveTo: "",            // error 7: empty move_to
	})

	err := Validate(cfg)
	if err == nil {
		t.Fatal("expected validation errors, got nil")
	}

	valErr, ok := err.(*ValidationError)
	if !ok {
		t.Fatalf("expected *ValidationError, got %T", err)
	}

	if len(valErr.Errors) < 6 {
		t.Errorf("expected at least 6 errors, got %d:\n%s", len(valErr.Errors), valErr.Error())
	}
}

func TestExpandPath(t *testing.T) {
	home, err := os.UserHomeDir()
	if err != nil {
		t.Skip("skipping home dir test: no home directory found")
	}

	t.Run("tilde expansion", func(t *testing.T) {
		expanded := ExpandPath("~/Downloads")
		expected := filepath.Join(home, "Downloads")
		if expanded != expected {
			t.Errorf("expected %q, got %q", expected, expanded)
		}
	})

	t.Run("env var expansion", func(t *testing.T) {
		os.Setenv("TEST_ORGANIZER_VAR", "my_custom_folder")
		defer os.Unsetenv("TEST_ORGANIZER_VAR")

		expandedPosix := ExpandPath("$TEST_ORGANIZER_VAR/sub")
		if !filepath.IsAbs(expandedPosix) && expandedPosix != filepath.Join("my_custom_folder", "sub") {
			t.Errorf("unexpected expansion: %q", expandedPosix)
		}

		expandedWin := ExpandPath("%TEST_ORGANIZER_VAR%/sub")
		if !filepath.IsAbs(expandedWin) && expandedWin != filepath.Join("my_custom_folder", "sub") {
			t.Errorf("unexpected win env expansion: %q", expandedWin)
		}
	})
}

func TestLoad_ReadsValidFile(t *testing.T) {
	tempDir := t.TempDir()
	configPath := filepath.Join(tempDir, "config.yaml")

	if err := os.WriteFile(configPath, []byte(DefaultYAML()), 0600); err != nil {
		t.Fatalf("failed to write config file: %v", err)
	}

	cfg, err := Load(configPath)
	if err != nil {
		t.Fatalf("failed to load valid config: %v", err)
	}

	if cfg.Version != 1 {
		t.Errorf("expected version 1, got %d", cfg.Version)
	}
	if len(cfg.Rules) != 6 {
		t.Errorf("expected 6 rules, got %d", len(cfg.Rules))
	}
}
