// SPDX-License-Identifier: AGPL-3.0-only

package history

import (
	"crypto/rand"
	"encoding/hex"
	"fmt"
	"time"
)

// RecordStatus represents whether a recorded move is currently active or has been undone.
type RecordStatus string

const (
	// StatusMoved indicates the file move was executed and has not been reversed.
	StatusMoved RecordStatus = "moved"
	// StatusUndone indicates the file move has been reversed by an undo operation.
	StatusUndone RecordStatus = "undone"
)

// Record represents a single file move event in history.
type Record struct {
	BatchID string       `json:"batch_id"`
	Time    time.Time    `json:"time"`
	Source  string       `json:"source"`
	Dest    string       `json:"dest"`
	Rule    string       `json:"rule"`
	Size    int64        `json:"size"`
	Status  RecordStatus `json:"status"`
}

// BatchSummary summarizes all moves within a specific batch.
type BatchSummary struct {
	ID        string    `json:"id"`
	Time      time.Time `json:"time"`
	Total     int       `json:"total"`
	Moved     int       `json:"moved"`
	Undone    int       `json:"undone"`
	AllUndone bool      `json:"all_undone"`
}

// GenerateBatchID creates a human-readable, unique batch identifier (e.g., 20261028-005030-a1b2).
func GenerateBatchID(t time.Time) string {
	bytes := make([]byte, 2)
	_, _ = rand.Read(bytes)
	suffix := hex.EncodeToString(bytes)
	return fmt.Sprintf("%s-%s", t.UTC().Format("20060102-150405"), suffix)
}
