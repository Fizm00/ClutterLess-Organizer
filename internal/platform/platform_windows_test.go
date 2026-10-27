// SPDX-License-Identifier: AGPL-3.0-only
//go:build windows

package platform

import (
	"os"
	"path/filepath"
	"syscall"
	"testing"
)

func TestIsHidden_WindowsAttributes(t *testing.T) {
	tempDir := t.TempDir()

	// 1. Test FILE_ATTRIBUTE_HIDDEN on real file
	hiddenFile := filepath.Join(tempDir, "real_hidden.txt")
	if err := os.WriteFile(hiddenFile, []byte("hidden"), 0600); err != nil {
		t.Fatalf("failed to write test file: %v", err)
	}
	ptrHidden, _ := syscall.UTF16PtrFromString(hiddenFile)
	if err := syscall.SetFileAttributes(ptrHidden, syscall.FILE_ATTRIBUTE_HIDDEN); err != nil {
		t.Fatalf("failed to set FILE_ATTRIBUTE_HIDDEN: %v", err)
	}

	if !IsHidden(hiddenFile) {
		t.Errorf("expected %q with FILE_ATTRIBUTE_HIDDEN to be identified as hidden", hiddenFile)
	}

	// 2. Test FILE_ATTRIBUTE_SYSTEM on real file
	systemFile := filepath.Join(tempDir, "real_system.txt")
	if err := os.WriteFile(systemFile, []byte("system"), 0600); err != nil {
		t.Fatalf("failed to write test file: %v", err)
	}
	ptrSystem, _ := syscall.UTF16PtrFromString(systemFile)
	if err := syscall.SetFileAttributes(ptrSystem, syscall.FILE_ATTRIBUTE_SYSTEM); err != nil {
		t.Fatalf("failed to set FILE_ATTRIBUTE_SYSTEM: %v", err)
	}

	if !IsHidden(systemFile) {
		t.Errorf("expected %q with FILE_ATTRIBUTE_SYSTEM to be identified as hidden", systemFile)
	}

	// 3. Test mock attributes hook
	defer func() { GetFileAttributesHook = nil }()
	mockFile := filepath.Join(tempDir, "mock.txt")
	GetFileAttributesHook = func(path string) (uint32, error) {
		return syscall.FILE_ATTRIBUTE_HIDDEN, nil
	}
	if !IsHidden(mockFile) {
		t.Errorf("expected mock with FILE_ATTRIBUTE_HIDDEN to be identified as hidden")
	}
}
