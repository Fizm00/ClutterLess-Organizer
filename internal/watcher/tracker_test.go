// SPDX-License-Identifier: AGPL-3.0-only

package watcher

import (
	"os"
	"path/filepath"
	"sync"
	"testing"
	"time"

	"github.com/Fizm00/organizer/internal/config"
)

// fakeTimer allows manual triggering and inspection for deterministic testing.
type fakeTimer struct {
	mu       sync.Mutex
	callback func()
	stopped  bool
}

func (ft *fakeTimer) Stop() bool {
	ft.mu.Lock()
	defer ft.mu.Unlock()
	wasActive := !ft.stopped
	ft.stopped = true
	return wasActive
}

func (ft *fakeTimer) Reset(d time.Duration) bool {
	ft.mu.Lock()
	defer ft.mu.Unlock()
	ft.stopped = false
	return true
}

func (ft *fakeTimer) Trigger() {
	ft.mu.Lock()
	cb := ft.callback
	stopped := ft.stopped
	ft.mu.Unlock()

	if !stopped && cb != nil {
		cb()
	}
}

func TestTracker_StabilityCheck(t *testing.T) {
	tempDir := t.TempDir()
	filePath := filepath.Join(tempDir, "sample.pdf")
	_ = os.WriteFile(filePath, []byte("initial content"), 0600)

	readyCh := make(chan string, 10)
	var createdTimer *fakeTimer

	fakeTimerFunc := func(d time.Duration, f func()) Timer {
		createdTimer = &fakeTimer{callback: f}
		return createdTimer
	}

	ignoreHidden := true
	settings := config.Settings{
		IgnoreExt:    []string{"tmp", "part"},
		IgnoreNames:  []string{"desktop.ini"},
		IgnoreHidden: &ignoreHidden,
	}

	tracker := NewStabilityTracker(3*time.Second, settings, readyCh)
	tracker.newTimer = fakeTimerFunc

	// 1. Initial event records initial size (15 bytes)
	tracker.OnFileEvent(filePath, false)
	if createdTimer == nil {
		t.Fatal("expected timer to be created on first event")
	}

	// 2. Modify file on disk to simulate active background write
	_ = os.WriteFile(filePath, []byte("extended content actively written"), 0600)

	// 3. Trigger timer: detects size change (disk size != lastSize) and reschedules without emitting
	createdTimer.Trigger()

	select {
	case file := <-readyCh:
		t.Fatalf("file should not have been emitted while size changed: %s", file)
	default:
		// Correct
	}

	// 4. Second trigger with no further writes: file is now stable!
	createdTimer.Trigger()

	select {
	case file := <-readyCh:
		if file != filePath {
			t.Errorf("expected %q, got %q", filePath, file)
		}
	default:
		t.Fatal("expected file to be emitted after stability check")
	}
}

func TestTracker_Debounce(t *testing.T) {
	tempDir := t.TempDir()
	filePath := filepath.Join(tempDir, "data.txt")
	_ = os.WriteFile(filePath, []byte("content"), 0600)

	readyCh := make(chan string, 10)
	var activeTimer *fakeTimer

	tracker := NewStabilityTracker(3*time.Second, config.Settings{}, readyCh)
	tracker.newTimer = func(d time.Duration, f func()) Timer {
		activeTimer = &fakeTimer{callback: f}
		return activeTimer
	}

	// Send 5 rapid events for the same file
	for i := 0; i < 5; i++ {
		tracker.OnFileEvent(filePath, false)
	}

	// Trigger stability check
	activeTimer.Trigger()

	// Should emit exactly 1 file event
	count := len(readyCh)
	if count != 1 {
		t.Errorf("expected exactly 1 emitted event, got %d", count)
	}
}

func TestTracker_IgnoreRules(t *testing.T) {
	tempDir := t.TempDir()
	readyCh := make(chan string, 10)

	ignoreHidden := true
	settings := config.Settings{
		IgnoreExt:    []string{"crdownload", "part"},
		IgnoreNames:  []string{"desktop.ini"},
		IgnoreHidden: &ignoreHidden,
	}

	tracker := NewStabilityTracker(3*time.Second, settings, readyCh)

	// Create ignored files
	f1 := filepath.Join(tempDir, "video.crdownload")
	f2 := filepath.Join(tempDir, "desktop.ini")
	f3 := filepath.Join(tempDir, ".hidden.txt")

	_ = os.WriteFile(f1, []byte("partial"), 0600)
	_ = os.WriteFile(f2, []byte("ini"), 0600)
	_ = os.WriteFile(f3, []byte("hidden"), 0600)

	tracker.OnFileEvent(f1, false)
	tracker.OnFileEvent(f2, false)
	tracker.OnFileEvent(f3, false)

	if len(tracker.files) != 0 {
		t.Errorf("ignored files should not be tracked, active count: %d", len(tracker.files))
	}
}

func TestTracker_RenameTempToFinal(t *testing.T) {
	tempDir := t.TempDir()
	readyCh := make(chan string, 10)
	var activeTimer *fakeTimer

	settings := config.Settings{
		IgnoreExt: []string{"crdownload"},
	}

	tracker := NewStabilityTracker(3*time.Second, settings, readyCh)
	tracker.newTimer = func(d time.Duration, f func()) Timer {
		activeTimer = &fakeTimer{callback: f}
		return activeTimer
	}

	tempFile := filepath.Join(tempDir, "archive.zip.crdownload")
	finalFile := filepath.Join(tempDir, "archive.zip")

	_ = os.WriteFile(tempFile, []byte("downloading data"), 0600)
	tracker.OnFileEvent(tempFile, false)
	// Ignored because of extension
	if len(tracker.files) != 0 {
		t.Fatal("tempFile should have been ignored")
	}

	// Rename tempFile to finalFile
	_ = os.Rename(tempFile, finalFile)
	tracker.OnFileEvent(tempFile, true)   // remove/rename event for old path
	tracker.OnFileEvent(finalFile, false) // create event for new path

	if len(tracker.files) != 1 {
		t.Fatalf("expected 1 tracked file for finalFile, got %d", len(tracker.files))
	}

	// Trigger stability check
	activeTimer.Trigger()

	select {
	case file := <-readyCh:
		if file != finalFile {
			t.Errorf("expected finalFile %q, got %q", finalFile, file)
		}
	default:
		t.Fatal("expected finalFile to be emitted after stabilization")
	}
}

func TestTracker_FileDeletedBeforeStable(t *testing.T) {
	tempDir := t.TempDir()
	readyCh := make(chan string, 10)
	var activeTimer *fakeTimer

	tracker := NewStabilityTracker(3*time.Second, config.Settings{}, readyCh)
	tracker.newTimer = func(d time.Duration, f func()) Timer {
		activeTimer = &fakeTimer{callback: f}
		return activeTimer
	}

	filePath := filepath.Join(tempDir, "transient.txt")
	_ = os.WriteFile(filePath, []byte("transient"), 0600)

	tracker.OnFileEvent(filePath, false)
	if len(tracker.files) != 1 {
		t.Fatal("expected file to be tracked initially")
	}

	// Delete file
	_ = os.Remove(filePath)
	tracker.OnFileEvent(filePath, true)

	if len(tracker.files) != 0 {
		t.Errorf("deleted file should have been removed from tracking")
	}

	// Trigger callback just in case
	activeTimer.Trigger()

	select {
	case file := <-readyCh:
		t.Fatalf("deleted file should not be emitted: %s", file)
	default:
		// Correct
	}
}
