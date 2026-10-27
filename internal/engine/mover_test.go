// SPDX-License-Identifier: AGPL-3.0-only

package engine

import (
	"context"
	"errors"
	"os"
	"path/filepath"
	"strings"
	"testing"
	"time"

	"github.com/Fizm00/organizer/internal/platform"
)

func TestMover_ConflictRename_SingleAndMultiple(t *testing.T) {
	tempDir := t.TempDir()
	srcDir := filepath.Join(tempDir, "src")
	destDir := filepath.Join(tempDir, "dest")
	_ = os.MkdirAll(srcDir, 0755)
	_ = os.MkdirAll(destDir, 0755)

	// Pre-create existing files in dest: report.pdf and report (1).pdf
	_ = os.WriteFile(filepath.Join(destDir, "report.pdf"), []byte("v0"), 0600)
	_ = os.WriteFile(filepath.Join(destDir, "report (1).pdf"), []byte("v1"), 0600)

	// Create source file
	srcFile := filepath.Join(srcDir, "report.pdf")
	_ = os.WriteFile(srcFile, []byte("v2"), 0600)

	mover := NewMover("rename")
	pm := PlannedMove{
		Source:   srcFile,
		Dest:     filepath.Join(destDir, "report.pdf"),
		RuleName: "Docs",
		Skipped:  false,
	}

	res, err := mover.Move(context.Background(), pm)
	if err != nil {
		t.Fatalf("unexpected move error: %v", err)
	}

	expectedDest := filepath.Join(destDir, "report (2).pdf")
	if res.Dest != expectedDest {
		t.Errorf("expected destination %q, got %q", expectedDest, res.Dest)
	}

	// Verify file content in report (2).pdf
	content, err := os.ReadFile(expectedDest)
	if err != nil {
		t.Fatalf("failed to read moved file: %v", err)
	}
	if string(content) != "v2" {
		t.Errorf("expected content 'v2', got %q", string(content))
	}

	// Verify source was removed
	if _, err := os.Stat(srcFile); !os.IsNotExist(err) {
		t.Errorf("source file should have been moved, but still exists")
	}
}

func TestMover_ConflictSkip(t *testing.T) {
	tempDir := t.TempDir()
	srcFile := filepath.Join(tempDir, "sample.txt")
	destFile := filepath.Join(tempDir, "dest.txt")

	_ = os.WriteFile(srcFile, []byte("source data"), 0600)
	_ = os.WriteFile(destFile, []byte("original dest data"), 0600)

	mover := NewMover("skip")
	pm := PlannedMove{
		Source:  srcFile,
		Dest:    destFile,
		Skipped: false,
	}

	res, err := mover.Move(context.Background(), pm)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	if !res.Skipped {
		t.Errorf("expected result to be skipped, got: %+v", res)
	}

	// Destination should be unchanged
	content, _ := os.ReadFile(destFile)
	if string(content) != "original dest data" {
		t.Errorf("destination file was overwritten!")
	}

	// Source should remain intact
	if _, err := os.Stat(srcFile); err != nil {
		t.Errorf("source file was deleted or moved!")
	}
}

func TestMover_CrossDevice_Success(t *testing.T) {
	tempDir := t.TempDir()
	srcFile := filepath.Join(tempDir, "src.dat")
	destFile := filepath.Join(tempDir, "dest", "final.dat")

	origContent := "cross device data to transfer"
	_ = os.WriteFile(srcFile, []byte(origContent), 0600)

	mover := NewMover("rename")
	// Inject simulated cross-device link error on first rename attempt
	realRename := os.Rename
	firstAttempt := true
	mover.renameFn = func(oldpath, newpath string) error {
		if firstAttempt && oldpath == srcFile {
			firstAttempt = false
			return &os.LinkError{Op: "rename", Old: oldpath, New: newpath, Err: platform.ERROR_NOT_SAME_DEVICE}
		}
		return realRename(oldpath, newpath)
	}

	res, err := mover.Move(context.Background(), PlannedMove{Source: srcFile, Dest: destFile})
	if err != nil {
		t.Fatalf("unexpected move error: %v", err)
	}

	if res.Failed || res.Skipped {
		t.Fatalf("expected successful move, got: %+v", res)
	}

	// Verify destination content
	content, err := os.ReadFile(destFile)
	if err != nil {
		t.Fatalf("failed to read destination: %v", err)
	}
	if string(content) != origContent {
		t.Errorf("expected content %q, got %q", origContent, string(content))
	}

	// Source must be deleted after verified copy
	if _, err := os.Stat(srcFile); !os.IsNotExist(err) {
		t.Errorf("source file should have been deleted after verified copy-move")
	}
}

func TestMover_CrossDevice_SizeVerificationFailed_PreservesSource(t *testing.T) {
	tempDir := t.TempDir()
	srcFile := filepath.Join(tempDir, "important.doc")
	destFile := filepath.Join(tempDir, "dest", "important.doc")

	origContent := "vital user document"
	_ = os.WriteFile(srcFile, []byte(origContent), 0600)

	mover := NewMover("rename")
	// Simulate cross-device link error
	mover.renameFn = func(oldpath, newpath string) error {
		return &os.LinkError{Op: "rename", Old: oldpath, New: newpath, Err: platform.ERROR_NOT_SAME_DEVICE}
	}
	// Simulate corrupted/partial copy (writes 0 bytes)
	mover.copyFn = func(src, dst string) error {
		return os.WriteFile(dst, []byte(""), 0600)
	}

	res, _ := mover.Move(context.Background(), PlannedMove{Source: srcFile, Dest: destFile})

	if !res.Failed {
		t.Errorf("expected move to fail due to size mismatch, got %+v", res)
	}

	// CRITICAL SAFETY CHECK: Source MUST NOT be deleted
	content, err := os.ReadFile(srcFile)
	if err != nil {
		t.Fatalf("CRITICAL BUG: Source file was deleted or lost: %v", err)
	}
	if string(content) != origContent {
		t.Errorf("source content altered!")
	}
}

func TestMover_LockedFileRetry_ThenSkip(t *testing.T) {
	tempDir := t.TempDir()
	srcFile := filepath.Join(tempDir, "locked.pdf")
	destFile := filepath.Join(tempDir, "dest.pdf")
	_ = os.WriteFile(srcFile, []byte("locked content"), 0600)

	mover := NewMover("rename")
	// Rapid backoffs for unit testing
	mover.Backoffs = []time.Duration{1 * time.Millisecond, 2 * time.Millisecond}

	// Mock rename always returning sharing violation
	attempts := 0
	mover.renameFn = func(oldpath, newpath string) error {
		attempts++
		return &os.PathError{Op: "rename", Path: oldpath, Err: platform.ERROR_SHARING_VIOLATION}
	}

	res, err := mover.Move(context.Background(), PlannedMove{Source: srcFile, Dest: destFile})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	if !res.Skipped {
		t.Errorf("expected locked file to be skipped, got: %+v", res)
	}
	if !strings.Contains(res.Reason, "locked") {
		t.Errorf("expected locked reason, got: %q", res.Reason)
	}
	if attempts != 3 { // 1 initial + 2 retries
		t.Errorf("expected 3 attempts, got %d", attempts)
	}

	// Source file must remain intact
	if _, err := os.Stat(srcFile); err != nil {
		t.Errorf("source file was unexpectedly deleted")
	}
}

func TestMover_ContextCancellation(t *testing.T) {
	tempDir := t.TempDir()
	srcFile := filepath.Join(tempDir, "file.txt")
	destFile := filepath.Join(tempDir, "dest.txt")
	_ = os.WriteFile(srcFile, []byte("data"), 0600)

	mover := NewMover("rename")

	ctx, cancel := context.WithCancel(context.Background())
	cancel() // cancel immediately

	res, err := mover.Move(ctx, PlannedMove{Source: srcFile, Dest: destFile})
	if !errors.Is(err, context.Canceled) {
		t.Errorf("expected context.Canceled, got: %v", err)
	}
	if !res.Failed {
		t.Errorf("expected failed move, got %+v", res)
	}

	// Source remains untouched
	if _, err := os.Stat(srcFile); err != nil {
		t.Errorf("source file was altered: %v", err)
	}
}
