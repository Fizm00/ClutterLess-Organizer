// SPDX-License-Identifier: AGPL-3.0-only

package platform

// FolderType represents a standard user known folder across operating systems.
type FolderType string

const (
	FolderDownloads FolderType = "Downloads"
	FolderDesktop   FolderType = "Desktop"
	FolderDocuments FolderType = "Documents"
	FolderPictures  FolderType = "Pictures"
)

// KnownFolderHook allows tests to override known folder resolution deterministically.
var KnownFolderHook func(folder FolderType) (string, error)

// KnownFolder returns the filesystem path of the specified user folder.
// On Windows, it queries the Known Folder API (SHGetKnownFolderPath) to properly handle OneDrive redirection.
// On Linux, it respects XDG user directories (user-dirs.dirs).
// On macOS and other platforms, it maps to standard home directory subfolders.
func KnownFolder(folder FolderType) (string, error) {
	if KnownFolderHook != nil {
		return KnownFolderHook(folder)
	}
	return getKnownFolder(folder)
}
