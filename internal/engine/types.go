// SPDX-License-Identifier: AGPL-3.0-only

package engine

import (
	"regexp"
	"time"
)

// Rule defines an executable file organization rule.
type Rule struct {
	Name   string
	Match  Match
	MoveTo string // destination template
}

// Match defines matching conditions for a rule. All specified conditions must be satisfied (AND).
type Match struct {
	Ext       []string       // lowercase extensions, without leading dot
	NameGlob  []string       // filepath.Match patterns
	NameRegex *regexp.Regexp // compiled Go regular expression
	MinSize   *int64         // minimum size in bytes (inclusive)
	MaxSize   *int64         // maximum size in bytes (inclusive)
	OlderThan *time.Duration // age duration relative to mtime
}

// PlannedMove describes an intended file move operation.
type PlannedMove struct {
	ID       string // unique stable identifier for the planned move
	Source   string // full path to the source file
	Dest     string // full path to the intended destination file
	RuleName string // name of the matching rule, or empty
	Skipped  bool   // true if file was ignored or no rule matched
	Reason   string // human-readable explanation of why matched or skipped
}

// FileInfo holds metadata needed by the matcher and planner without touching disk repeatedly.
type FileInfo struct {
	Path    string
	Name    string
	Size    int64
	ModTime time.Time
	IsDir   bool
}
