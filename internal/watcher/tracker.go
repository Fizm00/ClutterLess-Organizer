// SPDX-License-Identifier: AGPL-3.0-only

package watcher

import (
	"log/slog"
	"os"
	"sync"
	"time"

	"github.com/Fizm00/organizer/internal/config"
)

// fileEntry tracks the stability state of a file being written.
type fileEntry struct {
	path      string
	lastSize  int64
	lastMtime time.Time
	timer     Timer
}

// StabilityTracker manages write stability checks and event debouncing.
type StabilityTracker struct {
	mu             sync.Mutex
	files          map[string]*fileEntry
	stableDuration time.Duration
	settings       config.Settings
	readyCh        chan string
	newTimer       TimerFunc
	statFn         func(string) (os.FileInfo, error)
}

// NewStabilityTracker creates a new tracker with the specified stability duration and settings.
func NewStabilityTracker(stableDuration time.Duration, settings config.Settings, readyCh chan string) *StabilityTracker {
	return &StabilityTracker{
		files:          make(map[string]*fileEntry),
		stableDuration: stableDuration,
		settings:       settings,
		readyCh:        readyCh,
		newTimer:       DefaultTimerFunc,
		statFn:         os.Stat,
	}
}

// OnFileEvent handles filesystem events (Create, Write, Chmod, Remove, Rename) for a path.
func (st *StabilityTracker) OnFileEvent(path string, isDeleteOrRename bool) {
	st.mu.Lock()
	defer st.mu.Unlock()

	// 1. If the file was deleted or renamed away, cancel any active timer
	if isDeleteOrRename {
		if entry, exists := st.files[path]; exists {
			if entry.timer != nil {
				entry.timer.Stop()
			}
			delete(st.files, path)
		}
		return
	}

	// 2. Stat file on disk
	info, err := st.statFn(path)
	if err != nil {
		// File vanished or inaccessible
		if entry, exists := st.files[path]; exists {
			if entry.timer != nil {
				entry.timer.Stop()
			}
			delete(st.files, path)
		}
		return
	}

	// 3. Ignore directories
	if info.IsDir() {
		return
	}

	// 4. Check if file should be ignored (temp download extensions, ignored names, hidden)
	if ignored, _ := config.ShouldIgnoreFile(path, info.Name(), st.settings); ignored {
		if entry, exists := st.files[path]; exists {
			if entry.timer != nil {
				entry.timer.Stop()
			}
			delete(st.files, path)
		}
		return
	}

	// 5. Track or reset file stability timer
	entry, exists := st.files[path]
	if !exists {
		entry = &fileEntry{
			path:      path,
			lastSize:  info.Size(),
			lastMtime: info.ModTime(),
		}
		st.files[path] = entry
		entry.timer = st.newTimer(st.stableDuration, func() {
			st.checkStability(entry)
		})
	} else {
		// Event debounce: update state and reset timer
		entry.lastSize = info.Size()
		entry.lastMtime = info.ModTime()
		if entry.timer != nil {
			entry.timer.Reset(st.stableDuration)
		}
	}
}

// checkStability is executed when a file timer ticks to verify size and mtime are unchanged.
func (st *StabilityTracker) checkStability(entry *fileEntry) {
	st.mu.Lock()
	defer st.mu.Unlock()

	// Ensure entry is still tracked
	currentEntry, exists := st.files[entry.path]
	if !exists || currentEntry != entry {
		return
	}

	info, err := st.statFn(entry.path)
	if err != nil {
		// File vanished before becoming stable
		delete(st.files, entry.path)
		return
	}

	// Check if file size or mtime modified during the wait duration
	if info.Size() == entry.lastSize && info.ModTime().Equal(entry.lastMtime) {
		// File is completely stable!
		delete(st.files, entry.path)
		slog.Debug("file stabilized and ready for processing", "path", entry.path)

		select {
		case st.readyCh <- entry.path:
		default:
			// Non-blocking fallback if buffer full
			go func(p string) {
				st.readyCh <- p
			}(entry.path)
		}
	} else {
		// File is still actively written; extend wait
		entry.lastSize = info.Size()
		entry.lastMtime = info.ModTime()
		entry.timer = st.newTimer(st.stableDuration, func() {
			st.checkStability(entry)
		})
	}
}

// Stop cancels all active timers and clears tracked files.
func (st *StabilityTracker) Stop() {
	st.mu.Lock()
	defer st.mu.Unlock()

	for _, entry := range st.files {
		if entry.timer != nil {
			entry.timer.Stop()
		}
	}
	st.files = make(map[string]*fileEntry)
}
