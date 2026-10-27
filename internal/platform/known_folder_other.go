// SPDX-License-Identifier: AGPL-3.0-only
//go:build !windows && !linux && !darwin

package platform

import (
	"fmt"
	"os"
	"path/filepath"
)

func getKnownFolder(folder FolderType) (string, error) {
	home, err := os.UserHomeDir()
	if err != nil {
		return "", fmt.Errorf("failed to get user home directory: %w", err)
	}
	return filepath.Join(home, string(folder)), nil
}
