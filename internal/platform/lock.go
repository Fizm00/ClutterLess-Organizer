// SPDX-License-Identifier: AGPL-3.0-only

package platform

import (
	"encoding/json"
	"errors"
	"fmt"
	"os"
	"path/filepath"
	"sync"
	"time"
)

// ErrWatcherAlreadyRunning is returned when another live process holds the watcher lock.
var ErrWatcherAlreadyRunning = errors.New("watcher is already running in another active process")

// LockContent describes the JSON payload stored inside watcher.lock.
type LockContent struct {
	PID       int    `json:"pid"`
	StartTime string `json:"startTime"`
}

// WatcherLock manages exclusive ownership of the directory watcher.
type WatcherLock struct {
	path      string
	released  bool
	mu        sync.Mutex
	closeOnce sync.Once
}

// DefaultStateDir returns the default directory for runtime state files like watcher.lock.
func DefaultStateDir() (string, error) {
	configDir, err := os.UserConfigDir()
	if err != nil {
		return "", err
	}
	dir := filepath.Join(configDir, "organizer")
	if err := os.MkdirAll(dir, 0755); err != nil {
		return "", err
	}
	return dir, nil
}

// AcquireWatcherLock attempts to acquire the watcher lock in the given state directory.
// If an active process holds the lock, it returns ErrWatcherAlreadyRunning.
// Stale locks from terminated processes are cleanly replaced.
func AcquireWatcherLock(stateDir string) (*WatcherLock, error) {
	if stateDir == "" {
		defaultDir, err := DefaultStateDir()
		if err != nil {
			return nil, fmt.Errorf("failed to determine state directory: %w", err)
		}
		stateDir = defaultDir
	}

	lockPath := filepath.Join(stateDir, "watcher.lock")

	// Check if existing lock is active
	if data, err := os.ReadFile(lockPath); err == nil && len(data) > 0 {
		var content LockContent
		if jsonErr := json.Unmarshal(data, &content); jsonErr == nil && content.PID > 0 {
			if content.PID != os.Getpid() && IsProcessAlive(content.PID) {
				return nil, fmt.Errorf("%w (PID: %d, started at: %s)", ErrWatcherAlreadyRunning, content.PID, content.StartTime)
			}
		}
	}

	// Write new lock file
	content := LockContent{
		PID:       os.Getpid(),
		StartTime: time.Now().UTC().Format(time.RFC3339),
	}
	data, err := json.MarshalIndent(content, "", "  ")
	if err != nil {
		return nil, fmt.Errorf("failed to encode lock data: %w", err)
	}

	if err := os.WriteFile(lockPath, data, 0644); err != nil {
		return nil, fmt.Errorf("failed to write watcher lock file: %w", err)
	}

	return &WatcherLock{path: lockPath}, nil
}

// Release removes the lock file if owned by the current process.
func (l *WatcherLock) Release() error {
	var err error
	l.closeOnce.Do(func() {
		l.mu.Lock()
		defer l.mu.Unlock()
		l.released = true

		// Check if file still belongs to us before deleting
		if data, readErr := os.ReadFile(l.path); readErr == nil {
			var content LockContent
			if jsonErr := json.Unmarshal(data, &content); jsonErr == nil && content.PID == os.Getpid() {
				err = os.Remove(l.path)
			}
		}
	})
	return err
}

// Path returns the path of the lock file.
func (l *WatcherLock) Path() string {
	return l.path
}
