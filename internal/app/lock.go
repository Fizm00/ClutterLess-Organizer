// SPDX-License-Identifier: AGPL-3.0-only

package app

import (
	"errors"
	"fmt"

	"github.com/Fizm00/organizer/internal/platform"
)

// WatcherLock re-exports platform.WatcherLock for convenience.
type WatcherLock = platform.WatcherLock

// DefaultStateDir re-exports platform.DefaultStateDir.
func DefaultStateDir() (string, error) {
	return platform.DefaultStateDir()
}

// AcquireWatcherLock attempts to acquire the watcher lock in the given state directory,
// returning an AppError with code WATCHER_ALREADY_RUNNING if already active.
func AcquireWatcherLock(stateDir string) (*WatcherLock, error) {
	lock, err := platform.AcquireWatcherLock(stateDir)
	if err != nil {
		if errors.Is(err, platform.ErrWatcherAlreadyRunning) {
			return nil, NewAppError(
				ErrWatcherAlreadyRunning,
				"Watcher is already running in another process",
				"Stop the running watcher instance or close its window before starting a new one.",
				err.Error(),
			)
		}
		return nil, fmt.Errorf("failed to acquire watcher lock: %w", err)
	}
	return lock, nil
}
