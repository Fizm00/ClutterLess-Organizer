// SPDX-License-Identifier: AGPL-3.0-only
//go:build !windows

package platform

import (
	"errors"
	"os"
	"syscall"
)

// IsProcessAlive reports whether a process with the specified PID is currently running on Unix-like systems.
// According to POSIX kill(pid, 0):
// - 0 (nil err): process exists and can be signaled
// - EPERM: process exists but calling process does not have permission (process IS alive)
// - ESRCH: process does not exist
func IsProcessAlive(pid int) bool {
	if pid <= 0 {
		return false
	}
	process, err := os.FindProcess(pid)
	if err != nil {
		return false
	}
	err = process.Signal(syscall.Signal(0))
	if err == nil || errors.Is(err, syscall.EPERM) {
		return true
	}
	return false
}
