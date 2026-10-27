// SPDX-License-Identifier: AGPL-3.0-only

package platform

import (
	"errors"
	"os"
	"path/filepath"
	"runtime"
	"strings"
	"syscall"
	"testing"
)

func TestIsHidden_Dotfile(t *testing.T) {
	tempDir := t.TempDir()
	hiddenFile := filepath.Join(tempDir, ".hidden_test")
	if err := os.WriteFile(hiddenFile, []byte("data"), 0600); err != nil {
		t.Fatalf("failed to write test file: %v", err)
	}

	normalFile := filepath.Join(tempDir, "normal_test.txt")
	if err := os.WriteFile(normalFile, []byte("data"), 0600); err != nil {
		t.Fatalf("failed to write test file: %v", err)
	}

	if !IsHidden(hiddenFile) {
		t.Errorf("expected %q to be hidden", hiddenFile)
	}
	if IsHidden(normalFile) {
		t.Errorf("expected %q not to be hidden", normalFile)
	}
}

func TestKnownFolder_StandardFolders(t *testing.T) {
	folders := []FolderType{
		FolderDownloads,
		FolderDesktop,
		FolderDocuments,
		FolderPictures,
	}

	for _, f := range folders {
		path, err := KnownFolder(f)
		if err != nil {
			t.Fatalf("KnownFolder(%s) failed: %v", f, err)
		}
		if path == "" {
			t.Errorf("KnownFolder(%s) returned empty path", f)
		}
		if !filepath.IsAbs(path) {
			t.Errorf("KnownFolder(%s) path %q must be absolute", f, path)
		}
	}
}

func TestKnownFolder_OneDriveMock(t *testing.T) {
	defer func() { KnownFolderHook = nil }()

	mockOneDriveDesktop := `C:\Users\TestUser\OneDrive\Desktop`
	KnownFolderHook = func(folder FolderType) (string, error) {
		if folder == FolderDesktop {
			return mockOneDriveDesktop, nil
		}
		return "", errors.New("not mocked")
	}

	path, err := KnownFolder(FolderDesktop)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if path != mockOneDriveDesktop {
		t.Errorf("expected %q, got %q", mockOneDriveDesktop, path)
	}
}

func TestIsFileLockedError_NonWindows(t *testing.T) {
	if runtime.GOOS != "windows" {
		randomErr := errors.New("arbitrary error")
		if IsFileLockedError(randomErr) {
			t.Errorf("IsFileLockedError should always return false on non-Windows")
		}
	}
}

func TestIsCrossDeviceError(t *testing.T) {
	exdevErr := &os.LinkError{
		Op:  "rename",
		Old: "/mnt/a/file.txt",
		New: "/mnt/b/file.txt",
		Err: syscall.EXDEV,
	}
	if !IsCrossDeviceError(exdevErr) {
		t.Errorf("expected EXDEV to be recognized as cross-device error")
	}

	if IsCrossDeviceError(nil) {
		t.Errorf("nil error should not be cross device")
	}
}

func TestPathHelpers(t *testing.T) {
	// 1. PathEqual
	if runtime.GOOS == "windows" {
		if !PathEqual(`C:\Folder\File.TXT`, `C:\folder\file.txt`) {
			t.Errorf("expected PathEqual to be case-insensitive on Windows")
		}
	} else {
		if PathEqual(`/tmp/File.txt`, `/tmp/file.txt`) {
			t.Errorf("expected PathEqual to be case-sensitive on non-Windows")
		}
		if !PathEqual(`/tmp/file.txt`, `/tmp/file.txt`) {
			t.Errorf("expected PathEqual to return true for identical paths")
		}
	}

	// 2. CheckPathLength
	shortPath := `C:\Projects\sample.txt`
	if err := CheckPathLength(shortPath); err != nil {
		t.Errorf("unexpected error for short path: %v", err)
	}

	longPath := `C:\` + strings.Repeat("a", 260)
	if runtime.GOOS == "windows" {
		if err := CheckPathLength(longPath); err == nil {
			t.Errorf("expected error for path length >= 260 on Windows")
		}
		// If prefixed with \\?\, it should be allowed
		extendedLongPath := `\\?\` + longPath
		if err := CheckPathLength(extendedLongPath); err != nil {
			t.Errorf("extended path with \\?\\ should not error: %v", err)
		}
	} else {
		if err := CheckPathLength(longPath); err != nil {
			t.Errorf("CheckPathLength should return nil on non-Windows: %v", err)
		}
	}

	// 3. ToExtendedLengthPath
	if runtime.GOOS == "windows" {
		absPath := `C:\` + strings.Repeat("sub", 90) + `\file.txt`
		ext := ToExtendedLengthPath(absPath)
		if !strings.HasPrefix(ext, `\\?\`) {
			t.Errorf("expected extended path prefix on Windows for long path, got: %s", ext)
		}
	}
}
