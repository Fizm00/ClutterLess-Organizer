// SPDX-License-Identifier: AGPL-3.0-only

package app

import (
	"context"
	"crypto/rand"
	"encoding/hex"
	"fmt"
	"sync"
	"time"

	"github.com/Fizm00/organizer/internal/engine"
	"github.com/Fizm00/organizer/internal/history"
)

// OrganizeService coordinates plan preview, selective move execution, and progress reporting.
type OrganizeService struct {
	configService *ConfigService
	history       *history.Storage
	eventSink     EventSink
	mu            sync.RWMutex
	cachedPlans   map[string][]engine.PlannedMove
}

// NewOrganizeService creates a new OrganizeService instance.
func NewOrganizeService(cs *ConfigService, hist *history.Storage, sink EventSink) *OrganizeService {
	if sink == nil {
		sink = &NoopEventSink{}
	}
	return &OrganizeService{
		configService: cs,
		history:       hist,
		eventSink:     sink,
		cachedPlans:   make(map[string][]engine.PlannedMove),
	}
}

// generatePlanID generates a random unique plan identifier.
func generatePlanID() string {
	b := make([]byte, 4)
	_, _ = rand.Read(b)
	return fmt.Sprintf("plan-%s-%s", time.Now().UTC().Format("20060102150405"), hex.EncodeToString(b))
}

// Preview generates a read-only list of planned file moves without modifying the filesystem.
func (os *OrganizeService) Preview(opts PreviewOptionsDTO) (PlanDTO, error) {
	rawCfg := os.configService.GetConfig()
	organizer := engine.NewOrganizer(rawCfg)
	if os.history != nil {
		organizer.History = os.history
	}

	plans, err := organizer.Preview(opts.Dir, time.Now())
	if err != nil {
		return PlanDTO{}, NewAppError(ErrInternal, "Failed to generate preview", "", err.Error())
	}

	var items []PlanItemDTO
	moveCount := 0
	skipCount := 0

	for _, pm := range plans {
		item := PlanItemDTO{
			ID:       pm.ID,
			Source:   pm.Source,
			Dest:     pm.Dest,
			RuleName: pm.RuleName,
			Skipped:  pm.Skipped,
			Reason:   pm.Reason,
		}
		if pm.Skipped {
			skipCount++
		} else {
			moveCount++
		}
		items = append(items, item)
	}

	planID := generatePlanID()
	os.mu.Lock()
	os.cachedPlans[planID] = plans
	os.mu.Unlock()

	return PlanDTO{
		PlanID:    planID,
		Items:     items,
		Total:     len(items),
		MoveCount: moveCount,
		SkipCount: skipCount,
	}, nil
}

// Run executes the proposed organization moves, respecting selected IDs and reporting live progress.
func (os *OrganizeService) Run(ctx context.Context, req RunRequestDTO) (RunResultDTO, error) {
	rawCfg := os.configService.GetConfig()
	organizer := engine.NewOrganizer(rawCfg)
	if os.history != nil {
		organizer.History = os.history
	}

	var precomputedPlans []engine.PlannedMove
	if req.PlanID != "" {
		os.mu.RLock()
		if cached, ok := os.cachedPlans[req.PlanID]; ok {
			precomputedPlans = cached
		}
		os.mu.RUnlock()
	}

	opts := engine.RunOptions{
		Dir:         req.Dir,
		SelectedIDs: req.SelectedIDs,
		Plans:       precomputedPlans,
		ProgressFn: func(done, total int, res engine.MoveResult) {
			itemDTO := &MoveResultDTO{
				ID:       res.ID,
				Source:   res.Source,
				Dest:     res.Dest,
				Size:     res.Size,
				RuleName: res.RuleName,
				Skipped:  res.Skipped,
				Failed:   res.Failed,
				Reason:   res.Reason,
			}
			os.eventSink.Emit(EventRunProgress, RunProgressPayload{
				Done:  done,
				Total: total,
				Item:  itemDTO,
			})
			if res.Failed {
				os.eventSink.Emit(EventFileFailed, FileFailedPayload{
					Path:  res.Source,
					Error: res.Reason,
				})
			} else if res.Skipped {
				os.eventSink.Emit(EventFileSkipped, FileSkippedPayload{
					Path:   res.Source,
					Reason: res.Reason,
				})
			} else {
				os.eventSink.Emit(EventFileMoved, FileMovedPayload{
					Source: res.Source,
					Dest:   res.Dest,
					Rule:   res.RuleName,
					Size:   res.Size,
					Time:   time.Now().UTC().Format(time.RFC3339),
				})
			}
		},
	}

	res, err := organizer.Run(ctx, opts)
	if err != nil {
		if ctx.Err() != nil {
			return RunResultDTO{}, NewAppError(ErrOperationCancelled, "Operation cancelled by user", "", err.Error())
		}
		return RunResultDTO{}, NewAppError(ErrInternal, "Organization run failed", "", err.Error())
	}

	var moveDTOs []MoveResultDTO
	for _, m := range res.Moves {
		moveDTOs = append(moveDTOs, MoveResultDTO{
			ID:       m.ID,
			Source:   m.Source,
			Dest:     m.Dest,
			Size:     m.Size,
			RuleName: m.RuleName,
			Skipped:  m.Skipped,
			Failed:   m.Failed,
			Reason:   m.Reason,
		})
	}

	return RunResultDTO{
		BatchID:   res.BatchID,
		Moves:     moveDTOs,
		Moved:     res.Stats.Moved,
		Skipped:   res.Stats.Skipped,
		Failed:    res.Stats.Failed,
		Unmatched: res.Stats.Unmatched,
	}, nil
}
