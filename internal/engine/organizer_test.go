// SPDX-License-Identifier: AGPL-3.0-only

package engine

import (
	"context"
	"os"
	"path/filepath"
	"testing"
	"time"

	"github.com/Fizm00/organizer/internal/config"
	"github.com/Fizm00/organizer/internal/history"
)

// takeDirSnapshot records file paths, sizes, and directory structures.
func takeDirSnapshot(t *testing.T, dir string) map[string]int64 {
	t.Helper()
	snapshot := make(map[string]int64)
	err := filepath.Walk(dir, func(path string, info os.FileInfo, err error) error {
		if err != nil {
			return err
		}
		rel, _ := filepath.Rel(dir, path)
		if info.IsDir() {
			snapshot[rel+"/"] = -1
		} else {
			snapshot[rel] = info.Size()
		}
		return nil
	})
	if err != nil {
		t.Fatalf("failed to take dir snapshot: %v", err)
	}
	return snapshot
}

func snapshotsEqual(s1, s2 map[string]int64) bool {
	if len(s1) != len(s2) {
		return false
	}
	for k, v1 := range s1 {
		if v2, ok := s2[k]; !ok || v1 != v2 {
			return false
		}
	}
	return true
}

func TestOrganizer_DryRun_ZeroSideEffects(t *testing.T) {
	tempDir := t.TempDir()

	// Populate test directory with files
	f1 := filepath.Join(tempDir, "document.pdf")
	f2 := filepath.Join(tempDir, "photo.jpg")
	_ = os.WriteFile(f1, []byte("pdf data"), 0600)
	_ = os.WriteFile(f2, []byte("jpg data"), 0600)

	cfg := config.Default()
	// Change rules destination to non-existing subfolders in tempDir
	destDir := filepath.Join(tempDir, "Sorted")
	setRuleMoveTo(cfg, "Images", filepath.Join(destDir, "Images"))
	setRuleMoveTo(cfg, "Documents", filepath.Join(destDir, "Docs"))

	organizer := NewOrganizer(cfg)
	organizer.History, _ = history.NewStorage(filepath.Join(tempDir, "history.jsonl"))

	// Snapshot before
	before := takeDirSnapshot(t, tempDir)

	// Execute Dry-Run
	res, err := organizer.Run(context.Background(), RunOptions{
		Dir:    tempDir,
		DryRun: true,
		Now:    time.Now(),
	})
	if err != nil {
		t.Fatalf("unexpected dry-run error: %v", err)
	}

	if res.Stats.Moved != 2 {
		t.Errorf("expected 2 planned moves, got %d", res.Stats.Moved)
	}

	// Snapshot after
	after := takeDirSnapshot(t, tempDir)

	// CRITICAL TEST: Directory structure and files must be 100% identical
	if !snapshotsEqual(before, after) {
		t.Fatalf("CRITICAL BUG: Dry-run modified the filesystem!\nBefore: %+v\nAfter: %+v", before, after)
	}

	// Confirm destination directory was NOT created
	if _, err := os.Stat(destDir); !os.IsNotExist(err) {
		t.Errorf("Dry-run created destination directory!")
	}
}

func TestOrganizer_RealRun_MovesFiles(t *testing.T) {
	tempDir := t.TempDir()
	destDir := filepath.Join(tempDir, "Output")

	f1 := filepath.Join(tempDir, "sheet.xlsx")
	f2 := filepath.Join(tempDir, "temp.crdownload")
	_ = os.WriteFile(f1, []byte("sheet data"), 0600)
	_ = os.WriteFile(f2, []byte("partial data"), 0600)

	cfg := config.Default()
	setRuleMoveTo(cfg, "Documents", filepath.Join(destDir, "Docs")) // Documents rule

	organizer := NewOrganizer(cfg)
	organizer.History, _ = history.NewStorage(filepath.Join(tempDir, "history.jsonl"))

	res, err := organizer.Run(context.Background(), RunOptions{
		Dir:    tempDir,
		DryRun: false,
	})
	if err != nil {
		t.Fatalf("unexpected real run error: %v", err)
	}

	if res.Stats.Moved != 1 {
		t.Errorf("expected 1 moved file, got %d", res.Stats.Moved)
	}
	if res.Stats.Skipped != 1 {
		t.Errorf("expected 1 skipped file, got %d", res.Stats.Skipped)
	}

	// f1 must have moved to destDir/Docs/sheet.xlsx
	expectedTarget := filepath.Join(destDir, "Docs", "sheet.xlsx")
	if _, err := os.Stat(expectedTarget); err != nil {
		t.Errorf("expected file at %q: %v", expectedTarget, err)
	}
	if _, err := os.Stat(f1); !os.IsNotExist(err) {
		t.Errorf("source file should have been moved away")
	}

	// f2 (crdownload) must remain in place
	if _, err := os.Stat(f2); err != nil {
		t.Errorf("ignored file should remain in place: %v", err)
	}
}

func TestOrganizer_FallbackDir(t *testing.T) {
	tempDir := t.TempDir()
	fallbackDir := filepath.Join(tempDir, "Fallback")

	unknownFile := filepath.Join(tempDir, "unknown.xyz")
	_ = os.WriteFile(unknownFile, []byte("random data"), 0600)

	cfg := config.Default()
	cfg.Settings.FallbackDir = fallbackDir

	organizer := NewOrganizer(cfg)
	organizer.History, _ = history.NewStorage(filepath.Join(tempDir, "history.jsonl"))

	res, err := organizer.Run(context.Background(), RunOptions{
		Dir:    tempDir,
		DryRun: false,
	})
	if err != nil {
		t.Fatalf("unexpected run error: %v", err)
	}

	if res.Stats.Moved != 1 {
		t.Errorf("expected 1 file moved to fallback, got %d", res.Stats.Moved)
	}

	expectedDest := filepath.Join(fallbackDir, "unknown.xyz")
	if _, err := os.Stat(expectedDest); err != nil {
		t.Errorf("file was not moved to fallback dir: %v", err)
	}
}

func TestOrganizer_RecursiveScan_ExcludesDestDir(t *testing.T) {
	tempDir := t.TempDir()
	destDir := filepath.Join(tempDir, "Organized")

	// Create root file
	rootDoc := filepath.Join(tempDir, "root.pdf")
	_ = os.WriteFile(rootDoc, []byte("root pdf"), 0600)

	// Pre-create destination folder with a file inside it
	_ = os.MkdirAll(destDir, 0755)
	destDoc := filepath.Join(destDir, "already_sorted.pdf")
	_ = os.WriteFile(destDoc, []byte("already sorted"), 0600)

	cfg := &config.Config{
		Version: 1,
		Watch: []config.WatchEntry{
			{Path: tempDir, Recursive: true},
		},
		Rules: []config.RuleConfig{
			{
				Name: "PDFs",
				Match: config.MatchConfig{
					Ext: []string{"pdf"},
				},
				MoveTo: destDir,
			},
		},
	}
	config.ApplyDefaults(cfg)

	organizer := NewOrganizer(cfg)
	organizer.History, _ = history.NewStorage(filepath.Join(tempDir, "history.jsonl"))

	res, err := organizer.Run(context.Background(), RunOptions{
		DryRun: false,
	})
	if err != nil {
		t.Fatalf("unexpected recursive run error: %v", err)
	}

	// Only rootDoc should be moved! destDoc inside destDir must be excluded from scanning
	if res.Stats.Moved != 1 {
		t.Errorf("expected 1 moved file, got %d", res.Stats.Moved)
	}

	// destDoc should remain completely untouched
	if _, err := os.Stat(destDoc); err != nil {
		t.Errorf("already_sorted.pdf was unexpectedly touched: %v", err)
	}
}

func setRuleMoveTo(cfg *config.Config, name, moveTo string) {
	for i := range cfg.Rules {
		if cfg.Rules[i].Name == name {
			cfg.Rules[i].MoveTo = moveTo
			return
		}
	}
}
