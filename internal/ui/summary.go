// SPDX-License-Identifier: AGPL-3.0-only

package ui

import (
	"fmt"
	"io"
	"strings"
	"time"
)

// SummaryStats contains the metrics to render in the summary card.
type SummaryStats struct {
	Moved     int
	Skipped   int
	Unmatched int
	Failed    int
	Duration  time.Duration
	DryRun    bool
}

// RenderSummaryBox prints a stylish, fully-framed boxed summary card.
func RenderSummaryBox(w io.Writer, stats SummaryStats, styler *Styler) {
	fmt.Fprintln(w)
	const innerWidth = 59
	borderLine := strings.Repeat("─", innerWidth+2)

	row := func(content string) string {
		return styler.Dim("│") + " " + PadRight(content, innerWidth) + " " + styler.Dim("│")
	}

	header := styler.Bold("          ClutterLess Organizer — Execution Summary")

	modeVal := styler.Green("Live Execution (Files successfully moved)")
	if stats.DryRun {
		modeVal = styler.Cyan("Dry Run (Preview Only — no changes made)")
	}

	durVal := fmt.Sprintf("%.3fs", stats.Duration.Seconds())
	movedVal := styler.Green(Plural(stats.Moved, "file", "files"))
	skippedVal := styler.Dim(fmt.Sprintf("%s (ignored / metadata)", Plural(stats.Skipped, "file", "files")))

	unmatchedVal := styler.Dim("0 files")
	if stats.Unmatched > 0 {
		unmatchedVal = styler.Yellow(fmt.Sprintf("%s (left safely in place)", Plural(stats.Unmatched, "file", "files")))
	}

	failedVal := styler.Dim("0 errors")
	if stats.Failed > 0 {
		failedVal = styler.Bold(styler.Red(Plural(stats.Failed, "error", "errors")))
	}

	fmt.Fprintln(w, styler.Dim("┌"+borderLine+"┐"))
	fmt.Fprintln(w, row(header))
	fmt.Fprintln(w, styler.Dim("├"+borderLine+"┤"))
	fmt.Fprintln(w, row(styler.Dim("Mode:      ")+modeVal))
	fmt.Fprintln(w, row(styler.Dim("Duration:  ")+durVal))
	fmt.Fprintln(w, styler.Dim("├"+borderLine+"┤"))
	fmt.Fprintln(w, row(styler.Green("✔ ")+styler.Bold("Moved:    ")+" "+movedVal))
	fmt.Fprintln(w, row(styler.Dim("- ")+styler.Dim("Skipped:  ")+" "+skippedVal))
	fmt.Fprintln(w, row(styler.Yellow("? ")+styler.Dim("Unmatched:")+" "+unmatchedVal))
	fmt.Fprintln(w, row(styler.Red("✖ ")+styler.Dim("Failed:   ")+" "+failedVal))
	fmt.Fprintln(w, styler.Dim("└"+borderLine+"┘"))

	// Retain machine/script convention output line
	fmt.Fprintf(w, "\nSummary: moved %d, skipped %d, unmatched %d, failed %d\n",
		stats.Moved, stats.Skipped, stats.Unmatched, stats.Failed)
}
