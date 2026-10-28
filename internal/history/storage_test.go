// SPDX-License-Identifier: AGPL-3.0-only

package history

import (
	"os"
	"path/filepath"
	"testing"
	"time"
)

func TestStorage_AppendAndReadAll(t *testing.T) {
	tempDir := t.TempDir()
	histFile := filepath.Join(tempDir, "history.jsonl")

	storage, err := NewStorage(histFile)
	if err != nil {
		t.Fatalf("failed to create storage: %v", err)
	}

	now := time.Date(2026, 10, 28, 1, 0, 0, 0, time.UTC)
	batchID := GenerateBatchID(now)

	records := []Record{
		{
			BatchID: batchID,
			Time:    now,
			Source:  filepath.Join(tempDir, "a.pdf"),
			Dest:    filepath.Join(tempDir, "Docs", "a.pdf"),
			Rule:    "Documents",
			Size:    1024,
			Status:  StatusMoved,
		},
		{
			BatchID: batchID,
			Time:    now,
			Source:  filepath.Join(tempDir, "b.jpg"),
			Dest:    filepath.Join(tempDir, "Images", "b.jpg"),
			Rule:    "Images",
			Size:    2048,
			Status:  StatusMoved,
		},
	}

	if err := storage.Append(records); err != nil {
		t.Fatalf("unexpected append error: %v", err)
	}

	read, err := storage.ReadAll()
	if err != nil {
		t.Fatalf("unexpected read error: %v", err)
	}

	if len(read) != 2 {
		t.Fatalf("expected 2 records, got %d", len(read))
	}

	if read[0].BatchID != batchID || read[0].Status != StatusMoved {
		t.Errorf("record 0 mismatch: %+v", read[0])
	}
	if read[1].Dest != records[1].Dest || read[1].Size != 2048 {
		t.Errorf("record 1 mismatch: %+v", read[1])
	}
}

func TestStorage_CorruptedLines(t *testing.T) {
	tempDir := t.TempDir()
	histFile := filepath.Join(tempDir, "history.jsonl")

	storage, err := NewStorage(histFile)
	if err != nil {
		t.Fatalf("failed to create storage: %v", err)
	}

	now := time.Now().UTC()
	b1 := GenerateBatchID(now)

	// Append one good record
	_ = storage.Append([]Record{
		{BatchID: b1, Time: now, Source: "s1", Dest: "d1", Status: StatusMoved},
	})

	// Manually inject invalid/corrupted lines directly to file
	corruptData := "\n{invalid json line\n{\"broken\": true\n\n"
	f, _ := os.OpenFile(histFile, os.O_APPEND|os.O_WRONLY, 0600)
	_, _ = f.WriteString(corruptData)
	_ = f.Close()

	// Append second good record
	_ = storage.Append([]Record{
		{BatchID: b1, Time: now, Source: "s2", Dest: "d2", Status: StatusMoved},
	})

	// ReadAll should skip corrupted lines without failing
	records, err := storage.ReadAll()
	if err != nil {
		t.Fatalf("ReadAll should not fail on corrupted lines: %v", err)
	}

	if len(records) != 2 {
		t.Fatalf("expected 2 valid records, got %d", len(records))
	}
	if records[0].Source != "s1" || records[1].Source != "s2" {
		t.Errorf("unexpected records parsed: %+v", records)
	}
}

func TestStorage_BatchesAndMarkUndone(t *testing.T) {
	tempDir := t.TempDir()
	histFile := filepath.Join(tempDir, "history.jsonl")

	storage, _ := NewStorage(histFile)
	now := time.Now().UTC()

	b1 := "batch-01"
	b2 := "batch-02"

	_ = storage.Append([]Record{
		{BatchID: b1, Time: now, Source: "s1", Dest: "d1", Status: StatusMoved},
	})
	_ = storage.Append([]Record{
		{BatchID: b2, Time: now.Add(time.Minute), Source: "s2", Dest: "d2", Status: StatusMoved},
	})

	// Check Batches summary
	summaries, err := storage.Batches(10)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if len(summaries) != 2 {
		t.Fatalf("expected 2 summaries, got %d", len(summaries))
	}
	// b2 should be first (newest)
	if summaries[0].ID != b2 || summaries[1].ID != b1 {
		t.Errorf("expected newest batch first, got %s, %s", summaries[0].ID, summaries[1].ID)
	}

	// LastActiveBatch should return b2
	lastID, recs, err := storage.LastActiveBatch()
	if err != nil || lastID != b2 || len(recs) != 1 {
		t.Fatalf("expected LastActiveBatch to be %s, got %s, %v", b2, lastID, err)
	}

	// Mark b2 as undone
	if err := storage.MarkUndone(b2, nil); err != nil {
		t.Fatalf("failed to mark undone: %v", err)
	}

	// Now LastActiveBatch should return b1!
	activeID, _, _ := storage.LastActiveBatch()
	if activeID != b1 {
		t.Errorf("expected active batch to be %s, got %s", b1, activeID)
	}

	// Double MarkUndone on b2 should be safe
	if err := storage.MarkUndone(b2, nil); err != nil {
		t.Errorf("double MarkUndone failed: %v", err)
	}
}

func TestStorage_BatchesFiltered(t *testing.T) {
	tempDir := t.TempDir()
	histPath := filepath.Join(tempDir, "history.jsonl")
	storage, err := NewStorage(histPath)
	if err != nil {
		t.Fatalf("failed to create storage: %v", err)
	}

	b1 := "20261028-100000-0001"
	b2 := "20261028-100001-0002"

	recs := []Record{
		{BatchID: b1, Time: time.Now().Add(-10 * time.Minute), Source: "/tmp/doc.pdf", Dest: "/tmp/docs/doc.pdf", Rule: "Documents", Status: StatusMoved},
		{BatchID: b2, Time: time.Now(), Source: "/tmp/pic.jpg", Dest: "/tmp/pics/pic.jpg", Rule: "Images", Status: StatusMoved},
	}
	if err := storage.Append(recs); err != nil {
		t.Fatalf("failed to append: %v", err)
	}

	// Filter by query "doc"
	docSummaries, err := storage.BatchesFiltered(10, HistoryFilter{Query: "doc"})
	if err != nil || len(docSummaries) != 1 || docSummaries[0].ID != b1 {
		t.Errorf("expected 1 summary matching 'doc' (b1), got %v", docSummaries)
	}

	// Mark b1 as undone
	_ = storage.MarkUndone(b1, nil)

	// Filter by status "active"
	activeSummaries, err := storage.BatchesFiltered(10, HistoryFilter{Status: "active"})
	if err != nil || len(activeSummaries) != 1 || activeSummaries[0].ID != b2 {
		t.Errorf("expected only active batch b2, got %v", activeSummaries)
	}

	// Filter by status "undone"
	undoneSummaries, err := storage.BatchesFiltered(10, HistoryFilter{Status: "undone"})
	if err != nil || len(undoneSummaries) != 1 || undoneSummaries[0].ID != b1 {
		t.Errorf("expected only undone batch b1, got %v", undoneSummaries)
	}
}
