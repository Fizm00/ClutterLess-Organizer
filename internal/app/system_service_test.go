// SPDX-License-Identifier: AGPL-3.0-only

package app

import (
	"os"
	"path/filepath"
	"testing"

	"github.com/Fizm00/organizer/internal/version"
)

func TestSystemService_Version(t *testing.T) {
	service := NewSystemService()
	info := service.Version()

	if info.Version != version.Version {
		t.Errorf("expected version %q, got %q", version.Version, info.Version)
	}
	if info.Commit != version.Commit {
		t.Errorf("expected commit %q, got %q", version.Commit, info.Commit)
	}
	if info.BuildDate != version.BuildDate {
		t.Errorf("expected buildDate %q, got %q", version.BuildDate, info.BuildDate)
	}
}

func TestSystemService_CountFiles(t *testing.T) {
	service := NewSystemService()

	tempDir := t.TempDir()
	// Create 3 files and 1 directory
	_ = os.WriteFile(filepath.Join(tempDir, "file1.txt"), []byte("a"), 0644)
	_ = os.WriteFile(filepath.Join(tempDir, "file2.jpg"), []byte("b"), 0644)
	_ = os.WriteFile(filepath.Join(tempDir, "file3.pdf"), []byte("c"), 0644)
	_ = os.Mkdir(filepath.Join(tempDir, "subdir"), 0755)
	_ = os.WriteFile(filepath.Join(tempDir, "subdir", "nested.txt"), []byte("d"), 0644)

	count, err := service.CountFiles(tempDir)
	if err != nil {
		t.Fatalf("unexpected error counting files: %v", err)
	}
	if count != 3 {
		t.Errorf("expected 3 files directly inside directory, got %d", count)
	}

	// Non-existent directory
	_, err = service.CountFiles(filepath.Join(tempDir, "non_existent_folder_xyz"))
	if err == nil {
		t.Errorf("expected error for non-existent directory")
	}
}
