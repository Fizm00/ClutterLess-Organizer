// SPDX-License-Identifier: AGPL-3.0-only

package ui

import (
	"fmt"
	"io"
	"sync"
	"time"
)

var spinnerFrames = []string{"⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"}

// Spinner renders an animated loading indicator on interactive terminals.
type Spinner struct {
	mu      sync.Mutex
	writer  io.Writer
	message string
	active  bool
	stopCh  chan struct{}
	styler  *Styler
}

// NewSpinner creates a new terminal Spinner.
func NewSpinner(msg string, w io.Writer, styler *Styler) *Spinner {
	return &Spinner{
		writer:  w,
		message: msg,
		styler:  styler,
		stopCh:  make(chan struct{}),
	}
}

// Start begins the animation goroutine.
func (s *Spinner) Start() {
	if !IsTerminalWriter(s.writer) {
		// Non-interactive terminal: do not output animated frame updates
		return
	}

	s.mu.Lock()
	if s.active {
		s.mu.Unlock()
		return
	}
	s.active = true
	s.mu.Unlock()

	go func() {
		idx := 0
		ticker := time.NewTicker(80 * time.Millisecond)
		defer ticker.Stop()

		for {
			select {
			case <-s.stopCh:
				return
			case <-ticker.C:
				s.mu.Lock()
				if !s.active {
					s.mu.Unlock()
					return
				}
				frame := spinnerFrames[idx%len(spinnerFrames)]
				if s.styler.Enabled {
					frame = s.styler.Cyan(frame)
				}
				fmt.Fprintf(s.writer, "\r%s %s", frame, s.message)
				idx++
				s.mu.Unlock()
			}
		}
	}()
}

// Update changes the text displayed next to the spinner.
func (s *Spinner) Update(msg string) {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.message = msg
}

// Stop terminates the spinner and optionally prints a clean final line.
func (s *Spinner) Stop(finalMsg string) {
	s.mu.Lock()
	if !s.active {
		s.mu.Unlock()
		return
	}
	s.active = false
	close(s.stopCh)
	s.mu.Unlock()

	if IsTerminalWriter(s.writer) {
		// Clear line
		fmt.Fprintf(s.writer, "\r\033[K")
		if finalMsg != "" {
			fmt.Fprintln(s.writer, finalMsg)
		}
	}
}
