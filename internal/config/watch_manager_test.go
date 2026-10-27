// SPDX-License-Identifier: AGPL-3.0-only

package config

import (
	"os"
	"path/filepath"
	"strings"
	"testing"
)

func TestWatchManager_AddAndRemove(t *testing.T) {
	tmpDir := t.TempDir()
	cfgPath := filepath.Join(tmpDir, "config.yaml")

	initialYAML := `# Header comment
version: 1
settings:
  conflict: rename
watch:
  - path: ~/Downloads
    recursive: false
# Footer comment
`
	if err := os.WriteFile(cfgPath, []byte(initialYAML), 0644); err != nil {
		t.Fatalf("failed to write test config: %v", err)
	}

	// 1. Add ~/Desktop
	err := AddWatchEntry(cfgPath, WatchEntry{Path: "~/Desktop", Recursive: false})
	if err != nil {
		t.Fatalf("AddWatchEntry failed: %v", err)
	}

	data, err := os.ReadFile(cfgPath)
	if err != nil {
		t.Fatalf("failed to read config: %v", err)
	}
	content := string(data)
	if !strings.Contains(content, "~/Desktop") {
		t.Errorf("expected config to contain '~/Desktop', got:\n%s", content)
	}
	if !strings.Contains(content, "# Header comment") {
		t.Errorf("expected comments to be preserved, got:\n%s", content)
	}

	// 2. Add duplicate should fail
	err = AddWatchEntry(cfgPath, WatchEntry{Path: "~/Desktop", Recursive: false})
	if err == nil {
		t.Fatalf("expected error adding duplicate entry, got nil")
	}

	// 3. Remove ~/Desktop
	err = RemoveWatchEntry(cfgPath, "~/Desktop")
	if err != nil {
		t.Fatalf("RemoveWatchEntry failed: %v", err)
	}

	data, err = os.ReadFile(cfgPath)
	if err != nil {
		t.Fatalf("failed to read config: %v", err)
	}
	content = string(data)
	if strings.Contains(content, "~/Desktop") {
		t.Errorf("expected config to NOT contain '~/Desktop', got:\n%s", content)
	}
	if !strings.Contains(content, "~/Downloads") {
		t.Errorf("expected '~/Downloads' to still be present, got:\n%s", content)
	}

	// 4. Remove non-existent entry should fail
	err = RemoveWatchEntry(cfgPath, "/non/existent/path")
	if err == nil {
		t.Fatalf("expected error removing non-existent folder, got nil")
	}
}
