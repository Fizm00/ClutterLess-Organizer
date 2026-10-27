// SPDX-License-Identifier: AGPL-3.0-only
//go:build !windows

package ui

import (
	"os"
)

// EnableVirtualTerminal is a no-op on non-Windows platforms.
func EnableVirtualTerminal() {}

// isTerminalFD checks if the given file descriptor is a terminal.
func isTerminalFD(fd uintptr) bool {
	fi, err := os.Stdout.Stat()
	if err != nil {
		return false
	}
	return (fi.Mode() & os.ModeCharDevice) != 0
}
