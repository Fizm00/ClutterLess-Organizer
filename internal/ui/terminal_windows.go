// SPDX-License-Identifier: AGPL-3.0-only
//go:build windows

package ui

import (
	"os"

	"golang.org/x/sys/windows"
)

// EnableVirtualTerminal enables ANSI escape code processing on Windows console.
func EnableVirtualTerminal() {
	stdout := windows.Handle(os.Stdout.Fd())
	var mode uint32
	if err := windows.GetConsoleMode(stdout, &mode); err == nil {
		mode |= windows.ENABLE_VIRTUAL_TERMINAL_PROCESSING
		_ = windows.SetConsoleMode(stdout, mode)
	}

	stderr := windows.Handle(os.Stderr.Fd())
	var errMode uint32
	if err := windows.GetConsoleMode(stderr, &errMode); err == nil {
		errMode |= windows.ENABLE_VIRTUAL_TERMINAL_PROCESSING
		_ = windows.SetConsoleMode(stderr, errMode)
	}
}

// IsTerminal returns true if the file descriptor points to a terminal.
func isTerminalFD(fd uintptr) bool {
	var mode uint32
	err := windows.GetConsoleMode(windows.Handle(fd), &mode)
	return err == nil
}
