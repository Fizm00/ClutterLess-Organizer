// SPDX-License-Identifier: AGPL-3.0-only

package ui

import (
	"bytes"
	"strings"
	"testing"
	"time"
)

func TestStyler(t *testing.T) {
	sEnabled := NewStyler(true)
	sDisabled := NewStyler(false)

	if !strings.Contains(sEnabled.Bold("test"), "\033[1m") {
		t.Errorf("expected ANSI escape code in bold string")
	}

	if sDisabled.Bold("test") != "test" {
		t.Errorf("expected plain string when disabled")
	}

	if !strings.Contains(sEnabled.BadgeDryRun(), "[DRY-RUN]") {
		t.Errorf("expected [DRY-RUN] in badge")
	}
	if sDisabled.BadgeDryRun() != "[DRY-RUN]" {
		t.Errorf("expected [DRY-RUN] plaintext")
	}
}

func TestRenderSummaryBox(t *testing.T) {
	buf := new(bytes.Buffer)
	styler := NewStyler(false)

	stats := SummaryStats{
		Moved:     10,
		Skipped:   2,
		Unmatched: 5,
		Failed:    0,
		Duration:  150 * time.Millisecond,
		DryRun:    true,
	}

	RenderSummaryBox(buf, stats, styler)
	out := buf.String()

	if !strings.Contains(out, "Execution Summary") {
		t.Errorf("expected 'Execution Summary' in output")
	}
	if !strings.Contains(out, "Summary: moved 10, skipped 2, unmatched 5, failed 0") {
		t.Errorf("expected summary line for backward compatibility")
	}
}

func TestRenderHelp(t *testing.T) {
	buf := new(bytes.Buffer)
	styler := NewStyler(false)

	RenderHelp(buf, "0.1.0", styler)
	out := buf.String()

	if !strings.Contains(out, "ClutterLess Organizer") {
		t.Errorf("expected header in help output")
	}
	if !strings.Contains(out, "CORE COMMANDS") {
		t.Errorf("expected CORE COMMANDS in help output")
	}
	if !strings.Contains(out, "QUICK START EXAMPLES") {
		t.Errorf("expected QUICK START EXAMPLES in help output")
	}
}
