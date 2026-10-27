// SPDX-License-Identifier: AGPL-3.0-only

package ui

import (
	"fmt"
	"io"
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

// RenderSummaryBox prints a stylish boxed summary.
func RenderSummaryBox(w io.Writer, stats SummaryStats, styler *Styler) {
	fmt.Fprintln(w)
	line := "─────────────────────────────────────────────────────────────"
	fmt.Fprintln(w, styler.Dim("┌"+line+"┐"))
	fmt.Fprintln(w, styler.Dim("│")+" "+styler.Bold("            ClutterLess Organizer — Execution Summary        ")+" "+styler.Dim("│"))
	fmt.Fprintln(w, styler.Dim("├"+line+"┤"))

	durStr := fmt.Sprintf("%.3fs", stats.Duration.Seconds())
	if stats.DryRun {
		fmt.Fprintf(w, "%s  Mode:      %s\n", styler.Dim("│"), styler.Cyan("Dry Run (Preview Only — no files were moved)"))
	} else {
		fmt.Fprintf(w, "%s  Mode:      %s\n", styler.Dim("│"), styler.Green("Live Execution (Files successfully moved)"))
	}
	fmt.Fprintf(w, "%s  Duration:  %s\n", styler.Dim("│"), durStr)
	fmt.Fprintln(w, styler.Dim("├"+line+"┤"))

	fmt.Fprintf(w, "%s  ✔  %-11s %s\n", styler.Dim("│"), styler.Bold("Moved:"), styler.Green(fmt.Sprintf("%d files", stats.Moved)))
	fmt.Fprintf(w, "%s  -  %-11s %s\n", styler.Dim("│"), styler.Dim("Skipped:"), styler.Dim(fmt.Sprintf("%d files (ignored / metadata)", stats.Skipped)))
	if stats.Unmatched > 0 {
		fmt.Fprintf(w, "%s  ?  %-11s %s\n", styler.Dim("│"), styler.Yellow("Unmatched:"), styler.Yellow(fmt.Sprintf("%d files (left safely in place)", stats.Unmatched)))
	} else {
		fmt.Fprintf(w, "%s  ?  %-11s %s\n", styler.Dim("│"), styler.Dim("Unmatched:"), styler.Dim("0 files"))
	}
	if stats.Failed > 0 {
		fmt.Fprintf(w, "%s  ✖  %-11s %s\n", styler.Dim("│"), styler.Bold(styler.Red("Failed:")), styler.Red(fmt.Sprintf("%d errors", stats.Failed)))
	} else {
		fmt.Fprintf(w, "%s  ✖  %-11s %s\n", styler.Dim("│"), styler.Dim("Failed:"), styler.Dim("0 errors"))
	}
	fmt.Fprintln(w, styler.Dim("└"+line+"┘"))

	// Retain machine/script convention output line
	fmt.Fprintf(w, "\nSummary: moved %d, skipped %d, unmatched %d, failed %d\n",
		stats.Moved, stats.Skipped, stats.Unmatched, stats.Failed)
}
