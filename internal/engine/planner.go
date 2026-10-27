// SPDX-License-Identifier: AGPL-3.0-only

package engine

import (
	"fmt"
	"os"
	"path/filepath"
	"strings"
	"time"

	"github.com/Fizm00/organizer/internal/config"
)

// ShouldIgnoreFile checks whether a file should be ignored based on global settings.
func ShouldIgnoreFile(filePath string, fileName string, settings config.Settings) (bool, string) {
	return config.ShouldIgnoreFile(filePath, fileName, settings)
}

// PlanFile calculates the PlannedMove for a single file without modifying anything on disk.
func PlanFile(filePath string, rules []Rule, settings config.Settings, now time.Time) (PlannedMove, error) {
	absPath, err := filepath.Abs(filePath)
	if err != nil {
		absPath = filePath
	}

	info, err := os.Stat(absPath)
	if err != nil {
		return PlannedMove{}, fmt.Errorf("failed to inspect file %q: %w", filePath, err)
	}

	if info.IsDir() {
		return PlannedMove{
			Source:  absPath,
			Skipped: true,
			Reason:  "directories are ignored",
		}, nil
	}

	fileName := info.Name()

	// Check ignore filters
	if ignored, reason := ShouldIgnoreFile(absPath, fileName, settings); ignored {
		return PlannedMove{
			Source:  absPath,
			Skipped: true,
			Reason:  reason,
		}, nil
	}

	fi := FileInfo{
		Path:    absPath,
		Name:    fileName,
		Size:    info.Size(),
		ModTime: info.ModTime(),
		IsDir:   false,
	}

	rule := MatchFirst(fi, rules, now)
	if rule != nil {
		destDir, err := RenderMoveTo(rule.MoveTo, fileName, info.ModTime())
		if err != nil {
			return PlannedMove{}, fmt.Errorf("failed to render destination for %q: %w", fileName, err)
		}
		destPath := filepath.Join(destDir, fileName)
		return PlannedMove{
			Source:   absPath,
			Dest:     destPath,
			RuleName: rule.Name,
			Skipped:  false,
			Reason:   fmt.Sprintf("matched rule %q", rule.Name),
		}, nil
	}

	// Check fallback directory
	if strings.TrimSpace(settings.FallbackDir) != "" {
		fallbackDestDir := config.ExpandPath(settings.FallbackDir)
		destPath := filepath.Join(fallbackDestDir, fileName)
		return PlannedMove{
			Source:   absPath,
			Dest:     destPath,
			RuleName: "fallback",
			Skipped:  false,
			Reason:   "fallback directory",
		}, nil
	}

	return PlannedMove{
		Source:  absPath,
		Skipped: true,
		Reason:  "unmatched",
	}, nil
}

// Plan scans a directory and computes a list of PlannedMoves according to the rules and settings.
// It is read-only and causes zero side-effects on the filesystem.
func Plan(dir string, rules []Rule, settings config.Settings, now time.Time) ([]PlannedMove, error) {
	cleanDir := config.ExpandPath(dir)
	entries, err := os.ReadDir(cleanDir)
	if err != nil {
		return nil, fmt.Errorf("failed to scan directory %q: %w", cleanDir, err)
	}

	var plan []PlannedMove
	for _, entry := range entries {
		// Ignore subdirectories
		if entry.IsDir() {
			continue
		}

		filePath := filepath.Join(cleanDir, entry.Name())
		pm, err := PlanFile(filePath, rules, settings, now)
		if err != nil {
			return nil, err
		}
		plan = append(plan, pm)
	}

	return plan, nil
}
