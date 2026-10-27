// SPDX-License-Identifier: AGPL-3.0-only
//go:build windows

package platform

import (
	"fmt"
	"os"
	"path/filepath"

	"golang.org/x/sys/windows"
)

func getKnownFolder(folder FolderType) (string, error) {
	var id *windows.KNOWNFOLDERID
	switch folder {
	case FolderDownloads:
		id = windows.FOLDERID_Downloads
	case FolderDesktop:
		id = windows.FOLDERID_Desktop
	case FolderDocuments:
		id = windows.FOLDERID_Documents
	case FolderPictures:
		id = windows.FOLDERID_Pictures
	default:
		return "", fmt.Errorf("unsupported known folder: %s", folder)
	}

	path, err := windows.KnownFolderPath(id, 0)
	if err == nil && path != "" {
		return filepath.Clean(path), nil
	}

	// Fallback to UserHomeDir if KnownFolderPath is unavailable
	home, homeErr := os.UserHomeDir()
	if homeErr != nil {
		return "", fmt.Errorf("failed to resolve known folder %s: %w", folder, err)
	}
	return filepath.Join(home, string(folder)), nil
}
