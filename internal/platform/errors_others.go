// SPDX-License-Identifier: AGPL-3.0-only
//go:build !windows

package platform

import (
	"errors"
	"os"
	"syscall"
)

const (
	// ERROR_NOT_SAME_DEVICE on non-Windows maps directly to syscall.EXDEV for cross-device moves.
	ERROR_NOT_SAME_DEVICE syscall.Errno = syscall.EXDEV
	// ERROR_SHARING_VIOLATION indicates the file is in use by another process.
	ERROR_SHARING_VIOLATION syscall.Errno = 32
	// ERROR_LOCK_VIOLATION indicates a lock violation on the file.
	ERROR_LOCK_VIOLATION syscall.Errno = 33
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
		return errno == syscall.EXDEV || errno == ERROR_NOT_SAME_DEVICE
	}
	return false
}

// IsFileLockedError checks if an error indicates a file is locked or in use.
func IsFileLockedError(err error) bool {
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
		return errno == ERROR_SHARING_VIOLATION || errno == ERROR_LOCK_VIOLATION
	}
	return false
}
