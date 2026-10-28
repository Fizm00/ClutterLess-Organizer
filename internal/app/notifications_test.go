// SPDX-License-Identifier: AGPL-3.0-only

package app

import (
	"sync"
	"testing"
	"time"
)

type mockNotifier struct {
	mu            sync.Mutex
	notifications []struct {
		title   string
		body    string
		isError bool
	}
	focused bool
}

func (m *mockNotifier) SendNotification(title, body string, isError bool) error {
	m.mu.Lock()
	defer m.mu.Unlock()
	m.notifications = append(m.notifications, struct {
		title   string
		body    string
		isError bool
	}{title: title, body: body, isError: isError})
	return nil
}

func (m *mockNotifier) IsWindowFocused() bool {
	m.mu.Lock()
	defer m.mu.Unlock()
	return m.focused
}

func (m *mockNotifier) count() int {
	m.mu.Lock()
	defer m.mu.Unlock()
	return len(m.notifications)
}

func (m *mockNotifier) last() (string, string, bool) {
	m.mu.Lock()
	defer m.mu.Unlock()
	if len(m.notifications) == 0 {
		return "", "", false
	}
	last := m.notifications[len(m.notifications)-1]
	return last.title, last.body, last.isError
}

func TestNotificationAggregator_SingleFolderCoalescing(t *testing.T) {
	notifier := &mockNotifier{focused: false}
	agg := NewNotificationAggregator(notifier, 50*time.Millisecond)
	agg.SetEnabled(true)
	defer agg.Stop()

	// Simulate rapid moves in Downloads
	agg.RecordMove(`C:\Users\User\Downloads`, 5)
	agg.RecordMove(`C:\Users\User\Downloads`, 7)

	// Wait for debounce flush
	time.Sleep(100 * time.Millisecond)

	if notifier.count() != 1 {
		t.Fatalf("expected 1 coalesced notification, got %d", notifier.count())
	}
	title, body, isErr := notifier.last()
	if title != "ClutterLess" || body != "12 files organized from Downloads" || isErr {
		t.Errorf("unexpected notification content: title=%q body=%q isErr=%v", title, body, isErr)
	}
}

func TestNotificationAggregator_MultipleFolders(t *testing.T) {
	notifier := &mockNotifier{focused: false}
	agg := NewNotificationAggregator(notifier, 50*time.Millisecond)
	agg.SetEnabled(true)
	defer agg.Stop()

	agg.RecordMove(`C:\Users\User\Downloads`, 3)
	agg.RecordMove(`C:\Users\User\Desktop`, 2)

	time.Sleep(100 * time.Millisecond)

	if notifier.count() != 1 {
		t.Fatalf("expected 1 notification, got %d", notifier.count())
	}
	_, body, _ := notifier.last()
	expected := "5 files organized across 2 folders"
	if body != expected {
		t.Errorf("expected %q, got %q", expected, body)
	}
}

func TestNotificationAggregator_SuppressedWhenWindowFocused(t *testing.T) {
	notifier := &mockNotifier{focused: true} // window is focused!
	agg := NewNotificationAggregator(notifier, 50*time.Millisecond)
	agg.SetEnabled(true)
	defer agg.Stop()

	agg.RecordMove(`C:\Users\User\Downloads`, 4)
	time.Sleep(100 * time.Millisecond)

	if notifier.count() != 0 {
		t.Errorf("expected 0 notifications when window is focused, got %d", notifier.count())
	}
}

func TestNotificationAggregator_Disabled(t *testing.T) {
	notifier := &mockNotifier{focused: false}
	agg := NewNotificationAggregator(notifier, 50*time.Millisecond)
	agg.SetEnabled(false) // disabled
	defer agg.Stop()

	agg.RecordMove(`C:\Users\User\Downloads`, 10)
	time.Sleep(100 * time.Millisecond)

	if notifier.count() != 0 {
		t.Errorf("expected 0 notifications when disabled, got %d", notifier.count())
	}
}

func TestNotificationAggregator_ImmediateError(t *testing.T) {
	notifier := &mockNotifier{focused: false}
	agg := NewNotificationAggregator(notifier, 500*time.Millisecond)
	agg.SetEnabled(true)
	defer agg.Stop()

	err := agg.SendError("ClutterLess Error", "Watch failed: permission denied")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	if notifier.count() != 1 {
		t.Fatalf("expected immediate error notification, got %d", notifier.count())
	}
	title, body, isErr := notifier.last()
	if title != "ClutterLess Error" || body != "Watch failed: permission denied" || !isErr {
		t.Errorf("unexpected error notification payload: title=%q, body=%q, isErr=%v", title, body, isErr)
	}
}

