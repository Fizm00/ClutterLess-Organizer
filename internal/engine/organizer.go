// SPDX-License-Identifier: AGPL-3.0-only

package engine

import (
	"context"
	"fmt"
	"io/fs"
	"os"
	"path/filepath"
	"strings"
	"time"

	"github.com/Fizm00/organizer/internal/config"
	"github.com/Fizm00/organizer/internal/history"
)

// RunOptions configures an Organizer execution run.
type RunOptions struct {
	Dir         string                                // optional directory override (overrides config watch paths)
	DryRun      bool                                  // if true, only preview planned moves without touching filesystem
	Now         time.Time                             // clock injection for deterministic testing (zero value = time.Now())
	SelectedIDs []string                              // optional list of planned move IDs to execute (if empty/nil, execute all)
	Plans       []PlannedMove                         // optional pre-computed planned moves (e.g. from Preview); skips re-scanning if provided
	ProgressFn  func(done, total int, res MoveResult) // optional progress callback invoked after each planned move
}

// RunStats summarizes the counts of an Organizer execution.
type RunStats struct {
	Moved     int
	Skipped   int
	Unmatched int
	Failed    int
}

// RunResult contains the complete list of move results, batch ID, and overall counts.
type RunResult struct {
	BatchID string
	Moves   []MoveResult
	Stats   RunStats
}

// Organizer coordinates planning, execution, history recording, and undo of file organization.
type Organizer struct {
	Config  *config.Config
	Mover   *Mover
	History *history.Storage
}

// NewOrganizer creates an Organizer with the provided configuration and default history storage.
func NewOrganizer(cfg *config.Config) *Organizer {
	hist, _ := history.NewStorage("")
	return &Organizer{
		Config:  cfg,
		Mover:   NewMover(cfg.Settings.Conflict),
		History: hist,
	}
}

// isSubDir checks if child is a subpath of parent (or identical).
func isSubDir(parent, child string) bool {
	rel, err := filepath.Rel(parent, child)
	if err != nil {
		return false
	}
	return !strings.HasPrefix(rel, "..") && rel != ".."
}

// collectExcludedDestDirs gathers all destination folders from rules to prevent recursive scan loops.
func collectExcludedDestDirs(rules []Rule, fallbackDir string) []string {
	var destDirs []string
	for _, r := range rules {
		// Clean template string base dir before variables
		base := r.MoveTo
		if idx := strings.Index(base, "{"); idx != -1 {
			base = base[:idx]
		}
		if base != "" {
			expanded := config.ExpandPath(base)
			destDirs = append(destDirs, expanded)
		}
	}
	if strings.TrimSpace(fallbackDir) != "" {
		destDirs = append(destDirs, config.ExpandPath(fallbackDir))
	}
	return destDirs
}

// Run executes organization across watched directories or the specified directory override.
func (o *Organizer) Run(ctx context.Context, opts RunOptions) (RunResult, error) {
	now := opts.Now
	if now.IsZero() {
		now = time.Now()
	}

	rules, err := CompileRules(o.Config.Rules)
	if err != nil {
		return RunResult{}, fmt.Errorf("failed to compile rules: %w", err)
	}

	excludedDirs := collectExcludedDestDirs(rules, o.Config.Settings.FallbackDir)

	var allPlans []PlannedMove

	// Determine directories to scan (or use pre-computed plans if supplied)
	if len(opts.Plans) > 0 {
		allPlans = append(allPlans, opts.Plans...)
	} else if opts.Dir != "" {
		expandedDir := config.ExpandPath(opts.Dir)
		plans, err := Plan(expandedDir, rules, o.Config.Settings, now)
		if err != nil {
			return RunResult{}, err
		}
		allPlans = append(allPlans, plans...)
	} else {
		for _, w := range o.Config.Watch {
			watchPath := config.ExpandPath(w.Path)
			if _, err := os.Stat(watchPath); err != nil {
				// Watch folder does not exist; skip
				continue
			}

			if !w.Recursive {
				plans, err := Plan(watchPath, rules, o.Config.Settings, now)
				if err != nil {
					return RunResult{}, err
				}
				allPlans = append(allPlans, plans...)
			} else {
				// Recursive scanning with loop prevention
				err := filepath.WalkDir(watchPath, func(path string, d fs.DirEntry, walkErr error) error {
					if walkErr != nil {
						return walkErr
					}
					if d.IsDir() {
						// Exclude destinations from scanning
						for _, excl := range excludedDirs {
							if isSubDir(excl, path) {
								return filepath.SkipDir
							}
						}
						return nil
					}

					// Plan single file
					pm, planErr := PlanFile(path, rules, o.Config.Settings, now)
					if planErr != nil {
						return planErr
					}
					allPlans = append(allPlans, pm)
					return nil
				})
				if err != nil {
					return RunResult{}, fmt.Errorf("recursive scan failed on %q: %w", watchPath, err)
				}
			}
		}
	}

	var results []MoveResult
	var stats RunStats

	// Filter by SelectedIDs if specified
	if len(opts.SelectedIDs) > 0 {
		selectedMap := make(map[string]bool, len(opts.SelectedIDs))
		for _, id := range opts.SelectedIDs {
			selectedMap[id] = true
		}
		var filtered []PlannedMove
		for _, pm := range allPlans {
			if selectedMap[pm.ID] {
				filtered = append(filtered, pm)
			}
		}
		allPlans = filtered
	}

	// Dry run mode: calculate counts without executing any move and without writing history
	if opts.DryRun {
		for _, pm := range allPlans {
			res := MoveResult{
				ID:       pm.ID,
				Source:   pm.Source,
				Dest:     pm.Dest,
				RuleName: pm.RuleName,
				Skipped:  pm.Skipped,
				Reason:   pm.Reason,
			}
			if pm.Skipped {
				if pm.Reason == "unmatched" {
					stats.Unmatched++
				} else {
					stats.Skipped++
				}
			} else {
				stats.Moved++
			}
			results = append(results, res)
			if opts.ProgressFn != nil {
				opts.ProgressFn(len(results), len(allPlans), res)
			}
		}
		return RunResult{Moves: results, Stats: stats}, nil
	}

	// Real execution mode: execute each move sequentially
	batchID := history.GenerateBatchID(now)
	var historyRecords []history.Record

	for _, pm := range allPlans {
		if err := ctx.Err(); err != nil {
			return RunResult{BatchID: batchID, Moves: results, Stats: stats}, err
		}

		// Re-validate source existence before moving (file may have changed since preview)
		if !pm.Skipped {
			if _, statErr := os.Stat(pm.Source); statErr != nil {
				res := MoveResult{
					ID:       pm.ID,
					Source:   pm.Source,
					Dest:     pm.Dest,
					RuleName: pm.RuleName,
					Failed:   true,
					Reason:   fmt.Sprintf("source file changed or inaccessible before move: %v", statErr),
					Error:    statErr,
				}
				stats.Failed++
				results = append(results, res)
				if opts.ProgressFn != nil {
					opts.ProgressFn(len(results), len(allPlans), res)
				}
				continue
			}
		}

		res, err := o.Mover.Move(ctx, pm)
		if err != nil {
			res.Failed = true
			res.Error = err
			res.Reason = err.Error()
		}

		if res.Failed {
			stats.Failed++
		} else if res.Skipped {
			if res.Reason == "unmatched" {
				stats.Unmatched++
			} else {
				stats.Skipped++
			}
		} else {
			stats.Moved++
			// Record real move into batch
			historyRecords = append(historyRecords, history.Record{
				BatchID: batchID,
				Time:    now.UTC(),
				Source:  res.Source,
				Dest:    res.Dest,
				Rule:    res.RuleName,
				Size:    res.Size,
				Status:  history.StatusMoved,
			})
		}

		results = append(results, res)
		if opts.ProgressFn != nil {
			opts.ProgressFn(len(results), len(allPlans), res)
		}
	}

	// Persist history if any real moves were performed
	if len(historyRecords) > 0 && o.History != nil {
		if err := o.History.Append(historyRecords); err != nil {
			return RunResult{BatchID: batchID, Moves: results, Stats: stats}, fmt.Errorf("failed to save history: %w", err)
		}
	}

	return RunResult{BatchID: batchID, Moves: results, Stats: stats}, nil
}

// Preview returns the PlannedMoves for the configured watch paths or directory override without touching anything.
func (o *Organizer) Preview(dir string, now time.Time) ([]PlannedMove, error) {
	if now.IsZero() {
		now = time.Now()
	}
	rules, err := CompileRules(o.Config.Rules)
	if err != nil {
		return nil, fmt.Errorf("failed to compile rules: %w", err)
	}

	if dir != "" {
		expanded := config.ExpandPath(dir)
		return Plan(expanded, rules, o.Config.Settings, now)
	}

	var allPlans []PlannedMove
	excludedDirs := collectExcludedDestDirs(rules, o.Config.Settings.FallbackDir)

	for _, w := range o.Config.Watch {
		watchPath := config.ExpandPath(w.Path)
		if _, err := os.Stat(watchPath); err != nil {
			continue
		}
		if !w.Recursive {
			plans, err := Plan(watchPath, rules, o.Config.Settings, now)
			if err != nil {
				return nil, err
			}
			allPlans = append(allPlans, plans...)
		} else {
			err := filepath.WalkDir(watchPath, func(path string, d fs.DirEntry, walkErr error) error {
				if walkErr != nil {
					return walkErr
				}
				if d.IsDir() {
					for _, excl := range excludedDirs {
						if isSubDir(excl, path) {
							return filepath.SkipDir
						}
					}
					return nil
				}
				pm, planErr := PlanFile(path, rules, o.Config.Settings, now)
				if planErr != nil {
					return planErr
				}
				allPlans = append(allPlans, pm)
				return nil
			})
			if err != nil {
				return nil, fmt.Errorf("recursive scan failed on %q: %w", watchPath, err)
			}
		}
	}
	return allPlans, nil
}

// TestMatch checks if a virtual file matches any compiled rule and returns the match details.
func TestMatch(fileName string, size int64, modTime time.Time, rules []Rule, now time.Time) (bool, string, string) {
	if now.IsZero() {
		now = time.Now()
	}
	if modTime.IsZero() {
		modTime = now
	}
	fi := FileInfo{
		Path:    fileName,
		Name:    fileName,
		Size:    size,
		ModTime: modTime,
		IsDir:   false,
	}
	rule := MatchFirst(fi, rules, now)
	if rule != nil {
		destDir, err := RenderMoveTo(rule.MoveTo, fileName, modTime)
		if err != nil {
			return true, rule.Name, fmt.Sprintf("matched %q (destination render error: %v)", rule.Name, err)
		}
		return true, rule.Name, filepath.Join(destDir, fileName)
	}
	return false, "", "unmatched"
}
