// SPDX-License-Identifier: AGPL-3.0-only
//go:build !windows

package platform

import (
	"path/filepath"
	"strings"
)

// IsHidden returns true if a file is considered hidden on non-Windows systems (starts with a dot).
func IsHidden(path string) bool {
	base := filepath.Base(path)
	return strings.HasPrefix(base, ".")
}
