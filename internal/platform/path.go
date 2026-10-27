// SPDX-License-Identifier: AGPL-3.0-only

package platform

import (
	"fmt"
	"path/filepath"
	"runtime"
	"strings"
)

// WindowsMaxPath is the standard maximum path length on Windows without extended prefix.
const WindowsMaxPath = 260

// CheckPathLength verifies if a path exceeds the Windows MAX_PATH limit (260 characters).
// On Windows, if the path length is >= 260 and not prefixed with \\?\, a clear error is returned.
func CheckPathLength(path string) error {
	if runtime.GOOS == "windows" {
		clean := filepath.Clean(path)
		if len(clean) >= WindowsMaxPath && !strings.HasPrefix(clean, `\\?\`) {
			return fmt.Errorf("path length (%d chars) exceeds Windows MAX_PATH limit (260 characters): %s", len(clean), clean)
		}
	}
	return nil
}

// ToExtendedLengthPath adds the \\?\ extended-length prefix on Windows for long absolute paths.
func ToExtendedLengthPath(path string) string {
	if runtime.GOOS != "windows" {
		return path
	}
	clean := filepath.Clean(path)
	if strings.HasPrefix(clean, `\\?\`) {
		return clean
	}
	if filepath.IsAbs(clean) && len(clean) >= 248 {
		return `\\?\` + clean
	}
	return clean
}

// PathEqual compares two filesystem paths, using case-insensitive comparison on Windows
// and case-sensitive comparison on other operating systems.
func PathEqual(p1, p2 string) bool {
	c1 := filepath.Clean(p1)
	c2 := filepath.Clean(p2)
	if runtime.GOOS == "windows" {
		return strings.EqualFold(c1, c2)
	}
	return c1 == c2
}
