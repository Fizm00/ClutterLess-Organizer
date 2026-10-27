// SPDX-License-Identifier: AGPL-3.0-only

package cli

import (
	"bytes"
	"context"
	"fmt"
	"os"
	"path/filepath"
	"strings"
	"testing"
	"time"

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
	_ = runCmd.Flags().Set("history-file", "")
	_ = historyCmd.Flags().Set("limit", "10")
	_ = historyCmd.Flags().Set("batch", "")
	_ = historyCmd.Flags().Set("history-file", "")
	_ = undoCmd.Flags().Set("batch", "")
	_ = undoCmd.Flags().Set("dry-run", "false")
	_ = undoCmd.Flags().Set("history-file", "")
	_ = watchCmd.Flags().Set("dry-run", "false")
	_ = watchCmd.Flags().Set("log-file", "")
	_ = watchCmd.Flags().Set("initial-run", "false")
	_ = watchCmd.Flags().Set("history-file", "")
	_ = watchCmd.Flags().Set("dir", "")
	_ = folderAddCmd.Flags().Set("recursive", "false")

	err := rootCmd.Execute()
	return buf.String(), err
}

func executeCommandContext(ctx context.Context, args ...string) (string, error) {
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
	_ = runCmd.Flags().Set("history-file", "")
	_ = historyCmd.Flags().Set("limit", "10")
	_ = historyCmd.Flags().Set("batch", "")
	_ = historyCmd.Flags().Set("history-file", "")
	_ = undoCmd.Flags().Set("batch", "")
	_ = undoCmd.Flags().Set("dry-run", "false")
	_ = undoCmd.Flags().Set("history-file", "")
	_ = watchCmd.Flags().Set("dry-run", "false")
	_ = watchCmd.Flags().Set("log-file", "")
	_ = watchCmd.Flags().Set("initial-run", "false")
	_ = watchCmd.Flags().Set("history-file", "")
	_ = watchCmd.Flags().Set("dir", "")
	_ = folderAddCmd.Flags().Set("recursive", "false")

	err := rootCmd.ExecuteContext(ctx)
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

func TestHistoryAndUndoCommands(t *testing.T) {
	tempDir := t.TempDir()
	cfgPath := filepath.Join(tempDir, "config.yaml")
	histFile := filepath.Join(tempDir, "history.jsonl")

	if err := os.WriteFile(cfgPath, []byte(config.DefaultYAML()), 0600); err != nil {
		t.Fatalf("failed to write config: %v", err)
	}

	workDir := filepath.Join(tempDir, "work")
	_ = os.MkdirAll(workDir, 0755)

	docFile := filepath.Join(workDir, "report.pdf")
	_ = os.WriteFile(docFile, []byte("report pdf content"), 0600)

	// 1. Run real move
	runOut, err := executeCommand("run", "--dir", workDir, "--config", cfgPath, "--history-file", histFile)
	if err != nil {
		t.Fatalf("unexpected run error: %v, output: %s", err, runOut)
	}
	if !strings.Contains(runOut, "[MOVE]") {
		t.Fatalf("expected [MOVE] in output: %s", runOut)
	}

	// 2. Test history list
	histOut, err := executeCommand("history", "--history-file", histFile)
	if err != nil {
		t.Fatalf("unexpected history error: %v, output: %s", err, histOut)
	}
	if !strings.Contains(histOut, "Recent Batches") || !strings.Contains(histOut, "active") {
		t.Errorf("unexpected history output: %s", histOut)
	}

	// 3. Test undo --dry-run
	undoDryOut, err := executeCommand("undo", "--dry-run", "--config", cfgPath, "--history-file", histFile)
	if err != nil {
		t.Fatalf("unexpected undo dry-run error: %v, output: %s", err, undoDryOut)
	}
	if !strings.Contains(undoDryOut, "[DRY-RUN]") || !strings.Contains(undoDryOut, "restored 1") {
		t.Errorf("unexpected undo dry-run output: %s", undoDryOut)
	}

	// Verify file is still at dest
	if _, err := os.Stat(docFile); !os.IsNotExist(err) {
		t.Errorf("undo dry-run restored file prematurely!")
	}

	// 4. Test real undo
	undoOut, err := executeCommand("undo", "--config", cfgPath, "--history-file", histFile)
	if err != nil {
		t.Fatalf("unexpected undo error: %v, output: %s", err, undoOut)
	}
	if !strings.Contains(undoOut, "[RESTORE]") || !strings.Contains(undoOut, "restored 1") {
		t.Errorf("unexpected undo output: %s", undoOut)
	}

	// Verify file restored to workDir
	content, err := os.ReadFile(docFile)
	if err != nil || string(content) != "report pdf content" {
		t.Errorf("file not restored properly: %v", err)
	}

	// 5. Test double undo (should be clean no-op)
	undoOut2, err := executeCommand("undo", "--config", cfgPath, "--history-file", histFile)
	if err != nil {
		t.Fatalf("unexpected double undo error: %v, output: %s", err, undoOut2)
	}
	if !strings.Contains(undoOut2, "no active batches") && !strings.Contains(undoOut2, "already been completely undone") {
		t.Errorf("unexpected double undo output: %s", undoOut2)
	}
}

func TestWatchCommand(t *testing.T) {
	tempDir := t.TempDir()
	watchDir := filepath.Join(tempDir, "WatchFolder")
	_ = os.MkdirAll(watchDir, 0755)

	cfgPath := filepath.Join(tempDir, "config.yaml")
	histFile := filepath.Join(tempDir, "history.jsonl")
	logFile := filepath.Join(tempDir, "watch.log")

	// Custom config pointing to watchDir
	cfgContent := fmt.Sprintf(`version: 1
watch:
  - path: %q
    recursive: false
rules:
  - name: PDFs
    match:
      ext: [pdf]
    move_to: %q
`, watchDir, filepath.Join(tempDir, "Output"))

	if err := os.WriteFile(cfgPath, []byte(cfgContent), 0600); err != nil {
		t.Fatalf("failed to write config: %v", err)
	}

	// Create a pre-existing file in watchDir
	initialDoc := filepath.Join(watchDir, "initial.pdf")
	_ = os.WriteFile(initialDoc, []byte("pre-existing doc"), 0600)

	ctx, cancel := context.WithTimeout(context.Background(), 250*time.Millisecond)
	defer cancel()

	out, err := executeCommandContext(ctx, "watch", "--config", cfgPath, "--history-file", histFile, "--log-file", logFile, "--initial-run")
	if err != nil && err != context.DeadlineExceeded && err != context.Canceled {
		t.Fatalf("unexpected watch error: %v, output: %s", err, out)
	}

	if !strings.Contains(out, "Watching 1 configured directories") || !strings.Contains(out, "Watch stopped") {
		t.Errorf("unexpected watch command output: %s", out)
	}

	// Verify log file was written
	if _, err := os.Stat(logFile); err != nil {
		t.Errorf("log file was not created: %v", err)
	}
}

func TestFolderCommands(t *testing.T) {
	tempDir := t.TempDir()
	cfgPath := filepath.Join(tempDir, "config.yaml")

	_, err := executeCommand("init", "--path", cfgPath)
	if err != nil {
		t.Fatalf("failed to init config: %v", err)
	}

	// 1. List folders (should only have Downloads initially)
	out, err := executeCommand("--config", cfgPath, "folder", "list")
	if err != nil {
		t.Fatalf("folder list failed: %v, out: %s", err, out)
	}
	if !strings.Contains(out, "Downloads") {
		t.Errorf("expected list to show Downloads, got: %s", out)
	}

	// 2. Add Desktop
	out, err = executeCommand("--config", cfgPath, "folder", "add", "~/Desktop")
	if err != nil {
		t.Fatalf("folder add failed: %v, out: %s", err, out)
	}
	if !strings.Contains(out, "Successfully added") {
		t.Errorf("expected success message, got: %s", out)
	}

	// 3. Verify in list
	out, err = executeCommand("--config", cfgPath, "folder")
	if err != nil {
		t.Fatalf("folder default list failed: %v", err)
	}
	if !strings.Contains(out, "Desktop") {
		t.Errorf("expected Desktop to be listed, got: %s", out)
	}

	// 4. Remove Desktop
	out, err = executeCommand("--config", cfgPath, "folder", "remove", "~/Desktop")
	if err != nil {
		t.Fatalf("folder remove failed: %v, out: %s", err, out)
	}
	if !strings.Contains(out, "Successfully removed") {
		t.Errorf("expected success message, got: %s", out)
	}

	// 5. Verify no longer in list
	out, err = executeCommand("--config", cfgPath, "folder", "list")
	if err != nil {
		t.Fatalf("folder list failed: %v", err)
	}
	if strings.Contains(out, "Desktop") {
		t.Errorf("expected Desktop to be removed, got: %s", out)
	}
}

func TestConfigPathCommand(t *testing.T) {
	tempDir := t.TempDir()
	cfgPath := filepath.Join(tempDir, "config.yaml")
	out, err := executeCommand("--config", cfgPath, "config", "path")
	if err != nil {
		t.Fatalf("config path failed: %v", err)
	}
	if !strings.Contains(out, cfgPath) {
		t.Errorf("expected output to contain %q, got %q", cfgPath, out)
	}
}

