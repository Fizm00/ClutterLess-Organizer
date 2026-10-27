// SPDX-License-Identifier: AGPL-3.0-only
//go:build linux

package platform

import (
	"bufio"
	"fmt"
	"os"
	"path/filepath"
	"strings"
)

func getKnownFolder(folder FolderType) (string, error) {
	home, err := os.UserHomeDir()
	if err != nil {
		return "", fmt.Errorf("failed to get user home directory: %w", err)
	}

	// Follow XDG User Directories specification
	// Location: $XDG_CONFIG_HOME/user-dirs.dirs or ~/.config/user-dirs.dirs
	configHome := os.Getenv("XDG_CONFIG_HOME")
	if configHome == "" {
		configHome = filepath.Join(home, ".config")
	}
	userDirsFile := filepath.Join(configHome, "user-dirs.dirs")

	var varName string
	switch folder {
	case FolderDownloads:
		varName = "XDG_DOWNLOAD_DIR"
	case FolderDesktop:
		varName = "XDG_DESKTOP_DIR"
	case FolderDocuments:
		varName = "XDG_DOCUMENTS_DIR"
	case FolderPictures:
		varName = "XDG_PICTURES_DIR"
	default:
		return filepath.Join(home, string(folder)), nil
	}

	if f, err := os.Open(userDirsFile); err == nil {
		defer f.Close()
		scanner := bufio.NewScanner(f)
		for scanner.Scan() {
			line := strings.TrimSpace(scanner.Text())
			if strings.HasPrefix(line, "#") || !strings.HasPrefix(line, varName+"=") {
				continue
			}
			val := strings.TrimPrefix(line, varName+"=")
			val = strings.Trim(val, `"`)
			val = strings.ReplaceAll(val, "$HOME", home)
			val = strings.ReplaceAll(val, "${HOME}", home)
			if val != "" {
				return filepath.Clean(val), nil
			}
		}
	}

	// Fallback to standard ~/Folder
	return filepath.Join(home, string(folder)), nil
}
