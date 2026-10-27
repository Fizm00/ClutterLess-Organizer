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

func TestOrganizer_RunAndUndo_RestoresOriginalState(t *testing.T) {
	tempDir := t.TempDir()
	histFile := filepath.Join(tempDir, "history.jsonl")
	destDir := filepath.Join(tempDir, "Output")

	// Create test files
	f1 := filepath.Join(tempDir, "contract.pdf")
	f2 := filepath.Join(tempDir, "avatar.png")
	_ = os.WriteFile(f1, []byte("contract text"), 0600)
	_ = os.WriteFile(f2, []byte("avatar png"), 0600)

	cfg := config.Default()
	cfg.Rules[0].MoveTo = filepath.Join(destDir, "Images")
	cfg.Rules[1].MoveTo = filepath.Join(destDir, "Docs")

	histStorage, err := history.NewStorage(histFile)
	if err != nil {
		t.Fatalf("failed to create history: %v", err)
	}

	organizer := NewOrganizer(cfg)
	organizer.History = histStorage

	// Take snapshot BEFORE run
	beforeSnapshot := takeDirSnapshot(t, tempDir)

	// 1. Execute Run
	runRes, err := organizer.Run(context.Background(), RunOptions{
		Dir:    tempDir,
		DryRun: false,
	})
	if err != nil {
		t.Fatalf("run failed: %v", err)
	}
	if runRes.Stats.Moved != 2 {
		t.Fatalf("expected 2 moves, got %d", runRes.Stats.Moved)
	}

	// 2. Execute Undo
	undoRes, err := organizer.Undo(context.Background(), "", false)
	if err != nil {
		t.Fatalf("undo failed: %v", err)
	}
	if undoRes.Restored != 2 {
		t.Fatalf("expected 2 restored files, got %d", undoRes.Restored)
	}

	// Remove empty Output folder if present, or take snapshot of original files
	// Note: Verify original files are back
	c1, err := os.ReadFile(f1)
	if err != nil || string(c1) != "contract text" {
		t.Errorf("f1 was not restored properly: %v", err)
	}
	c2, err := os.ReadFile(f2)
	if err != nil || string(c2) != "avatar png" {
		t.Errorf("f2 was not restored properly: %v", err)
	}

	// Verify history marked as undone
	activeBatch, _, _ := histStorage.LastActiveBatch()
	if activeBatch != "" {
		t.Errorf("expected no active batches after complete undo, got %s", activeBatch)
	}
	_ = beforeSnapshot
}

func TestOrganizer_Undo_SourceOccupied(t *testing.T) {
	tempDir := t.TempDir()
	histFile := filepath.Join(tempDir, "history.jsonl")
	destDir := filepath.Join(tempDir, "Output")

	srcFile := filepath.Join(tempDir, "doc.pdf")
	_ = os.WriteFile(srcFile, []byte("original doc v1"), 0600)

	cfg := config.Default()
	cfg.Rules[1].MoveTo = destDir

	histStorage, _ := history.NewStorage(histFile)
	organizer := NewOrganizer(cfg)
	organizer.History = histStorage

	// Move file
	_, err := organizer.Run(context.Background(), RunOptions{Dir: tempDir, DryRun: false})
	if err != nil {
		t.Fatalf("run failed: %v", err)
	}

	// Now place a new file at original source
	_ = os.WriteFile(srcFile, []byte("new doc occupying source"), 0600)

	// Execute Undo
	undoRes, err := organizer.Undo(context.Background(), "", false)
	if err != nil {
		t.Fatalf("undo failed: %v", err)
	}
	if undoRes.Restored != 1 {
		t.Fatalf("expected 1 restored file, got %d", undoRes.Restored)
	}

	// Verify occupant was NOT overwritten
	occContent, _ := os.ReadFile(srcFile)
	if string(occContent) != "new doc occupying source" {
		t.Errorf("CRITICAL BUG: Source occupant was overwritten!")
	}

	// Restored file should be renamed to doc (1).pdf
	renamedSrc := filepath.Join(tempDir, "doc (1).pdf")
	content, err := os.ReadFile(renamedSrc)
	if err != nil {
		t.Fatalf("expected restored file at %q: %v", renamedSrc, err)
	}
	if string(content) != "original doc v1" {
		t.Errorf("expected original doc content, got %q", string(content))
	}
}

func TestOrganizer_Undo_DestMissing(t *testing.T) {
	tempDir := t.TempDir()
	histFile := filepath.Join(tempDir, "history.jsonl")
	destDir := filepath.Join(tempDir, "Output")

	srcFile := filepath.Join(tempDir, "temp.pdf")
	_ = os.WriteFile(srcFile, []byte("temporary content"), 0600)

	cfg := config.Default()
	cfg.Rules[1].MoveTo = destDir

	histStorage, _ := history.NewStorage(histFile)
	organizer := NewOrganizer(cfg)
	organizer.History = histStorage

	// Move file
	_, err := organizer.Run(context.Background(), RunOptions{Dir: tempDir, DryRun: false})
	if err != nil {
		t.Fatalf("run failed: %v", err)
	}

	// Delete destination file
	movedDest := filepath.Join(destDir, "temp.pdf")
	_ = os.Remove(movedDest)

	// Execute Undo
	undoRes, err := organizer.Undo(context.Background(), "", false)
	if err != nil {
		t.Fatalf("undo should not crash when dest is missing: %v", err)
	}

	if undoRes.Skipped != 1 {
		t.Errorf("expected 1 skipped due to missing dest, got %d", undoRes.Skipped)
	}
	if undoRes.Restored != 0 {
		t.Errorf("expected 0 restored, got %d", undoRes.Restored)
	}
}

func TestOrganizer_Undo_DoubleUndo(t *testing.T) {
	tempDir := t.TempDir()
	histFile := filepath.Join(tempDir, "history.jsonl")
	destDir := filepath.Join(tempDir, "Output")

	srcFile := filepath.Join(tempDir, "sample.pdf")
	_ = os.WriteFile(srcFile, []byte("data"), 0600)

	cfg := config.Default()
	cfg.Rules[1].MoveTo = destDir

	histStorage, _ := history.NewStorage(histFile)
	organizer := NewOrganizer(cfg)
	organizer.History = histStorage

	// Run
	runRes, _ := organizer.Run(context.Background(), RunOptions{Dir: tempDir, DryRun: false})

	// Undo 1: should restore
	res1, err := organizer.Undo(context.Background(), runRes.BatchID, false)
	if err != nil || res1.Restored != 1 {
		t.Fatalf("first undo failed: %v, %+v", err, res1)
	}

	// Undo 2: should be clean no-op
	res2, err := organizer.Undo(context.Background(), runRes.BatchID, false)
	if err != nil {
		t.Fatalf("second undo threw error: %v", err)
	}
	if res2.Restored != 0 {
		t.Errorf("second undo unexpectedly restored %d files", res2.Restored)
	}
	if res2.Message == "" {
		t.Errorf("expected message indicating batch already undone")
	}
}

func TestOrganizer_Undo_DryRun_ZeroSideEffects(t *testing.T) {
	tempDir := t.TempDir()
	histFile := filepath.Join(tempDir, "history.jsonl")
	destDir := filepath.Join(tempDir, "Output")

	srcFile := filepath.Join(tempDir, "data.pdf")
	_ = os.WriteFile(srcFile, []byte("data content"), 0600)

	cfg := config.Default()
	cfg.Rules[1].MoveTo = destDir

	histStorage, _ := history.NewStorage(histFile)
	organizer := NewOrganizer(cfg)
	organizer.History = histStorage

	// Move file
	runRes, _ := organizer.Run(context.Background(), RunOptions{Dir: tempDir, DryRun: false})

	// Snapshot before dry-run undo
	before := takeDirSnapshot(t, tempDir)

	// Execute Undo Dry-Run
	undoRes, err := organizer.Undo(context.Background(), runRes.BatchID, true)
	if err != nil {
		t.Fatalf("unexpected dry-run undo error: %v", err)
	}
	if undoRes.Restored != 1 {
		t.Errorf("expected 1 previewed restore, got %d", undoRes.Restored)
	}

	// Snapshot after dry-run undo
	after := takeDirSnapshot(t, tempDir)
	if !snapshotsEqual(before, after) {
		t.Fatalf("CRITICAL BUG: Undo dry-run modified filesystem!")
	}

	// History status must still be StatusMoved
	recs, _ := histStorage.Batch(runRes.BatchID)
	if len(recs) != 1 || recs[0].Status != history.StatusMoved {
		t.Errorf("history record was altered during dry run!")
	}
}

func TestOrganizer_RunDryRun_DoesNotWriteHistory(t *testing.T) {
	tempDir := t.TempDir()
	histFile := filepath.Join(tempDir, "history.jsonl")

	srcFile := filepath.Join(tempDir, "data.pdf")
	_ = os.WriteFile(srcFile, []byte("data content"), 0600)

	cfg := config.Default()
	histStorage, _ := history.NewStorage(histFile)
	organizer := NewOrganizer(cfg)
	organizer.History = histStorage

	// Run with DryRun: true
	_, err := organizer.Run(context.Background(), RunOptions{
		Dir:    tempDir,
		DryRun: true,
		Now:    time.Now(),
	})
	if err != nil {
		t.Fatalf("dry-run failed: %v", err)
	}

	// History file must not exist
	if _, err := os.Stat(histFile); !os.IsNotExist(err) {
		t.Errorf("Dry-run created or wrote to history file!")
	}

	all, _ := histStorage.ReadAll()
	if len(all) != 0 {
		t.Errorf("history storage should be empty, got %d records", len(all))
	}
}
