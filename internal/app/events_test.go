// SPDX-License-Identifier: AGPL-3.0-only

package app

import (
	"sync"
	"testing"
)

func TestCallbackEventSink(t *testing.T) {
	var mu sync.Mutex
	var received []EmittedEvent

	sink := NewCallbackEventSink(func(name string, payload any) {
		mu.Lock()
		defer mu.Unlock()
		received = append(received, EmittedEvent{Name: name, Payload: payload})
	})

	sink.Emit(EventWatchStatus, WatchStatusDTO{Running: true})
	sink.Emit(EventFileMoved, FileMovedPayload{Source: "/test/file.txt", Dest: "/dest/file.txt"})

	mu.Lock()
	defer mu.Unlock()
	if len(received) != 2 {
		t.Fatalf("expected 2 received events, got %d", len(received))
	}
	if received[0].Name != EventWatchStatus {
		t.Errorf("expected EventWatchStatus, got %s", received[0].Name)
	}
	if received[1].Name != EventFileMoved {
		t.Errorf("expected EventFileMoved, got %s", received[1].Name)
	}

	// Test nil callback does not panic
	nilSink := NewCallbackEventSink(nil)
	nilSink.Emit(EventWatchStatus, nil)
}

