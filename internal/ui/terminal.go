// SPDX-License-Identifier: AGPL-3.0-only

package ui

import (
	"io"
	"os"
)

// IsTerminalWriter checks if the given io.Writer points to an interactive terminal.
func IsTerminalWriter(w io.Writer) bool {
	if f, ok := w.(*os.File); ok {
		return isTerminalFD(f.Fd())
	}
	return false
}

// ShouldUseColor checks whether ANSI colors should be enabled based on
// terminal capability, NO_COLOR environment variable, and the --no-color flag.
func ShouldUseColor(noColorFlag bool, w io.Writer) bool {
	if noColorFlag {
		return false
	}
	if os.Getenv("NO_COLOR") != "" {
		return false
	}
	return IsTerminalWriter(w)
}
