// SPDX-License-Identifier: AGPL-3.0-only

package watcher

import (
	"context"
	"os"
	"path/filepath"
	"testing"
	"time"

	"github.com/Fizm00/organizer/internal/config"
)

func TestWatcher_StartAndGracefulShutdown(t *testing.T) {
	tempDir := t.TempDir()
	watchDir := filepath.Join(tempDir, "WatchFolder")
	_ = os.MkdirAll(watchDir, 0755)

	destDir := filepath.Join(watchDir, "Organized") // destination folder inside watch dir

	entries := []config.WatchEntry{
		{Path: watchDir, Recursive: true},
	}
	settings := config.Settings{
		StableAfterSeconds: 1,
	}

	w, err := NewWatcher(entries, settings, []string{destDir})
	if err != nil {
		t.Fatalf("failed to create watcher: %v", err)
	}

	ctx, cancel := context.WithCancel(context.Background())

	if err := w.Start(ctx); err != nil {
		t.Fatalf("failed to start watcher: %v", err)
	}

	// Verify excluded destination is recognized
	if !w.isExcluded(destDir) {
		t.Errorf("expected %q to be excluded", destDir)
	}

	// Cancel context to trigger graceful shutdown
	cancel()

	// Wait briefly for watcher goroutines to exit cleanly
	time.Sleep(100 * time.Millisecond)

	// Channel should be closed
	_, ok := <-w.ReadyFiles
	if ok {
		t.Errorf("expected ReadyFiles channel to be closed after shutdown")
	}
}

func TestWatcher_RealFSIntegration(t *testing.T) {
	tempDir := t.TempDir()
	watchDir := filepath.Join(tempDir, "Watch")
	_ = os.MkdirAll(watchDir, 0755)

	entries := []config.WatchEntry{
		{Path: watchDir, Recursive: false},
	}
	settings := config.Settings{
		StableAfterSeconds: 1,
	}

	w, err := NewWatcher(entries, settings, nil)
	if err != nil {
		t.Fatalf("failed to create watcher: %v", err)
	}

	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	if err := w.Start(ctx); err != nil {
		t.Fatalf("failed to start watcher: %v", err)
	}
	defer w.Close()

	// Create a real file on disk
	sampleFile := filepath.Join(watchDir, "document.txt")
	if err := os.WriteFile(sampleFile, []byte("fsnotify integration content"), 0644); err != nil {
		t.Fatalf("failed to write test file: %v", err)
	}

	// Wait for file to stabilize and be emitted through ReadyFiles channel
	select {
	case readyFile, ok := <-w.ReadyFiles:
		if !ok {
			t.Fatal("ReadyFiles channel closed unexpectedly")
		}
		if filepath.Clean(readyFile) != filepath.Clean(sampleFile) {
			t.Errorf("expected %q, got %q", sampleFile, readyFile)
		}
	case <-time.After(5 * time.Second):
		t.Fatal("timeout waiting for stable file from real fsnotify watcher")
	}
}
