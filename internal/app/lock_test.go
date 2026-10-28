// SPDX-License-Identifier: AGPL-3.0-only

package app

import (
	"encoding/json"
	"os"
	"path/filepath"
	"testing"
	"time"

	"github.com/Fizm00/organizer/internal/platform"
)

func TestWatcherLock_AcquireAndRelease(t *testing.T) {
	tempDir := t.TempDir()

	lock, err := AcquireWatcherLock(tempDir)
	if err != nil {
		t.Fatalf("failed to acquire initial lock: %v", err)
	}

	if _, err := os.Stat(lock.Path()); os.IsNotExist(err) {
		t.Errorf("expected lock file %s to exist", lock.Path())
	}

	// Release lock
	if err := lock.Release(); err != nil {
		t.Fatalf("failed to release lock: %v", err)
	}

	if _, err := os.Stat(lock.Path()); !os.IsNotExist(err) {
		t.Errorf("expected lock file %s to be removed after release", lock.Path())
	}

	// Double release should be safe
	if err := lock.Release(); err != nil {
		t.Errorf("double release returned error: %v", err)
	}
}

func TestWatcherLock_ActiveProcessConflict(t *testing.T) {
	tempDir := t.TempDir()

	lock1, err := AcquireWatcherLock(tempDir)
	if err != nil {
		t.Fatalf("failed to acquire lock1: %v", err)
	}
	defer lock1.Release()

	// Simulate an active process with a different PID by writing lock file
	activePID := os.Getpid() // current PID is alive
	lockPath := filepath.Join(tempDir, "watcher.lock")
	content := platform.LockContent{
		PID:       activePID,
		StartTime: time.Now().UTC().Format(time.RFC3339),
	}
	data, _ := json.Marshal(content)
	_ = os.WriteFile(lockPath, data, 0644)

	// In another mock scenario, if PID is current PID it won't conflict with itself,
	// but let's test if PID is non-existent vs alive:
	// A live process with different PID (e.g. parent process PID or explorer PID)
	parentPID := os.Getppid()
	if parentPID > 0 {
		content.PID = parentPID
		data, _ = json.Marshal(content)
		_ = os.WriteFile(lockPath, data, 0644)

		_, err = AcquireWatcherLock(tempDir)
		if err == nil {
			t.Errorf("expected error when lock held by active PID %d, got nil", parentPID)
		}
		if appErr, ok := err.(*AppError); !ok || appErr.Code != ErrWatcherAlreadyRunning {
			t.Errorf("expected AppError with code %s, got %v", ErrWatcherAlreadyRunning, err)
		}
	}
}

func TestWatcherLock_StaleLockReplaced(t *testing.T) {
	tempDir := t.TempDir()
	lockPath := filepath.Join(tempDir, "watcher.lock")

	// Write a lock file with a dead PID (unlikely PID 99999999)
	deadPID := 99999999
	content := platform.LockContent{
		PID:       deadPID,
		StartTime: time.Now().Add(-1 * time.Hour).UTC().Format(time.RFC3339),
	}
	data, _ := json.Marshal(content)
	_ = os.WriteFile(lockPath, data, 0644)

	// Acquire lock should detect dead PID and replace it
	lock, err := AcquireWatcherLock(tempDir)
	if err != nil {
		t.Fatalf("expected stale lock to be replaced, got error: %v", err)
	}
	defer lock.Release()

	// Verify lock now contains current PID
	readData, err := os.ReadFile(lockPath)
	if err != nil {
		t.Fatalf("failed to read lock file: %v", err)
	}
	var newContent platform.LockContent
	if err := json.Unmarshal(readData, &newContent); err != nil {
		t.Fatalf("failed to parse new lock content: %v", err)
	}
	if newContent.PID != os.Getpid() {
		t.Errorf("expected PID %d in replaced lock, got %d", os.Getpid(), newContent.PID)
	}
}
