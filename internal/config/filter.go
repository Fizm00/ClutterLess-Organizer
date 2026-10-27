// SPDX-License-Identifier: AGPL-3.0-only

package config

import (
	"fmt"
	"path/filepath"
	"strings"

	"github.com/Fizm00/organizer/internal/platform"
)

// ExtractExt returns the lowercase extension of a filename without the leading dot.
func ExtractExt(fileName string) string {
	ext := filepath.Ext(fileName)
	if ext == "" {
		return ""
	}
	return strings.ToLower(strings.TrimPrefix(ext, "."))
}

// ShouldIgnoreFile checks whether a file should be ignored based on global settings:
// ignored extensions, ignored exact names, or hidden file attributes.
func ShouldIgnoreFile(filePath string, fileName string, settings Settings) (bool, string) {
	// 1. Check ignored extensions
	ext := ExtractExt(fileName)
	for _, ignExt := range settings.IgnoreExt {
		cleanIgnExt := strings.ToLower(strings.TrimPrefix(strings.TrimSpace(ignExt), "."))
		if strings.EqualFold(ext, cleanIgnExt) {
			return true, fmt.Sprintf("ignored extension %q", ext)
		}
	}

	// 2. Check ignored names
	for _, ignName := range settings.IgnoreNames {
		if strings.EqualFold(fileName, strings.TrimSpace(ignName)) {
			return true, fmt.Sprintf("ignored name %q", fileName)
		}
	}

	// 3. Check hidden files
	if settings.IgnoreHidden != nil && *settings.IgnoreHidden {
		if platform.IsHidden(filePath) {
			return true, "ignored hidden file"
		}
	}

	return false, ""
}
