// SPDX-License-Identifier: AGPL-3.0-only

package app

import (
	"sync"
)

// Standard event names defined in GUI_ARCHITECTURE.md section 4.
const (
	EventWatchStatus   = "watch:status"
	EventFileMoved     = "file:moved"
	EventFileSkipped   = "file:skipped"
	EventFileFailed    = "file:failed"
	EventRunProgress   = "run:progress"
	EventConfigChanged = "config:changed"
	EventAppError      = "app:error"
)

// EventSink provides an event emitting interface decouled from any framework/Wails runtime.
type EventSink interface {
	Emit(name string, payload any)
}

// EmittedEvent captures an event name and payload for verification in tests.
type EmittedEvent struct {
	Name    string
	Payload any
}

// MemoryEventSink is a thread-safe in-memory event sink for testing.
type MemoryEventSink struct {
	mu     sync.Mutex
	events []EmittedEvent
}

// NewMemoryEventSink creates a new MemoryEventSink.
func NewMemoryEventSink() *MemoryEventSink {
	return &MemoryEventSink{}
}

// Emit records an event in memory.
func (m *MemoryEventSink) Emit(name string, payload any) {
	m.mu.Lock()
	defer m.mu.Unlock()
	m.events = append(m.events, EmittedEvent{Name: name, Payload: payload})
}

// Events returns a copy of all recorded events.
func (m *MemoryEventSink) Events() []EmittedEvent {
	m.mu.Lock()
	defer m.mu.Unlock()
	copied := make([]EmittedEvent, len(m.events))
	copy(copied, m.events)
	return copied
}

// Clear removes all recorded events.
func (m *MemoryEventSink) Clear() {
	m.mu.Lock()
	defer m.mu.Unlock()
	m.events = nil
}

// Count returns the number of events matching the given name.
func (m *MemoryEventSink) Count(name string) int {
	m.mu.Lock()
	defer m.mu.Unlock()
	count := 0
	for _, e := range m.events {
		if e.Name == name {
			count++
		}
	}
	return count
}

// NoopEventSink is an EventSink that discards all events.

// CallbackEventSink adapts a callback function to the EventSink interface.
type CallbackEventSink struct {
	callback func(name string, payload any)
}

// NewCallbackEventSink creates an EventSink that delegates to a callback function.
func NewCallbackEventSink(cb func(name string, payload any)) *CallbackEventSink {
	return &CallbackEventSink{callback: cb}
}

// Emit invokes the underlying callback function if non-nil.
func (c *CallbackEventSink) Emit(name string, payload any) {
	if c.callback != nil {
		c.callback(name, payload)
	}
}

type NoopEventSink struct{}

func (n *NoopEventSink) Emit(name string, payload any) {}

// ---- Event Payload Definitions ----

// FileMovedPayload is emitted when a file is successfully moved.
type FileMovedPayload struct {
	BatchID string `json:"batchId"`
	Source  string `json:"source"`
	Dest    string `json:"dest"`
	Rule    string `json:"rule"`
	Size    int64  `json:"size"`
	Time    string `json:"time"`
}

// FileSkippedPayload is emitted when a file is skipped during organization or watching.
type FileSkippedPayload struct {
	Path   string `json:"path"`
	Reason string `json:"reason"`
}

// FileFailedPayload is emitted when moving a file fails.
type FileFailedPayload struct {
	Path  string `json:"path"`
	Error string `json:"error"`
}

// RunProgressPayload is emitted as items are processed during an organization run.
type RunProgressPayload struct {
	Done  int  `json:"done"`
	Total int  `json:"total"`
	Item  *MoveResultDTO `json:"item,omitempty"`
}

// ConfigChangedPayload is emitted when the configuration file changes or is reloaded.
type ConfigChangedPayload struct {
	Path string `json:"path"`
}
