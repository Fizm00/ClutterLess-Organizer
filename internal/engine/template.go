// SPDX-License-Identifier: AGPL-3.0-only

package engine

import (
	"path/filepath"
	"strings"
	"time"

	"github.com/Fizm00/organizer/internal/config"
)

// ExtractExt returns the lowercase extension of a filename without the leading dot.
// If the file has no extension, it returns an empty string.
func ExtractExt(fileName string) string {
	ext := filepath.Ext(fileName)
	if ext == "" {
		return ""
	}
	return strings.ToLower(strings.TrimPrefix(ext, "."))
}

// ExtractBaseName returns the filename without its final extension.
func ExtractBaseName(fileName string) string {
	ext := filepath.Ext(fileName)
	if ext == "" {
		return fileName
	}
	return strings.TrimSuffix(fileName, ext)
}

// RenderMoveTo resolves template variables in a destination folder path
// based on file metadata and modTime.
//
// Supported variables:
// - {year}: 4-digit year of mtime (e.g. "2026")
// - {month}: 2-digit month of mtime (e.g. "10")
// - {day}: 2-digit day of mtime (e.g. "28")
// - {ext}: lowercase extension without dot, or "noext" if none
// - {name}: file name without final extension
func RenderMoveTo(templateStr string, fileName string, mtime time.Time) (string, error) {
	ext := ExtractExt(fileName)
	if ext == "" {
		ext = "noext"
	}
	name := ExtractBaseName(fileName)

	year := mtime.Format("2006")
	month := mtime.Format("01")
	day := mtime.Format("02")

	// Perform replacements
	r := strings.NewReplacer(
		"{year}", year,
		"{month}", month,
		"{day}", day,
		"{ext}", ext,
		"{name}", name,
	)
	rendered := r.Replace(templateStr)

	// Expand home directory (~) and environment variables
	expanded := config.ExpandPath(rendered)

	// Sanitize output for illegal characters and Windows reserved names
	sanitized := SanitizePath(expanded)

	return sanitized, nil
}
