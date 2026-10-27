// SPDX-License-Identifier: AGPL-3.0-only

package history

import (
	"bufio"
	"encoding/json"
	"fmt"
	"log/slog"
	"os"
	"path/filepath"
	"strings"
	"sync"
)

// Storage manages persistent JSON Lines history of file moves.
// It assumes single-writer access, protected by an internal sync.Mutex.
type Storage struct {
	Path string
	mu   sync.Mutex
}

// DefaultHistoryPath returns the default location for history.jsonl:
// os.UserConfigDir()/organizer/history.jsonl.
func DefaultHistoryPath() (string, error) {
	configDir, err := os.UserConfigDir()
	if err != nil {
		return "", err
	}
	return filepath.Join(configDir, "organizer", "history.jsonl"), nil
}

// NewStorage initializes a new history Storage. If path is empty, DefaultHistoryPath is used.
func NewStorage(path string) (*Storage, error) {
	if path == "" {
		defaultPath, err := DefaultHistoryPath()
		if err != nil {
			return nil, fmt.Errorf("failed to determine default history path: %w", err)
		}
		path = defaultPath
	}
	return &Storage{Path: path}, nil
}

// Append writes a list of records to the JSON Lines file in a single append operation.
func (s *Storage) Append(records []Record) error {
	if len(records) == 0 {
		return nil
	}

	s.mu.Lock()
	defer s.mu.Unlock()

	// Ensure parent directory exists
	if err := os.MkdirAll(filepath.Dir(s.Path), 0755); err != nil {
		return fmt.Errorf("failed to create history directory: %w", err)
	}

	f, err := os.OpenFile(s.Path, os.O_CREATE|os.O_APPEND|os.O_WRONLY, 0600)
	if err != nil {
		return fmt.Errorf("failed to open history file for writing: %w", err)
	}
	defer f.Close()

	for _, rec := range records {
		data, err := json.Marshal(rec)
		if err != nil {
			return fmt.Errorf("failed to serialize history record: %w", err)
		}
		if _, err := f.Write(append(data, '\n')); err != nil {
			return fmt.Errorf("failed to write history record: %w", err)
		}
	}

	return f.Sync()
}

// ReadAll reads all valid records from the history file, skipping corrupted lines with a warning.
func (s *Storage) ReadAll() ([]Record, error) {
	s.mu.Lock()
	defer s.mu.Unlock()

	f, err := os.Open(s.Path)
	if err != nil {
		if os.IsNotExist(err) {
			return nil, nil
		}
		return nil, fmt.Errorf("failed to open history file: %w", err)
	}
	defer f.Close()

	var records []Record
	scanner := bufio.NewScanner(f)
	lineNum := 0

	for scanner.Scan() {
		lineNum++
		line := strings.TrimSpace(scanner.Text())
		if line == "" {
			continue
		}

		var rec Record
		if err := json.Unmarshal([]byte(line), &rec); err != nil {
			slog.Warn("skipping corrupted history line", "file", s.Path, "line", lineNum, "error", err)
			continue
		}
		records = append(records, rec)
	}

	if err := scanner.Err(); err != nil {
		return records, fmt.Errorf("error reading history file: %w", err)
	}

	return records, nil
}

// Batch returns all records belonging to a specific batch ID.
func (s *Storage) Batch(id string) ([]Record, error) {
	all, err := s.ReadAll()
	if err != nil {
		return nil, err
	}

	var batch []Record
	for _, rec := range all {
		if rec.BatchID == id {
			batch = append(batch, rec)
		}
	}
	return batch, nil
}

// Batches returns summaries of recent batches in reverse chronological order (newest first).
func (s *Storage) Batches(limit int) ([]BatchSummary, error) {
	all, err := s.ReadAll()
	if err != nil {
		return nil, err
	}

	// Group by batch ID while tracking order of appearance
	var batchIDs []string
	groups := make(map[string][]Record)

	for _, rec := range all {
		if _, exists := groups[rec.BatchID]; !exists {
			batchIDs = append(batchIDs, rec.BatchID)
		}
		groups[rec.BatchID] = append(groups[rec.BatchID], rec)
	}

	// Build summaries in reverse order (newest first)
	var summaries []BatchSummary
	for i := len(batchIDs) - 1; i >= 0; i-- {
		bID := batchIDs[i]
		recs := groups[bID]
		total := len(recs)
		moved := 0
		undone := 0
		for _, r := range recs {
			if r.Status == StatusMoved {
				moved++
			} else if r.Status == StatusUndone {
				undone++
			}
		}

		summaries = append(summaries, BatchSummary{
			ID:        bID,
			Time:      recs[0].Time,
			Total:     total,
			Moved:     moved,
			Undone:    undone,
			AllUndone: total > 0 && moved == 0,
		})

		if limit > 0 && len(summaries) >= limit {
			break
		}
	}

	return summaries, nil
}

// LastBatch returns the newest batch ID and its records.
func (s *Storage) LastBatch() (string, []Record, error) {
	all, err := s.ReadAll()
	if err != nil {
		return "", nil, err
	}
	if len(all) == 0 {
		return "", nil, nil
	}

	lastID := all[len(all)-1].BatchID
	var batch []Record
	for _, r := range all {
		if r.BatchID == lastID {
			batch = append(batch, r)
		}
	}
	return lastID, batch, nil
}

// LastActiveBatch returns the newest batch ID that has at least one record with StatusMoved.
func (s *Storage) LastActiveBatch() (string, []Record, error) {
	all, err := s.ReadAll()
	if err != nil {
		return "", nil, err
	}
	if len(all) == 0 {
		return "", nil, nil
	}

	// Scan backwards for the first batch with StatusMoved
	var targetBatchID string
	for i := len(all) - 1; i >= 0; i-- {
		if all[i].Status == StatusMoved {
			targetBatchID = all[i].BatchID
			break
		}
	}

	if targetBatchID == "" {
		return "", nil, nil
	}

	var batch []Record
	for _, r := range all {
		if r.BatchID == targetBatchID {
			batch = append(batch, r)
		}
	}
	return targetBatchID, batch, nil
}

// MarkUndone updates the status of the specified records in a batch to StatusUndone.
// If undoneDests is empty, all records in the batch are marked as undone.
// It rewrites the history file atomically using a temporary file.
func (s *Storage) MarkUndone(batchID string, undoneDests []string) error {
	s.mu.Lock()
	defer s.mu.Unlock()

	// Read all raw lines to preserve corrupt lines or rewrite cleanly
	all, err := s.readAllInternal()
	if err != nil {
		return err
	}

	undoneMap := make(map[string]bool)
	for _, dest := range undoneDests {
		undoneMap[dest] = true
	}

	// Update matching records
	for i := range all {
		if all[i].BatchID == batchID {
			if len(undoneDests) == 0 || undoneMap[all[i].Dest] {
				all[i].Status = StatusUndone
			}
		}
	}

	// Write atomically to temporary file
	tempPath := s.Path + ".tmp"
	f, err := os.OpenFile(tempPath, os.O_CREATE|os.O_TRUNC|os.O_WRONLY, 0600)
	if err != nil {
		return fmt.Errorf("failed to create temporary history file: %w", err)
	}

	for _, rec := range all {
		data, err := json.Marshal(rec)
		if err != nil {
			f.Close()
			_ = os.Remove(tempPath)
			return fmt.Errorf("failed to serialize history record during update: %w", err)
		}
		if _, err := f.Write(append(data, '\n')); err != nil {
			f.Close()
			_ = os.Remove(tempPath)
			return fmt.Errorf("failed to write to temporary history file: %w", err)
		}
	}

	if err := f.Sync(); err != nil {
		f.Close()
		_ = os.Remove(tempPath)
		return err
	}
	if err := f.Close(); err != nil {
		_ = os.Remove(tempPath)
		return err
	}

	// Replace original file
	return os.Rename(tempPath, s.Path)
}

// readAllInternal reads records without acquiring the lock (called from locked methods).
func (s *Storage) readAllInternal() ([]Record, error) {
	f, err := os.Open(s.Path)
	if err != nil {
		if os.IsNotExist(err) {
			return nil, nil
		}
		return nil, err
	}
	defer f.Close()

	var records []Record
	scanner := bufio.NewScanner(f)
	for scanner.Scan() {
		line := strings.TrimSpace(scanner.Text())
		if line == "" {
			continue
		}
		var rec Record
		if err := json.Unmarshal([]byte(line), &rec); err != nil {
			continue
		}
		records = append(records, rec)
	}
	return records, scanner.Err()
}
