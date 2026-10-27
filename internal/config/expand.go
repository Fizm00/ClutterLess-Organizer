// SPDX-License-Identifier: AGPL-3.0-only

package config

import (
	"os"
	"path/filepath"
	"regexp"
	"strings"

	"github.com/Fizm00/organizer/internal/platform"
)

var winEnvRegex = regexp.MustCompile(`%([a-zA-Z0-9_]+)%`)

// ExpandPath expands tilde (~) and environment variables (%VAR%, $VAR, ${VAR})
// in a filesystem path and cleans the resulting path.
// Standard user folders (~/Downloads, ~/Desktop, ~/Documents, ~/Pictures) are
// automatically resolved via platform.KnownFolder (e.g. correctly handling OneDrive redirection on Windows).
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

	// 3. Expand tilde (~) to user home directory or KnownFolder
	if strings.HasPrefix(path, "~") {
		if path == "~" {
			if home, err := os.UserHomeDir(); err == nil && home != "" {
				path = home
			}
		} else if strings.HasPrefix(path, "~/") || strings.HasPrefix(path, `~\`) {
			sub := path[2:]
			// Extract first path component (e.g. "Downloads" from "Downloads/Subfolder")
			firstSeg := sub
			rest := ""
			if idx := strings.IndexAny(sub, `/\`); idx != -1 {
				firstSeg = sub[:idx]
				rest = sub[idx+1:]
			}

			var folderType platform.FolderType
			switch strings.ToLower(firstSeg) {
			case "downloads":
				folderType = platform.FolderDownloads
			case "desktop":
				folderType = platform.FolderDesktop
			case "documents":
				folderType = platform.FolderDocuments
			case "pictures":
				folderType = platform.FolderPictures
			}

			if folderType != "" {
				if kfPath, err := platform.KnownFolder(folderType); err == nil && kfPath != "" {
					if rest != "" {
						path = filepath.Join(kfPath, rest)
					} else {
						path = kfPath
					}
				} else if home, err := os.UserHomeDir(); err == nil && home != "" {
					path = filepath.Join(home, sub)
				}
			} else if home, err := os.UserHomeDir(); err == nil && home != "" {
				path = filepath.Join(home, sub)
			}
		}
	}

	return filepath.Clean(path)
}
