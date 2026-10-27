// SPDX-License-Identifier: AGPL-3.0-only
//go:build !windows

package platform

import (
	"errors"
	"os"
	"syscall"
)

// IsCrossDeviceError checks if an error indicates EXDEV on non-Windows systems.
func IsCrossDeviceError(err error) bool {
	if err == nil {
		return false
	}
	var linkErr *os.LinkError
	if errors.As(err, &linkErr) {
		err = linkErr.Err
	}
	var pathErr *os.PathError
	if errors.As(err, &pathErr) {
		err = pathErr.Err
	}
	var errno syscall.Errno
	if errors.As(err, &errno) {
		return errno == syscall.EXDEV
	}
	return false
}

// IsFileLockedError returns false on non-Windows platforms.
func IsFileLockedError(err error) bool {
	return false
}
