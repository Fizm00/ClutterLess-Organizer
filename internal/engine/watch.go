// SPDX-License-Identifier: AGPL-3.0-only

package engine

import (
	"context"
	"fmt"
	"time"

	"github.com/Fizm00/organizer/internal/history"
	"github.com/Fizm00/organizer/internal/watcher"
)

// WatchOptions configures continuous watch mode.
type WatchOptions struct {
	InitialRun bool             // if true, organize existing files once before watching
	DryRun     bool             // if true, preview moves without moving files
	LogFn      func(MoveResult) // optional callback for logging processed files
}

// WatchStats tracks total moves during a watch session.
type WatchStats struct {
	Moved   int
	Skipped int
	Failed  int
}

// Watch continuously monitors directories and organizes files as they become stable.
func (o *Organizer) Watch(ctx context.Context, opts WatchOptions) (WatchStats, error) {
	rules, err := CompileRules(o.Config.Rules)
	if err != nil {
		return WatchStats{}, fmt.Errorf("failed to compile rules: %w", err)
	}

	excludedDirs := collectExcludedDestDirs(rules, o.Config.Settings.FallbackDir)
	var stats WatchStats

	// 1. Optional initial run for existing files
	if opts.InitialRun {
		runRes, err := o.Run(ctx, RunOptions{
			DryRun: opts.DryRun,
			Now:    time.Now(),
		})
		if err != nil && ctx.Err() != nil {
			return stats, err
		}
		stats.Moved += runRes.Stats.Moved
		stats.Skipped += runRes.Stats.Skipped + runRes.Stats.Unmatched
		stats.Failed += runRes.Stats.Failed
		if opts.LogFn != nil {
			for _, m := range runRes.Moves {
				opts.LogFn(m)
			}
		}
	}

	// 2. Initialize fsnotify watcher
	w, err := watcher.NewWatcher(o.Config.Watch, o.Config.Settings, excludedDirs)
	if err != nil {
		return stats, fmt.Errorf("failed to initialize watcher: %w", err)
	}
	defer w.Close()

	if err := w.Start(ctx); err != nil {
		return stats, fmt.Errorf("failed to start watcher: %w", err)
	}

	// Batch grouping: group files arriving within a 5-second window into the same batch ID
	var currentBatchID string
	var lastMoveTime time.Time
	batchIdleWindow := 5 * time.Second

	// 3. Single worker processing stabilized files from ReadyFiles channel
	for {
		select {
		case <-ctx.Done():
			return stats, ctx.Err()

		case filePath, ok := <-w.ReadyFiles:
			if !ok {
				return stats, nil
			}

			// Plan file
			pm, err := PlanFile(filePath, rules, o.Config.Settings, time.Now())
			if err != nil {
				stats.Failed++
				if opts.LogFn != nil {
					opts.LogFn(MoveResult{Source: filePath, Failed: true, Reason: err.Error(), Error: err})
				}
				continue
			}

			if pm.Skipped {
				stats.Skipped++
				if opts.LogFn != nil {
					opts.LogFn(MoveResult{Source: pm.Source, Skipped: true, Reason: pm.Reason})
				}
				continue
			}

			// Execute move
			if opts.DryRun {
				stats.Moved++
				if opts.LogFn != nil {
					opts.LogFn(MoveResult{
						Source:   pm.Source,
						Dest:     pm.Dest,
						RuleName: pm.RuleName,
						Reason:   "preview",
					})
				}
				continue
			}

			res, err := o.Mover.Move(ctx, pm)
			if err != nil || res.Failed {
				stats.Failed++
				if opts.LogFn != nil {
					opts.LogFn(res)
				}
				continue
			}

			stats.Moved++
			if opts.LogFn != nil {
				opts.LogFn(res)
			}

			// Group into batch: if within idle window, reuse batch ID; otherwise generate a new one
			now := time.Now()
			if currentBatchID == "" || now.Sub(lastMoveTime) > batchIdleWindow {
				currentBatchID = history.GenerateBatchID(now)
			}
			lastMoveTime = now

			if o.History != nil {
				rec := history.Record{
					BatchID: currentBatchID,
					Time:    now.UTC(),
					Source:  res.Source,
					Dest:    res.Dest,
					Rule:    res.RuleName,
					Size:    res.Size,
					Status:  history.StatusMoved,
				}
				_ = o.History.Append([]history.Record{rec})
			}
		}
	}
}
