// SPDX-License-Identifier: AGPL-3.0-only

package watcher

import (
	"time"
)

// Timer abstracts a timer interface for deterministic testing.
type Timer interface {
	Stop() bool
	Reset(d time.Duration) bool
}

// realTimer implements Timer using the standard library time.Timer.
type realTimer struct {
	*time.Timer
}

// TimerFunc creates a new Timer that executes callback f after duration d.
type TimerFunc func(d time.Duration, f func()) Timer

// DefaultTimerFunc creates a real time.Timer calling f after duration d.
func DefaultTimerFunc(d time.Duration, f func()) Timer {
	return &realTimer{Timer: time.AfterFunc(d, f)}
}
