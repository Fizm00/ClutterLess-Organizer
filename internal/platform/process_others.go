// SPDX-License-Identifier: AGPL-3.0-only
//go:build !windows

package platform

import (
	"os"
	"syscall"
)

// IsProcessAlive reports whether a process with the specified PID is currently running on Unix-like systems.
func IsProcessAlive(pid int) bool {
	if pid <= 0 {
		return false
	}
	process, err := os.FindProcess(pid)
	if err != nil {
		return false
	}
	return process.Signal(syscall.Signal(0)) == nil
}
