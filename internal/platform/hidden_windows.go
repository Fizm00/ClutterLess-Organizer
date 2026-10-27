// SPDX-License-Identifier: AGPL-3.0-only
//go:build windows

package platform

import (
	"path/filepath"
	"strings"
	"syscall"
)

// GetFileAttributesHook allows mocking Windows file attributes for tests.
var GetFileAttributesHook func(path string) (uint32, error)

// IsHidden returns true if a file is considered hidden on Windows
// (dotfile naming convention, FILE_ATTRIBUTE_HIDDEN, or FILE_ATTRIBUTE_SYSTEM).
func IsHidden(path string) bool {
	base := filepath.Base(path)
	if strings.HasPrefix(base, ".") {
		return true
	}

	if GetFileAttributesHook != nil {
		attrs, err := GetFileAttributesHook(path)
		if err != nil {
			return false
		}
		return (attrs & (syscall.FILE_ATTRIBUTE_HIDDEN | syscall.FILE_ATTRIBUTE_SYSTEM)) != 0
	}

	ptr, err := syscall.UTF16PtrFromString(path)
	if err != nil {
		return false
	}
	attrs, err := syscall.GetFileAttributes(ptr)
	if err != nil {
		return false
	}
	return (attrs & (syscall.FILE_ATTRIBUTE_HIDDEN | syscall.FILE_ATTRIBUTE_SYSTEM)) != 0
}
