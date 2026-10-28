// SPDX-License-Identifier: AGPL-3.0-only
//go:build windows

package platform

import (
	"syscall"
)

// IsProcessAlive reports whether a process with the specified PID is currently running on Windows.
func IsProcessAlive(pid int) bool {
	if pid <= 0 {
		return false
	}

	const (
		processQueryLimitedInformation = 0x1000
		stillActive                    = 259
	)

	h, err := syscall.OpenProcess(processQueryLimitedInformation, false, uint32(pid))
	if err != nil {
		return false
	}
	defer syscall.CloseHandle(h)

	var exitCode uint32
	err = syscall.GetExitCodeProcess(h, &exitCode)
	if err != nil {
		return false
	}
	return exitCode == stillActive
}
