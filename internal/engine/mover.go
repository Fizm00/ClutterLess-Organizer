// SPDX-License-Identifier: AGPL-3.0-only

package engine

import (
	"context"
	"fmt"
	"io"
	"log/slog"
	"os"
	"path/filepath"
	"strings"
	"time"

	"github.com/Fizm00/organizer/internal/platform"
)

// MoveResult contains the outcome of a PlannedMove execution.
type MoveResult struct {
	Source   string
	Dest     string
	Size     int64
	RuleName string
	Skipped  bool
	Failed   bool
	Reason   string
	Error    error
}

// Mover handles safe file movement, conflict resolution, cross-drive fallback, and locked-file retries.
type Mover struct {
	ConflictStrategy string          // "rename" or "skip"
	Backoffs         []time.Duration // retry backoff intervals

	// Injectable functions for testing and platform abstraction
	renameFn        func(oldpath, newpath string) error
	copyFn          func(src, dst string) error
	removeFn        func(path string) error
	isCrossDeviceFn func(err error) bool
	isFileLockedFn  func(err error) bool
}

// NewMover creates a new Mover initialized with standard OS functions and settings.
func NewMover(conflictStrategy string) *Mover {
	if conflictStrategy == "" {
		conflictStrategy = "rename"
	}
	return &Mover{
		ConflictStrategy: conflictStrategy,
		Backoffs: []time.Duration{
			500 * time.Millisecond,
			1 * time.Second,
			2 * time.Second,
		},
		renameFn:        os.Rename,
		copyFn:          defaultCopyFile,
		removeFn:        os.Remove,
		isCrossDeviceFn: platform.IsCrossDeviceError,
		isFileLockedFn:  platform.IsFileLockedError,
	}
}

// defaultCopyFile copies src to dst, calls fsync, and closes both files.
func defaultCopyFile(src, dst string) error {
	in, err := os.Open(src)
	if err != nil {
		return err
	}
	defer in.Close()

	out, err := os.Create(dst)
	if err != nil {
		return err
	}

	_, copyErr := io.Copy(out, in)
	syncErr := out.Sync()
	closeErr := out.Close()

	if copyErr != nil {
		return copyErr
	}
	if syncErr != nil {
		return syncErr
	}
	return closeErr
}

// ResolveConflictDest determines the final destination path if a conflict exists.
// On conflict, it appends " (1)", " (2)", etc., before the file extension.
func ResolveConflictDest(destPath string, existsFn func(string) bool) string {
	if !existsFn(destPath) {
		return destPath
	}
	dir := filepath.Dir(destPath)
	name := filepath.Base(destPath)
	ext := filepath.Ext(name)
	base := strings.TrimSuffix(name, ext)

	counter := 1
	for {
		candidate := filepath.Join(dir, fmt.Sprintf("%s (%d)%s", base, counter, ext))
		if !existsFn(candidate) {
			return candidate
		}
		counter++
	}
}

// Move safely moves a file according to PlannedMove specifications.
func (m *Mover) Move(ctx context.Context, pm PlannedMove) (MoveResult, error) {
	if err := ctx.Err(); err != nil {
		return MoveResult{Source: pm.Source, Failed: true, Reason: err.Error(), Error: err}, err
	}

	// 1. If already skipped by planner (ignored filter or unmatched without fallback)
	if pm.Skipped {
		return MoveResult{
			Source:   pm.Source,
			Dest:     pm.Dest,
			RuleName: pm.RuleName,
			Skipped:  true,
			Reason:   pm.Reason,
		}, nil
	}

	// 2. Stat source file to check existence and size
	srcInfo, err := os.Stat(pm.Source)
	if err != nil {
		return MoveResult{
			Source:   pm.Source,
			Dest:     pm.Dest,
			RuleName: pm.RuleName,
			Failed:   true,
			Reason:   fmt.Sprintf("source file inaccessible: %v", err),
			Error:    err,
		}, nil
	}
	srcSize := srcInfo.Size()

	// 3. Resolve destination path and handle conflicts
	finalDest := pm.Dest
	destExists := func(p string) bool {
		_, err := os.Stat(p)
		return err == nil
	}

	if destExists(finalDest) {
		if m.ConflictStrategy == "skip" {
			return MoveResult{
				Source:   pm.Source,
				Dest:     finalDest,
				Size:     srcSize,
				RuleName: pm.RuleName,
				Skipped:  true,
				Reason:   "destination exists, skipped by conflict strategy",
			}, nil
		}
		finalDest = ResolveConflictDest(finalDest, destExists)
	}

	// 4. Ensure destination directory exists
	destDir := filepath.Dir(finalDest)
	if err := os.MkdirAll(destDir, 0755); err != nil {
		return MoveResult{
			Source:   pm.Source,
			Dest:     finalDest,
			Size:     srcSize,
			RuleName: pm.RuleName,
			Failed:   true,
			Reason:   fmt.Sprintf("failed to create destination directory: %v", err),
			Error:    err,
		}, nil
	}

	// 5. Attempt move with retries for locked files
	backoffs := m.Backoffs
	maxAttempts := len(backoffs) + 1

	for attempt := 0; attempt < maxAttempts; attempt++ {
		if err := ctx.Err(); err != nil {
			return MoveResult{
				Source:   pm.Source,
				Dest:     finalDest,
				Size:     srcSize,
				RuleName: pm.RuleName,
				Failed:   true,
				Reason:   err.Error(),
				Error:    err,
			}, err
		}

		// Try direct atomic rename
		renameErr := m.renameFn(pm.Source, finalDest)
		if renameErr == nil {
			return MoveResult{
				Source:   pm.Source,
				Dest:     finalDest,
				Size:     srcSize,
				RuleName: pm.RuleName,
				Skipped:  false,
				Reason:   "moved",
			}, nil
		}

		// Check if cross-device link error
		if m.isCrossDeviceFn(renameErr) {
			slog.Debug("cross-device move detected, falling back to copy-then-delete", "source", pm.Source, "dest", finalDest)
			crossErr := m.copyThenDelete(ctx, pm.Source, finalDest, srcSize)
			if crossErr != nil {
				return MoveResult{
					Source:   pm.Source,
					Dest:     finalDest,
					Size:     srcSize,
					RuleName: pm.RuleName,
					Failed:   true,
					Reason:   fmt.Sprintf("cross-device move failed: %v", crossErr),
					Error:    crossErr,
				}, nil
			}
			return MoveResult{
				Source:   pm.Source,
				Dest:     finalDest,
				Size:     srcSize,
				RuleName: pm.RuleName,
				Skipped:  false,
				Reason:   "moved (cross-device)",
			}, nil
		}

		// Check if file is locked / in use by another process
		if m.isFileLockedFn(renameErr) {
			slog.Warn("file is locked by another process", "source", pm.Source, "attempt", attempt+1)
			if attempt < len(backoffs) {
				dur := backoffs[attempt]
				select {
				case <-time.After(dur):
					continue
				case <-ctx.Done():
					return MoveResult{
						Source:   pm.Source,
						Dest:     finalDest,
						Size:     srcSize,
						RuleName: pm.RuleName,
						Failed:   true,
						Reason:   ctx.Err().Error(),
						Error:    ctx.Err(),
					}, ctx.Err()
				}
			}
			// Exhausted retries
			return MoveResult{
				Source:   pm.Source,
				Dest:     finalDest,
				Size:     srcSize,
				RuleName: pm.RuleName,
				Skipped:  true,
				Reason:   "file locked by another process, skipped after retries",
			}, nil
		}

		// Other non-recoverable error
		return MoveResult{
			Source:   pm.Source,
			Dest:     finalDest,
			Size:     srcSize,
			RuleName: pm.RuleName,
			Failed:   true,
			Reason:   fmt.Sprintf("rename failed: %v", renameErr),
			Error:    renameErr,
		}, nil
	}

	return MoveResult{
		Source:   pm.Source,
		Dest:     finalDest,
		Size:     srcSize,
		RuleName: pm.RuleName,
		Failed:   true,
		Reason:   "unexpected mover loop exit",
	}, nil
}

// copyThenDelete performs a verified cross-device move:
// 1. Copy to temp file in destination directory
// 2. Fsync and verify file size matches source exactly
// 3. Rename temp file to final destination
// 4. Remove source file only after verification succeeds
// If verification or copying fails, the temp file is cleaned up and source is untouched.
func (m *Mover) copyThenDelete(ctx context.Context, src, dest string, expectedSize int64) error {
	destDir := filepath.Dir(dest)
	destName := filepath.Base(dest)
	tempDest := filepath.Join(destDir, fmt.Sprintf(".tmp_%d_%s", time.Now().UnixNano(), destName))

	// Ensure cleanup of temp file if copy or verification fails
	defer func() {
		if _, err := os.Stat(tempDest); err == nil {
			_ = m.removeFn(tempDest)
		}
	}()

	// Copy to temp destination
	if err := m.copyFn(src, tempDest); err != nil {
		return fmt.Errorf("copy failed: %w", err)
	}

	// Verify temp file size
	tempInfo, err := os.Stat(tempDest)
	if err != nil {
		return fmt.Errorf("failed to stat temp destination file: %w", err)
	}

	if tempInfo.Size() != expectedSize {
		return fmt.Errorf("size mismatch after copy: expected %d bytes, got %d bytes", expectedSize, tempInfo.Size())
	}

	// Rename temp file to final destination
	if err := m.renameFn(tempDest, dest); err != nil {
		return fmt.Errorf("failed to finalize destination file: %w", err)
	}

	// Delete source file (verified safe)
	if err := m.removeFn(src); err != nil {
		return fmt.Errorf("failed to remove source file after successful copy: %w", err)
	}

	return nil
}
