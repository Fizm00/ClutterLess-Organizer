// SPDX-License-Identifier: AGPL-3.0-only

package cli

import (
	"bytes"
	"os"
	"path/filepath"
	"strings"
	"testing"

	"github.com/Fizm00/organizer/internal/config"
)

func executeCommand(args ...string) (string, error) {
	buf := new(bytes.Buffer)
	rootCmd.SetOut(buf)
	rootCmd.SetErr(buf)
	rootCmd.SetArgs(args)

	err := rootCmd.Execute()
	return buf.String(), err
}

func TestInitCommand(t *testing.T) {
	tempDir := t.TempDir()
	cfgPath := filepath.Join(tempDir, "config.yaml")

	// 1. Initial creation
	out, err := executeCommand("init", "--path", cfgPath)
	if err != nil {
		t.Fatalf("unexpected init error: %v, output: %s", err, out)
	}
	if !strings.Contains(out, "Configuration initialized at:") {
		t.Errorf("unexpected output: %s", out)
	}

	// Verify file was written
	if _, err := os.Stat(cfgPath); err != nil {
		t.Fatalf("config file was not created: %v", err)
	}

	// 2. Overwrite without force should fail
	_, err = executeCommand("init", "--path", cfgPath)
	if err == nil {
		t.Fatal("expected error when overwriting without --force, got nil")
	}

	// 3. Overwrite with force should succeed
	out, err = executeCommand("init", "--path", cfgPath, "--force")
	if err != nil {
		t.Fatalf("unexpected error with --force: %v, output: %s", err, out)
	}
}

func TestConfigValidateCommand(t *testing.T) {
	tempDir := t.TempDir()
	cfgPath := filepath.Join(tempDir, "config.yaml")

	// Write valid config
	if err := os.WriteFile(cfgPath, []byte(config.DefaultYAML()), 0600); err != nil {
		t.Fatalf("failed to write config: %v", err)
	}

	out, err := executeCommand("config", "validate", "--config", cfgPath)
	if err != nil {
		t.Fatalf("unexpected validate error: %v, output: %s", err, out)
	}
	if !strings.Contains(out, "Configuration is valid:") {
		t.Errorf("unexpected output: %s", out)
	}
}

func TestRulesCommands(t *testing.T) {
	tempDir := t.TempDir()
	cfgPath := filepath.Join(tempDir, "config.yaml")

	if err := os.WriteFile(cfgPath, []byte(config.DefaultYAML()), 0600); err != nil {
		t.Fatalf("failed to write config: %v", err)
	}

	t.Run("rules list", func(t *testing.T) {
		out, err := executeCommand("rules", "list", "--config", cfgPath)
		if err != nil {
			t.Fatalf("unexpected rules list error: %v, output: %s", err, out)
		}
		if !strings.Contains(out, "Images") || !strings.Contains(out, "Documents") {
			t.Errorf("missing expected rules in output: %s", out)
		}
	})

	t.Run("rules test matching file", func(t *testing.T) {
		testFile := filepath.Join(tempDir, "photo.jpg")
		if err := os.WriteFile(testFile, []byte("fake image"), 0600); err != nil {
			t.Fatalf("failed to create test file: %v", err)
		}

		out, err := executeCommand("rules", "test", testFile, "--config", cfgPath)
		if err != nil {
			t.Fatalf("unexpected rules test error: %v, output: %s", err, out)
		}
		if !strings.Contains(out, `Matched: Rule "Images"`) {
			t.Errorf("expected matched Images rule, got: %s", out)
		}
	})

	t.Run("rules test ignored file", func(t *testing.T) {
		testFile := filepath.Join(tempDir, "download.crdownload")
		if err := os.WriteFile(testFile, []byte("fake partial"), 0600); err != nil {
			t.Fatalf("failed to create test file: %v", err)
		}

		out, err := executeCommand("rules", "test", testFile, "--config", cfgPath)
		if err != nil {
			t.Fatalf("unexpected rules test error: %v, output: %s", err, out)
		}
		if !strings.Contains(out, "Status: Skipped") {
			t.Errorf("expected Status: Skipped, got: %s", out)
		}
	})
}
