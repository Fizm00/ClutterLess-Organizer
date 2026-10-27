// SPDX-License-Identifier: AGPL-3.0-only

package platform

import (
	"os"
	"path/filepath"
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
