// SPDX-License-Identifier: AGPL-3.0-only
//go:build windows

package platform

import (
	"errors"
	"os"
	"syscall"
)

const (
	// ERROR_NOT_SAME_DEVICE is the Windows error code for cross-volume move attempts.
	ERROR_NOT_SAME_DEVICE syscall.Errno = 17
	// ERROR_SHARING_VIOLATION indicates the file is in use by another process.
	ERROR_SHARING_VIOLATION syscall.Errno = 32
	// ERROR_LOCK_VIOLATION indicates a lock violation on the file.
	ERROR_LOCK_VIOLATION syscall.Errno = 33
)

// IsCrossDeviceError checks if an error indicates an attempt to move across volume/drive boundaries.
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
		return errno == ERROR_NOT_SAME_DEVICE || errno == syscall.EXDEV
	}
	return false
}

// IsFileLockedError checks if an error indicates a file is locked or in use by another process on Windows.
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
