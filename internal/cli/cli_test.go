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

	// Reset persistent and command flags
	_ = rootCmd.PersistentFlags().Set("config", "")
	_ = rootCmd.PersistentFlags().Set("verbose", "false")
	_ = rootCmd.PersistentFlags().Set("no-color", "false")
	_ = initCmd.Flags().Set("force", "false")
	_ = initCmd.Flags().Set("path", "")
	_ = runCmd.Flags().Set("dry-run", "false")
	_ = runCmd.Flags().Set("dir", "")
	_ = runCmd.Flags().Set("yes", "false")

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

func TestRunCommand(t *testing.T) {
	tempDir := t.TempDir()
	cfgPath := filepath.Join(tempDir, "config.yaml")

	if err := os.WriteFile(cfgPath, []byte(config.DefaultYAML()), 0600); err != nil {
		t.Fatalf("failed to write config: %v", err)
	}

	workDir := filepath.Join(tempDir, "work")
	_ = os.MkdirAll(workDir, 0755)

	testImg := filepath.Join(workDir, "picture.png")
	_ = os.WriteFile(testImg, []byte("image bytes"), 0600)

	testPart := filepath.Join(workDir, "partfile.part")
	_ = os.WriteFile(testPart, []byte("part bytes"), 0600)

	t.Run("dry-run does not move file", func(t *testing.T) {
		out, err := executeCommand("run", "--dry-run", "--dir", workDir, "--config", cfgPath)
		if err != nil {
			t.Fatalf("unexpected dry-run error: %v, output: %s", err, out)
		}
		if !strings.Contains(out, "[DRY-RUN]") || !strings.Contains(out, "Summary: moved 1, skipped 1, unmatched 0, failed 0") {
			t.Errorf("unexpected dry-run output:\n%s", out)
		}

		// Ensure picture.png is still at original location
		if _, err := os.Stat(testImg); err != nil {
			t.Errorf("dry-run moved the file unexpectedly!")
		}
	})

	t.Run("real run moves file", func(t *testing.T) {
		out, err := executeCommand("run", "--dir", workDir, "--config", cfgPath)
		if err != nil {
			t.Fatalf("unexpected real run error: %v, output: %s", err, out)
		}
		if !strings.Contains(out, "[MOVE]") || !strings.Contains(out, "Summary: moved 1, skipped 1, unmatched 0, failed 0") {
			t.Errorf("unexpected run output:\n%s", out)
		}

		// Ensure picture.png was moved
		if _, err := os.Stat(testImg); !os.IsNotExist(err) {
			t.Errorf("real run did not move the file away!")
		}
	})
}

