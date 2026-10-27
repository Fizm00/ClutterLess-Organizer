// SPDX-License-Identifier: AGPL-3.0-only

package watcher

import (
	"context"
	"fmt"
	"io/fs"
	"log/slog"
	"os"
	"path/filepath"
	"strings"
	"sync"
	"time"

	"github.com/Fizm00/organizer/internal/config"
	"github.com/fsnotify/fsnotify"
)

// Watcher monitors directories using fsnotify and emits stable file paths.
type Watcher struct {
	fsWatcher    *fsnotify.Watcher
	tracker      *StabilityTracker
	ReadyFiles   chan string
	WatchEntries []config.WatchEntry
	ExcludedDirs []string
	Settings     config.Settings

	mu        sync.Mutex
	watching  map[string]bool
	closeOnce sync.Once
}

// NewWatcher creates a new Watcher configured for the given watch entries and settings.
func NewWatcher(entries []config.WatchEntry, settings config.Settings, excludedDirs []string) (*Watcher, error) {
	fsWatcher, err := fsnotify.NewWatcher()
	if err != nil {
		return nil, fmt.Errorf("failed to create fsnotify watcher: %w", err)
	}

	stableDuration := time.Duration(settings.StableAfterSeconds) * time.Second
	readyCh := make(chan string, 100)

	return &Watcher{
		fsWatcher:    fsWatcher,
		tracker:      NewStabilityTracker(stableDuration, settings, readyCh),
		ReadyFiles:   readyCh,
		WatchEntries: entries,
		ExcludedDirs: excludedDirs,
		Settings:     settings,
		watching:     make(map[string]bool),
	}, nil
}

// isExcluded checks if a directory path sits inside any excluded destination folder.
func (w *Watcher) isExcluded(dirPath string) bool {
	cleanDir := filepath.Clean(dirPath)
	for _, excl := range w.ExcludedDirs {
		cleanExcl := filepath.Clean(excl)
		rel, err := filepath.Rel(cleanExcl, cleanDir)
		if err == nil && !strings.HasPrefix(rel, "..") && rel != ".." {
			return true
		}
	}
	return false
}

// addWatch adds a directory to the fsnotify watcher if not already monitored.
func (w *Watcher) addWatch(path string) error {
	w.mu.Lock()
	defer w.mu.Unlock()

	cleanPath := filepath.Clean(path)
	if w.watching[cleanPath] {
		return nil
	}

	if w.isExcluded(cleanPath) {
		slog.Debug("excluding directory from watcher to prevent loop", "path", cleanPath)
		return nil
	}

	if err := w.fsWatcher.Add(cleanPath); err != nil {
		return err
	}

	w.watching[cleanPath] = true
	slog.Debug("added directory to watch", "path", cleanPath)
	return nil
}

// Start begins monitoring watched directories and processing filesystem events.
func (w *Watcher) Start(ctx context.Context) error {
	// Register initial watched directories
	for _, entry := range w.WatchEntries {
		watchPath := config.ExpandPath(entry.Path)
		if _, err := os.Stat(watchPath); err != nil {
			slog.Warn("configured watch directory does not exist, skipping", "path", watchPath)
			continue
		}

		if !entry.Recursive {
			if err := w.addWatch(watchPath); err != nil {
				slog.Error("failed to watch directory", "path", watchPath, "error", err)
			}
		} else {
			// Recursively watch all subdirectories except excluded folders
			_ = filepath.WalkDir(watchPath, func(path string, d fs.DirEntry, err error) error {
				if err != nil {
					return nil
				}
				if d.IsDir() {
					if w.isExcluded(path) {
						return filepath.SkipDir
					}
					_ = w.addWatch(path)
				}
				return nil
			})
		}
	}

	go w.eventLoop(ctx)
	return nil
}

// eventLoop processes incoming fsnotify events and errors until context is cancelled.
func (w *Watcher) eventLoop(ctx context.Context) {
	defer w.Close()

	for {
		select {
		case <-ctx.Done():
			return

		case ev, ok := <-w.fsWatcher.Events:
			if !ok {
				return
			}

			// Handle newly created subdirectories in recursive watch mode
			if ev.Has(fsnotify.Create) {
				if info, err := os.Stat(ev.Name); err == nil && info.IsDir() {
					// Dynamically add new subdirectories if inside recursive entries
					for _, entry := range w.WatchEntries {
						if entry.Recursive {
							parentDir := config.ExpandPath(entry.Path)
							rel, err := filepath.Rel(parentDir, ev.Name)
							if err == nil && !strings.HasPrefix(rel, "..") && rel != ".." {
								_ = w.addWatch(ev.Name)
								break
							}
						}
					}
					continue
				}
			}

			// Handle file events
			if ev.Has(fsnotify.Remove) || ev.Has(fsnotify.Rename) {
				w.tracker.OnFileEvent(ev.Name, true)
			} else if ev.Has(fsnotify.Create) || ev.Has(fsnotify.Write) || ev.Has(fsnotify.Chmod) {
				w.tracker.OnFileEvent(ev.Name, false)
			}

		case err, ok := <-w.fsWatcher.Errors:
			if !ok {
				return
			}
			slog.Error("fsnotify error encountered", "error", err)
		}
	}
}

// Close gracefully terminates the watcher and cleans up all resources.
func (w *Watcher) Close() error {
	var err error
	w.closeOnce.Do(func() {
		w.tracker.Stop()
		err = w.fsWatcher.Close()
		close(w.ReadyFiles)
	})
	return err
}
