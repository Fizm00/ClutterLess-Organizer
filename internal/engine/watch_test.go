// SPDX-License-Identifier: AGPL-3.0-only

package engine

import (
	"context"
	"os"
	"path/filepath"
	"testing"
	"time"

	"github.com/Fizm00/organizer/internal/config"
	"github.com/Fizm00/organizer/internal/history"
)

func TestOrganizer_Watch_InitialRun(t *testing.T) {
	tempDir := t.TempDir()
	watchDir := filepath.Join(tempDir, "Watch")
	destDir := filepath.Join(tempDir, "Output")
	histFile := filepath.Join(tempDir, "history.jsonl")

	_ = os.MkdirAll(watchDir, 0755)

	// Create initial file
	f := filepath.Join(watchDir, "initial.pdf")
	_ = os.WriteFile(f, []byte("initial pdf"), 0600)

	cfg := &config.Config{
		Version: 1,
		Watch: []config.WatchEntry{
			{Path: watchDir, Recursive: false},
		},
		Rules: []config.RuleConfig{
			{
				Name: "PDFs",
				Match: config.MatchConfig{
					Ext: []string{"pdf"},
				},
				MoveTo: destDir,
			},
		},
	}
	config.ApplyDefaults(cfg)

	histStorage, _ := history.NewStorage(histFile)
	organizer := NewOrganizer(cfg)
	organizer.History = histStorage

	// Cancel context after short duration so Watch exits after initial run
	ctx, cancel := context.WithTimeout(context.Background(), 200*time.Millisecond)
	defer cancel()

	stats, _ := organizer.Watch(ctx, WatchOptions{
		InitialRun: true,
		DryRun:     false,
	})

	if stats.Moved != 1 {
		t.Errorf("expected 1 file moved during initial run, got %d", stats.Moved)
	}

	// Verify file was moved to destDir
	expectedDest := filepath.Join(destDir, "initial.pdf")
	if _, err := os.Stat(expectedDest); err != nil {
		t.Errorf("file was not moved to destination: %v", err)
	}
}
