// SPDX-License-Identifier: AGPL-3.0-only
//go:build windows

package platform

import (
	"path/filepath"
	"strings"
	"syscall"
)

// IsHidden returns true if a file is considered hidden on Windows
// (dotfile naming convention or FILE_ATTRIBUTE_HIDDEN attribute).
func IsHidden(path string) bool {
	base := filepath.Base(path)
	if strings.HasPrefix(base, ".") {
		return true
	}

	ptr, err := syscall.UTF16PtrFromString(path)
	if err != nil {
		return false
	}
	attrs, err := syscall.GetFileAttributes(ptr)
	if err != nil {
		return false
	}
	return (attrs & syscall.FILE_ATTRIBUTE_HIDDEN) != 0
}
