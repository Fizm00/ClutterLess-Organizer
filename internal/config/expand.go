// SPDX-License-Identifier: AGPL-3.0-only

package config

import (
	"os"
	"path/filepath"
	"regexp"
	"strings"
)

var winEnvRegex = regexp.MustCompile(`%([a-zA-Z0-9_]+)%`)

// ExpandPath expands tilde (~) and environment variables (%VAR%, $VAR, ${VAR})
// in a filesystem path and cleans the resulting path.
func ExpandPath(path string) string {
	if path == "" {
		return ""
	}

	// 1. Expand Windows %VAR% style environment variables
	path = winEnvRegex.ReplaceAllStringFunc(path, func(match string) string {
		varName := match[1 : len(match)-1]
		if val, ok := os.LookupEnv(varName); ok {
			return val
		}
		return match
	})

	// 2. Expand POSIX $VAR and ${VAR} style environment variables
	path = os.ExpandEnv(path)

	// 3. Expand tilde (~) to user home directory
	if strings.HasPrefix(path, "~") {
		if home, err := os.UserHomeDir(); err == nil && home != "" {
			if path == "~" {
				path = home
			} else if strings.HasPrefix(path, "~/") || strings.HasPrefix(path, `~\`) {
				path = filepath.Join(home, path[2:])
			}
		}
	}

	return filepath.Clean(path)
}
