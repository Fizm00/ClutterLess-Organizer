// SPDX-License-Identifier: AGPL-3.0-only

package ui

import (
	"fmt"
	"os"
	"path/filepath"
	"runtime"
	"strings"
)

// VisibleLen returns the number of terminal cells a string occupies,
// ignoring ANSI escape sequences.
func VisibleLen(s string) int {
	n := 0
	inEsc := false
	for _, r := range s {
		if inEsc {
			if (r >= 'a' && r <= 'z') || (r >= 'A' && r <= 'Z') {
				inEsc = false
			}
			continue
		}
		if r == '\033' {
			inEsc = true
			continue
		}
		n++
	}
	return n
}

// PadRight pads s with spaces until it occupies width visible cells.
func PadRight(s string, width int) string {
	if pad := width - VisibleLen(s); pad > 0 {
		return s + strings.Repeat(" ", pad)
	}
	return s
}

// Plural formats a count with the correct singular or plural noun.
func Plural(n int, singular, plural string) string {
	if n == 1 {
		return fmt.Sprintf("%d %s", n, singular)
	}
	return fmt.Sprintf("%d %s", n, plural)
}

// ShortPath replaces the user's home directory prefix with "~" for display.
// It is purely cosmetic; history and config keep absolute paths.
func ShortPath(p string) string {
	home, err := os.UserHomeDir()
	if err != nil || home == "" || p == "" {
		return p
	}
	home = filepath.Clean(home)
	clean := filepath.Clean(p)

	hasPrefix := strings.HasPrefix
	equal := func(a, b string) bool { return a == b }
	if runtime.GOOS == "windows" {
		hasPrefix = func(s, prefix string) bool {
			return len(s) >= len(prefix) && strings.EqualFold(s[:len(prefix)], prefix)
		}
		equal = strings.EqualFold
	}

	if equal(clean, home) {
		return "~"
	}
	prefix := home + string(filepath.Separator)
	if hasPrefix(clean, prefix) {
		return "~" + string(filepath.Separator) + clean[len(prefix):]
	}
	return p
}
