// SPDX-License-Identifier: AGPL-3.0-only

package app

import (
	"fmt"
	"os"
	"path/filepath"
	"testing"

	"github.com/Fizm00/organizer/internal/history"
	"github.com/Fizm00/organizer/internal/platform"
)

func TestWatchService_StartStopAndStatus(t *testing.T) {
	tempDir := t.TempDir()
	watchDir := filepath.Join(tempDir, "watch_folder")
	_ = os.MkdirAll(watchDir, 0755)

	configPath := filepath.Join(tempDir, "config.yaml")
	cs, _ := NewConfigService(configPath, nil)
	defer cs.Close()

	_ = cs.Save(ConfigDTO{
		Settings: SettingsDTO{StableAfterSeconds: 1, Conflict: "rename"},
		Watch: []WatchEntryDTO{
			{Path: watchDir, Recursive: false},
		},
	})

	hist, _ := history.NewStorage(filepath.Join(tempDir, "history.jsonl"))
	sink := NewMemoryEventSink()

	ws := NewWatchService(cs, hist, sink, tempDir)

	// Initial status
	st := ws.Status()
	if st.Running {
		t.Errorf("expected not running initially")
	}

	// Start watcher
	if err := ws.Start(); err != nil {
		t.Fatalf("failed to start WatchService: %v", err)
	}

	st = ws.Status()
	if !st.Running || len(st.Folders) != 1 {
		t.Errorf("expected running with 1 folder, got running=%v, folders=%v", st.Running, st.Folders)
	}

	// Lock file must exist
	lockPath := filepath.Join(tempDir, "watcher.lock")
	if _, err := os.Stat(lockPath); os.IsNotExist(err) {
		t.Errorf("expected lock file to exist during watch")
	}

	// Verify EventWatchStatus was emitted
	if sink.Count(EventWatchStatus) == 0 {
		t.Errorf("expected EventWatchStatus to be emitted")
	}

	// Stop watcher
	if err := ws.Stop(); err != nil {
		t.Fatalf("failed to stop WatchService: %v", err)
	}

	st = ws.Status()
	if st.Running {
		t.Errorf("expected not running after stop")
	}

	// Lock file must be cleaned up
	if _, err := os.Stat(lockPath); !os.IsNotExist(err) {
		t.Errorf("expected lock file to be removed after stop")
	}
}

func TestWatchService_LockConflictBetweenServices(t *testing.T) {
	tempDir := t.TempDir()
	watchDir := filepath.Join(tempDir, "watch_folder")
	_ = os.MkdirAll(watchDir, 0755)

	configPath := filepath.Join(tempDir, "config.yaml")
	cs, _ := NewConfigService(configPath, nil)
	defer cs.Close()

	_ = cs.Save(ConfigDTO{
		Watch: []WatchEntryDTO{{Path: watchDir, Recursive: false}},
	})

	ws1 := NewWatchService(cs, nil, nil, tempDir)
	if err := ws1.Start(); err != nil {
		t.Fatalf("ws1 failed to start: %v", err)
	}
	defer ws1.Stop()

	// Simulate a second distinct process by modifying lock PID to a live process (ppid)
	parentPID := os.Getppid()
	if parentPID > 0 && platform.IsProcessAlive(parentPID) {
		lockJSON := []byte(fmt.Sprintf(`{"pid": %d, "startTime": "2026-10-28T17:00:00Z"}`, parentPID))
		_ = os.WriteFile(filepath.Join(tempDir, "watcher.lock"), lockJSON, 0644)

		ws2 := NewWatchService(cs, nil, nil, tempDir)
		err := ws2.Start()
		if err == nil {
			t.Errorf("expected second WatchService to fail when lock held, got nil")
		}
		if appErr, ok := err.(*AppError); !ok || appErr.Code != ErrWatcherAlreadyRunning {
			t.Errorf("expected ErrWatcherAlreadyRunning, got %v", err)
		}
	}
}

func TestWatchService_Reload(t *testing.T) {
	tempDir := t.TempDir()
	watchDir := filepath.Join(tempDir, "watch_folder")
	_ = os.MkdirAll(watchDir, 0755)

	configPath := filepath.Join(tempDir, "config.yaml")
	cs, _ := NewConfigService(configPath, nil)
	defer cs.Close()

	_ = cs.Save(ConfigDTO{
		Watch: []WatchEntryDTO{{Path: watchDir, Recursive: false}},
	})

	ws := NewWatchService(cs, nil, nil, tempDir)
	if err := ws.Start(); err != nil {
		t.Fatalf("failed to start: %v", err)
	}
	defer ws.Stop()

	// Reload while running
	if err := ws.Reload(); err != nil {
		t.Fatalf("reload failed: %v", err)
	}

	if !ws.Status().Running {
		t.Errorf("expected service to remain running after reload")
	}
}
