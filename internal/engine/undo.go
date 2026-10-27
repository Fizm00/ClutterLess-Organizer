// SPDX-License-Identifier: AGPL-3.0-only

package engine

import (
	"context"
	"fmt"
	"os"
	"path/filepath"

	"github.com/Fizm00/organizer/internal/history"
)

// UndoMoveResult contains the result of undoing a single file move.
type UndoMoveResult struct {
	OriginalSource string // Where the file was originally located
	CurrentDest    string // Where the file currently is located
	RestoredTo     string // Where the file was restored (may differ if conflict renamed)
	Skipped        bool
	Failed         bool
	Reason         string
	Error          error
}

// UndoResult summarizes the overall result of an undo batch operation.
type UndoResult struct {
	BatchID  string
	Moves    []UndoMoveResult
	Restored int
	Skipped  int
	Failed   int
	Message  string
}

// Undo reverses moves performed in a batch. If batchID is empty, the latest active batch is undone.
func (o *Organizer) Undo(ctx context.Context, batchID string, dryRun bool) (UndoResult, error) {
	if o.History == nil {
		return UndoResult{}, fmt.Errorf("history storage is not configured")
	}

	var records []history.Record
	var err error

	if batchID == "" {
		batchID, records, err = o.History.LastActiveBatch()
		if err != nil {
			return UndoResult{}, fmt.Errorf("failed to retrieve last active batch: %w", err)
		}
		if batchID == "" || len(records) == 0 {
			return UndoResult{
				Message: "no active batches found to undo",
			}, nil
		}
	} else {
		records, err = o.History.Batch(batchID)
		if err != nil {
			return UndoResult{}, fmt.Errorf("failed to retrieve batch %q: %w", batchID, err)
		}
		if len(records) == 0 {
			return UndoResult{
				BatchID: batchID,
				Message: fmt.Sprintf("batch %q not found in history", batchID),
			}, nil
		}
	}

	// Check if all records in this batch are already undone
	activeCount := 0
	for _, r := range records {
		if r.Status == history.StatusMoved {
			activeCount++
		}
	}
	if activeCount == 0 {
		return UndoResult{
			BatchID: batchID,
			Message: fmt.Sprintf("batch %q has already been completely undone", batchID),
		}, nil
	}

	result := UndoResult{
		BatchID: batchID,
	}

	destExists := func(p string) bool {
		_, err := os.Stat(p)
		return err == nil
	}

	var undoneDests []string

	// Process records in reverse order
	for i := len(records) - 1; i >= 0; i-- {
		rec := records[i]
		if rec.Status != history.StatusMoved {
			continue
		}

		if err := ctx.Err(); err != nil {
			return result, err
		}

		// 1. Check if current file at Dest exists
		if _, err := os.Stat(rec.Dest); os.IsNotExist(err) {
			result.Moves = append(result.Moves, UndoMoveResult{
				OriginalSource: rec.Source,
				CurrentDest:    rec.Dest,
				RestoredTo:     "",
				Skipped:        true,
				Reason:         "destination file no longer exists",
			})
			result.Skipped++
			continue
		}

		// 2. Ensure parent directory of original source exists
		srcDir := filepath.Dir(rec.Source)
		if !dryRun {
			if err := os.MkdirAll(srcDir, 0755); err != nil {
				result.Moves = append(result.Moves, UndoMoveResult{
					OriginalSource: rec.Source,
					CurrentDest:    rec.Dest,
					Failed:         true,
					Reason:         fmt.Sprintf("failed to recreate source directory: %v", err),
					Error:          err,
				})
				result.Failed++
				continue
			}
		}

		// 3. Resolve destination path if original Source is already occupied by another file
		targetPath := rec.Source
		if destExists(targetPath) {
			targetPath = ResolveConflictDest(targetPath, destExists)
		}

		// 4. Dry-run mode: record plan without executing move
		if dryRun {
			result.Moves = append(result.Moves, UndoMoveResult{
				OriginalSource: rec.Source,
				CurrentDest:    rec.Dest,
				RestoredTo:     targetPath,
				Skipped:        false,
				Reason:         "preview restore",
			})
			result.Restored++
			continue
		}

		// 5. Execute move using Mover
		pm := PlannedMove{
			Source:   rec.Dest,
			Dest:     targetPath,
			RuleName: "undo",
			Skipped:  false,
		}

		moveRes, err := o.Mover.Move(ctx, pm)
		if err != nil || moveRes.Failed {
			errMsg := "move failed"
			if moveRes.Reason != "" {
				errMsg = moveRes.Reason
			} else if err != nil {
				errMsg = err.Error()
			}
			result.Moves = append(result.Moves, UndoMoveResult{
				OriginalSource: rec.Source,
				CurrentDest:    rec.Dest,
				RestoredTo:     targetPath,
				Failed:         true,
				Reason:         errMsg,
				Error:          err,
			})
			result.Failed++
		} else {
			result.Moves = append(result.Moves, UndoMoveResult{
				OriginalSource: rec.Source,
				CurrentDest:    rec.Dest,
				RestoredTo:     moveRes.Dest,
				Skipped:        false,
				Reason:         "restored",
			})
			result.Restored++
			undoneDests = append(undoneDests, rec.Dest)
		}
	}

	// 6. Mark successful records as undone in history storage
	if !dryRun && len(undoneDests) > 0 {
		if err := o.History.MarkUndone(batchID, undoneDests); err != nil {
			return result, fmt.Errorf("failed to update history status to undone: %w", err)
		}
	}

	return result, nil
}
