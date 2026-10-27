// SPDX-License-Identifier: AGPL-3.0-only

package engine

import (
	"path/filepath"
	"strings"
	"unicode"
)

var windowsReservedNames = map[string]bool{
	"CON":  true,
	"PRN":  true,
	"AUX":  true,
	"NUL":  true,
	"COM1": true,
	"COM2": true,
	"COM3": true,
	"COM4": true,
	"COM5": true,
	"COM6": true,
	"COM7": true,
	"COM8": true,
	"COM9": true,
	"LPT1": true,
	"LPT2": true,
	"LPT3": true,
	"LPT4": true,
	"LPT5": true,
	"LPT6": true,
	"LPT7": true,
	"LPT8": true,
	"LPT9": true,
}

// SanitizeSegment cleans a single path component (directory name or file name).
// It replaces illegal characters with underscores, removes trailing dots/spaces,
// and prefixes Windows reserved names with an underscore.
func SanitizeSegment(s string) string {
	if s == "" {
		return ""
	}

	// 1. Replace illegal characters and non-printable characters
	var b strings.Builder
	for _, r := range s {
		switch r {
		case '<', '>', ':', '"', '/', '\\', '|', '?', '*':
			b.WriteRune('_')
		default:
			if r < 32 || unicode.IsControl(r) {
				b.WriteRune('_')
			} else {
				b.WriteRune(r)
			}
		}
	}
	result := b.String()

	// 2. Remove trailing dots and spaces (illegal on Windows)
	result = strings.TrimRight(result, ". ")
	if result == "" {
		return "_"
	}

	// 3. Check for Windows reserved device names (e.g., CON, PRN, NUL)
	// Both "CON" and "CON.txt" are forbidden by Windows.
	base := result
	if ext := filepath.Ext(result); ext != "" {
		base = strings.TrimSuffix(result, ext)
	}

	if windowsReservedNames[strings.ToUpper(base)] {
		result = "_" + result
	}

	return result
}

// SanitizePath sanitizes all path segments in a full or relative path,
// preserving Windows drive letters (e.g. "C:") or UNC roots.
func SanitizePath(p string) string {
	if p == "" {
		return ""
	}

	// Normalize separators to forward slash for segment processing
	cleanPath := filepath.Clean(p)
	vol := filepath.VolumeName(cleanPath)
	rest := strings.TrimPrefix(cleanPath, vol)

	isAbs := strings.HasPrefix(rest, string(filepath.Separator))
	parts := strings.Split(rest, string(filepath.Separator))

	var sanitizedParts []string
	for _, part := range parts {
		if part == "" || part == "." || part == ".." {
			sanitizedParts = append(sanitizedParts, part)
			continue
		}
		sanitizedParts = append(sanitizedParts, SanitizeSegment(part))
	}

	joined := strings.Join(sanitizedParts, string(filepath.Separator))
	if vol != "" {
		if isAbs && !strings.HasPrefix(joined, string(filepath.Separator)) {
			return vol + string(filepath.Separator) + joined
		}
		return vol + joined
	}
	if isAbs && !strings.HasPrefix(joined, string(filepath.Separator)) {
		return string(filepath.Separator) + joined
	}
	return joined
}
