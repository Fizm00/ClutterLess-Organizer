// SPDX-License-Identifier: AGPL-3.0-only

package app

import (
	"context"
	"os"
	"path/filepath"
	"testing"
	"time"

	"github.com/Fizm00/organizer/internal/history"
)

func TestHistoryService_BatchesAndBatch(t *testing.T) {
	tempDir := t.TempDir()
	histPath := filepath.Join(tempDir, "history.jsonl")
	storage, err := history.NewStorage(histPath)
	if err != nil {
		t.Fatalf("failed to init storage: %v", err)
	}

	b1 := "20261028-100000-0001"
	b2 := "20261028-100001-0002"

	recs := []history.Record{
		{BatchID: b1, Time: time.Now().Add(-10 * time.Minute), Source: "/src/f1.pdf", Dest: "/dst/f1.pdf", Rule: "Documents", Status: history.StatusMoved},
		{BatchID: b2, Time: time.Now(), Source: "/src/p1.jpg", Dest: "/dst/p1.jpg", Rule: "Images", Status: history.StatusMoved},
	}
	_ = storage.Append(recs)

	configPath := filepath.Join(tempDir, "config.yaml")
	cs, _ := NewConfigService(configPath, nil)
	defer cs.Close()

	hs := NewHistoryService(cs, storage, nil)

	// List all batches
	batches, err := hs.Batches(10, HistoryFilterDTO{})
	if err != nil || len(batches) != 2 {
		t.Fatalf("expected 2 batches, got %d, err=%v", len(batches), err)
	}

	// Filter by query
	filtered, err := hs.Batches(10, HistoryFilterDTO{Query: "pdf"})
	if err != nil || len(filtered) != 1 || filtered[0].ID != b1 {
		t.Errorf("expected 1 batch matching 'pdf' (b1), got %v", filtered)
	}

	// Batch detail
	detail, err := hs.Batch(b1)
	if err != nil || detail.Summary.ID != b1 || len(detail.Records) != 1 {
		t.Errorf("expected detail for b1 with 1 record, got %+v, err=%v", detail, err)
	}

	// Non-existent batch
	_, err = hs.Batch("non-existent-batch")
	if err == nil {
		t.Errorf("expected error for non-existent batch, got nil")
	}
	if appErr, ok := err.(*AppError); !ok || appErr.Code != ErrBatchNotFound {
		t.Errorf("expected ErrBatchNotFound, got %v", err)
	}
}

func TestHistoryService_UndoFlow(t *testing.T) {
	tempDir := t.TempDir()
	sourceDir := filepath.Join(tempDir, "source")
	destDir := filepath.Join(tempDir, "dest")
	_ = os.MkdirAll(sourceDir, 0755)
	_ = os.MkdirAll(destDir, 0755)

	destFile := filepath.Join(destDir, "image.png")
	origSource := filepath.Join(sourceDir, "image.png")
	_ = os.WriteFile(destFile, []byte("png image data"), 0644)

	bID := "batch-undo-test-1"
	histPath := filepath.Join(tempDir, "history.jsonl")
	storage, _ := history.NewStorage(histPath)
	_ = storage.Append([]history.Record{
		{BatchID: bID, Time: time.Now(), Source: origSource, Dest: destFile, Rule: "Images", Status: history.StatusMoved},
	})

	configPath := filepath.Join(tempDir, "config.yaml")
	cs, _ := NewConfigService(configPath, nil)
	defer cs.Close()

	sink := NewMemoryEventSink()
	hs := NewHistoryService(cs, storage, sink)

	// 1. Undo Preview (must not modify files)
	preview, err := hs.UndoPreview(bID)
	if err != nil {
		t.Fatalf("undo preview failed: %v", err)
	}
	if preview.Total != 1 || preview.MoveCount != 1 {
		t.Errorf("expected 1 move in preview, got total=%d, moves=%d", preview.Total, preview.MoveCount)
	}
	if _, err := os.Stat(destFile); os.IsNotExist(err) {
		t.Errorf("destFile was modified during preview!")
	}

	// 2. Real Undo with occupied source (new file placed at origSource)
	_ = os.WriteFile(origSource, []byte("new file occupant"), 0644)

	res, err := hs.Undo(context.Background(), bID)
	if err != nil {
		t.Fatalf("undo failed: %v", err)
	}
	if res.Restored != 1 {
		t.Errorf("expected 1 restored file, got %d", res.Restored)
	}

	// Since origSource was occupied, it must have restored safely using conflict rename (e.g. "image (1).png")
	expectedRestored := filepath.Join(sourceDir, "image (1).png")
	if _, err := os.Stat(expectedRestored); err != nil {
		t.Errorf("expected restored file %s to exist: %v", expectedRestored, err)
	}
	// Original occupant must remain intact!
	occupantBytes, _ := os.ReadFile(origSource)
	if string(occupantBytes) != "new file occupant" {
		t.Errorf("original file occupant was overwritten!")
	}

	// 3. Double Undo check
	res2, err := hs.Undo(context.Background(), bID)
	if err != nil {
		t.Fatalf("double undo returned error: %v", err)
	}
	if res2.Restored != 0 {
		t.Errorf("expected 0 restored on double undo, got %d", res2.Restored)
	}

	// 4. Missing destination file
	b2 := "batch-missing-dest"
	_ = storage.Append([]history.Record{
		{BatchID: b2, Time: time.Now(), Source: origSource, Dest: filepath.Join(destDir, "missing.txt"), Rule: "Text", Status: history.StatusMoved},
	})
	res3, err := hs.Undo(context.Background(), b2)
	if err != nil {
		t.Fatalf("undo missing dest failed: %v", err)
	}
	if res3.Skipped != 1 {
		t.Errorf("expected 1 skipped due to missing dest, got %d", res3.Skipped)
	}
}
