// SPDX-License-Identifier: AGPL-3.0-only

package app

import (
	"context"
	"fmt"
	"time"

	"github.com/Fizm00/organizer/internal/engine"
	"github.com/Fizm00/organizer/internal/history"
)

// HistoryService provides operations to query past move batches and perform undo operations.
type HistoryService struct {
	configService *ConfigService
	history       *history.Storage
	eventSink     EventSink
}

// NewHistoryService creates a new HistoryService connected to the history storage.
func NewHistoryService(cs *ConfigService, hist *history.Storage, sink EventSink) *HistoryService {
	if sink == nil {
		sink = &NoopEventSink{}
	}
	return &HistoryService{
		configService: cs,
		history:       hist,
		eventSink:     sink,
	}
}

// Batches returns a list of batch summaries filtered by the specified criteria.
func (hs *HistoryService) Batches(limit int, filter HistoryFilterDTO) ([]BatchSummaryDTO, error) {
	if hs.history == nil {
		return nil, NewAppError(ErrInternal, "History storage is not available", "", "")
	}

	var sinceTime time.Time
	if filter.Since != "" {
		if t, err := time.Parse(time.RFC3339, filter.Since); err == nil {
			sinceTime = t
		}
	}

	var untilTime time.Time
	if filter.Until != "" {
		if t, err := time.Parse(time.RFC3339, filter.Until); err == nil {
			untilTime = t
		}
	}

	histFilter := history.HistoryFilter{
		Query:  filter.Query,
		Status: filter.Status,
		Since:  sinceTime,
		Until:  untilTime,
	}

	summaries, err := hs.history.BatchesFiltered(limit, histFilter)
	if err != nil {
		return nil, NewAppError(ErrInternal, "Failed to retrieve batches", "", err.Error())
	}

	var dtos []BatchSummaryDTO
	for _, s := range summaries {
		dtos = append(dtos, BatchSummaryDTO{
			ID:        s.ID,
			Time:      s.Time.UTC().Format(time.RFC3339),
			Total:     s.Total,
			Moved:     s.Moved,
			Undone:    s.Undone,
			AllUndone: s.AllUndone,
		})
	}
	return dtos, nil
}

// Batch retrieves full details and individual records for a given batch ID.
func (hs *HistoryService) Batch(id string) (BatchDetailDTO, error) {
	if hs.history == nil {
		return BatchDetailDTO{}, NewAppError(ErrInternal, "History storage is not available", "", "")
	}

	records, err := hs.history.Batch(id)
	if err != nil {
		return BatchDetailDTO{}, NewAppError(ErrInternal, "Failed to load batch records", "", err.Error())
	}
	if len(records) == 0 {
		return BatchDetailDTO{}, NewAppError(ErrBatchNotFound, "Batch not found in history", "Verify the batch ID", id)
	}

	var recordDTOs []RecordDTO
	total := len(records)
	moved := 0
	undone := 0

	for _, r := range records {
		if r.Status == history.StatusMoved {
			moved++
		} else if r.Status == history.StatusUndone {
			undone++
		}
		recordDTOs = append(recordDTOs, RecordDTO{
			BatchID: r.BatchID,
			Time:    r.Time.UTC().Format(time.RFC3339),
			Source:  r.Source,
			Dest:    r.Dest,
			Rule:    r.Rule,
			Size:    r.Size,
			Status:  string(r.Status),
		})
	}

	summary := BatchSummaryDTO{
		ID:        id,
		Time:      records[0].Time.UTC().Format(time.RFC3339),
		Total:     total,
		Moved:     moved,
		Undone:    undone,
		AllUndone: total > 0 && moved == 0,
	}

	return BatchDetailDTO{
		Summary: summary,
		Records: recordDTOs,
	}, nil
}

// UndoPreview computes the intended restorations for a batch without modifying the filesystem.
func (hs *HistoryService) UndoPreview(id string) (PlanDTO, error) {
	rawCfg := hs.configService.GetConfig()
	organizer := engine.NewOrganizer(rawCfg)
	organizer.History = hs.history

	undoRes, err := organizer.Undo(context.Background(), id, true)
	if err != nil {
		return PlanDTO{}, NewAppError(ErrInternal, "Failed to generate undo preview", "", err.Error())
	}

	var items []PlanItemDTO
	moveCount := 0
	skipCount := 0

	for i, m := range undoRes.Moves {
		pmID := fmt.Sprintf("undo-%s-%d", id, i)
		item := PlanItemDTO{
			ID:       pmID,
			Source:   m.CurrentDest,
			Dest:     m.RestoredTo,
			RuleName: "undo",
			Skipped:  m.Skipped,
			Reason:   m.Reason,
		}
		if m.Skipped || m.Failed {
			skipCount++
		} else {
			moveCount++
		}
		items = append(items, item)
	}

	return PlanDTO{
		PlanID:    fmt.Sprintf("undo-preview-%s", id),
		Items:     items,
		Total:     len(items),
		MoveCount: moveCount,
		SkipCount: skipCount,
	}, nil
}

// Undo reverses moves previously executed in a batch.
func (hs *HistoryService) Undo(ctx context.Context, id string) (UndoResultDTO, error) {
	rawCfg := hs.configService.GetConfig()
	organizer := engine.NewOrganizer(rawCfg)
	organizer.History = hs.history

	res, err := organizer.Undo(ctx, id, false)
	if err != nil {
		if ctx.Err() != nil {
			return UndoResultDTO{}, NewAppError(ErrOperationCancelled, "Undo operation cancelled", "", err.Error())
		}
		return UndoResultDTO{}, NewAppError(ErrInternal, "Undo operation failed", "", err.Error())
	}

	var moveDTOs []UndoMoveResultDTO
	for _, m := range res.Moves {
		moveDTOs = append(moveDTOs, UndoMoveResultDTO{
			OriginalSource: m.OriginalSource,
			CurrentDest:    m.CurrentDest,
			RestoredTo:     m.RestoredTo,
			Skipped:        m.Skipped,
			Failed:         m.Failed,
			Reason:         m.Reason,
		})

		if m.Failed {
			hs.eventSink.Emit(EventFileFailed, FileFailedPayload{
				Path:  m.CurrentDest,
				Error: m.Reason,
			})
		} else if m.Skipped {
			hs.eventSink.Emit(EventFileSkipped, FileSkippedPayload{
				Path:   m.CurrentDest,
				Reason: m.Reason,
			})
		} else {
			hs.eventSink.Emit(EventFileMoved, FileMovedPayload{
				Source: m.CurrentDest,
				Dest:   m.RestoredTo,
				Rule:   "undo",
				Time:   time.Now().UTC().Format(time.RFC3339),
			})
		}
	}

	return UndoResultDTO{
		BatchID:  res.BatchID,
		Moves:    moveDTOs,
		Restored: res.Restored,
		Skipped:  res.Skipped,
		Failed:   res.Failed,
		Message:  res.Message,
	}, nil
}
