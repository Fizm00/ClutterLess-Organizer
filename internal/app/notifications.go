// SPDX-License-Identifier: AGPL-3.0-only

package app

import (
	"fmt"
	"path/filepath"
	"sync"
	"time"
)

// NativeNotifier sends notifications to the operating system and checks window focus.
type NativeNotifier interface {
	SendNotification(title, body string, isError bool) error
	IsWindowFocused() bool
}

// NotificationAggregator coalesces rapid file move events into concise summary notifications.
// Per DESIGN.md section 7 and G6 prompt:
// - Opt-in (only sends when enabled)
// - Summary, not per-file (e.g. "12 files organized from Downloads")
// - Suppressed when window is focused
// - High-priority errors bypass coalescing and notify immediately
type NotificationAggregator struct {
	mu          sync.Mutex
	notifier    NativeNotifier
	enabled     bool
	window      time.Duration
	folderMoves map[string]int // base folder -> count
	flushTimer  *time.Timer
	stopCh      chan struct{}
}

// NewNotificationAggregator creates a new notification coalescer with the specified debounce window.
func NewNotificationAggregator(notifier NativeNotifier, window time.Duration) *NotificationAggregator {
	if window <= 0 {
		window = 2 * time.Second
	}
	return &NotificationAggregator{
		notifier:    notifier,
		window:      window,
		folderMoves: make(map[string]int),
		stopCh:      make(chan struct{}),
	}
}

// SetEnabled enables or disables notification delivery.
func (a *NotificationAggregator) SetEnabled(enabled bool) {
	a.mu.Lock()
	defer a.mu.Unlock()
	a.enabled = enabled
	if !enabled {
		if a.flushTimer != nil {
			a.flushTimer.Stop()
			a.flushTimer = nil
		}
		a.folderMoves = make(map[string]int)
	}
}

// IsEnabled reports whether notifications are currently active.
func (a *NotificationAggregator) IsEnabled() bool {
	a.mu.Lock()
	defer a.mu.Unlock()
	return a.enabled
}

// RecordMove buffers a file move event. If the window is currently focused, notifications are skipped.
func (a *NotificationAggregator) RecordMove(folderPath string, count int) {
	if count <= 0 {
		return
	}

	a.mu.Lock()
	defer a.mu.Unlock()

	if !a.enabled || a.notifier == nil {
		return
	}

	if a.notifier.IsWindowFocused() {
		return
	}

	folderBase := filepath.Base(folderPath)
	a.folderMoves[folderBase] += count

	if a.flushTimer != nil {
		a.flushTimer.Stop()
	}
	a.flushTimer = time.AfterFunc(a.window, func() {
		a.Flush()
	})
}

// SendError delivers an important error notification immediately without debouncing, if notifications are enabled.
func (a *NotificationAggregator) SendError(title, message string) error {
	a.mu.Lock()
	enabled := a.enabled
	notifier := a.notifier
	a.mu.Unlock()

	if !enabled || notifier == nil {
		return nil
	}

	return notifier.SendNotification(title, message, true)
}

// Flush dispatches any pending aggregated move summary.
func (a *NotificationAggregator) Flush() {
	a.mu.Lock()
	if !a.enabled || a.notifier == nil || len(a.folderMoves) == 0 {
		a.folderMoves = make(map[string]int)
		a.mu.Unlock()
		return
	}

	// Do not notify if the window is currently focused
	if a.notifier.IsWindowFocused() {
		a.folderMoves = make(map[string]int)
		a.mu.Unlock()
		return
	}

	totalFiles := 0
	folders := make([]string, 0, len(a.folderMoves))
	for f, c := range a.folderMoves {
		totalFiles += c
		folders = append(folders, f)
	}
	movesCopy := a.folderMoves
	a.folderMoves = make(map[string]int)
	a.mu.Unlock()

	if totalFiles == 0 {
		return
	}

	var summary string
	if len(folders) == 1 {
		folderName := folders[0]
		if totalFiles == 1 {
			summary = fmt.Sprintf("1 file organized from %s", folderName)
		} else {
			summary = fmt.Sprintf("%d files organized from %s", totalFiles, folderName)
		}
	} else {
		summary = fmt.Sprintf("%d files organized across %d folders", totalFiles, len(folders))
	}

	_ = movesCopy // consumed
	_ = a.notifier.SendNotification("ClutterLess", summary, false)
}

// Stop cleanly stops any active timers.
func (a *NotificationAggregator) Stop() {
	a.mu.Lock()
	defer a.mu.Unlock()
	if a.flushTimer != nil {
		a.flushTimer.Stop()
		a.flushTimer = nil
	}
}

