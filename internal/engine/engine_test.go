// SPDX-License-Identifier: AGPL-3.0-only

package engine

import (
	"os"
	"path/filepath"
	"regexp"
	"strings"
	"testing"
	"time"

	"github.com/Fizm00/organizer/internal/config"
)

func TestExtractExtAndBaseName(t *testing.T) {
	tests := []struct {
		input        string
		expectedExt  string
		expectedBase string
	}{
		{"image.JPG", "jpg", "image"},
		{"archive.tar.gz", "gz", "archive.tar"},
		{"document.pdf", "pdf", "document"},
		{"Makefile", "", "Makefile"},
		{".gitignore", "gitignore", ""},
	}

	for _, tc := range tests {
		tc := tc
		t.Run(tc.input, func(t *testing.T) {
			ext := ExtractExt(tc.input)
			if ext != tc.expectedExt {
				t.Errorf("ExtractExt(%q): expected %q, got %q", tc.input, tc.expectedExt, ext)
			}
			base := ExtractBaseName(tc.input)
			if base != tc.expectedBase {
				t.Errorf("ExtractBaseName(%q): expected %q, got %q", tc.input, tc.expectedBase, base)
			}
		})
	}
}

func TestSanitizeSegment(t *testing.T) {
	tests := []struct {
		input    string
		expected string
	}{
		{"normal_name", "normal_name"},
		{"invalid<char>:here*?", "invalid_char__here__"},
		{"CON", "_CON"},
		{"nul.txt", "_nul.txt"},
		{"trailing_dots...", "trailing_dots"},
		{"trailing_spaces   ", "trailing_spaces"},
	}

	for _, tc := range tests {
		tc := tc
		t.Run(tc.input, func(t *testing.T) {
			actual := SanitizeSegment(tc.input)
			if actual != tc.expected {
				t.Errorf("SanitizeSegment(%q): expected %q, got %q", tc.input, tc.expected, actual)
			}
		})
	}
}

func TestRenderMoveTo(t *testing.T) {
	fixedTime := time.Date(2026, time.October, 28, 12, 0, 0, 0, time.UTC)

	t.Run("renders all variables", func(t *testing.T) {
		templateStr := "Sorted/{year}/{month}-{day}/{ext}/{name}"
		rendered, err := RenderMoveTo(templateStr, "report.PDF", fixedTime)
		if err != nil {
			t.Fatalf("unexpected error: %v", err)
		}

		expected := filepath.Join("Sorted", "2026", "10-28", "pdf", "report")
		if rendered != expected {
			t.Errorf("expected %q, got %q", expected, rendered)
		}
	})

	t.Run("handles file without extension as noext", func(t *testing.T) {
		templateStr := "Sorted/{ext}/{name}"
		rendered, err := RenderMoveTo(templateStr, "Makefile", fixedTime)
		if err != nil {
			t.Fatalf("unexpected error: %v", err)
		}

		expected := filepath.Join("Sorted", "noext", "Makefile")
		if rendered != expected {
			t.Errorf("expected %q, got %q", expected, rendered)
		}
	})
}

func TestMatcher(t *testing.T) {
	now := time.Date(2026, time.October, 28, 12, 0, 0, 0, time.UTC)
	minSize := int64(1024)
	olderThan := 24 * time.Hour

	rules := []Rule{
		{
			Name: "Invoices",
			Match: Match{
				NameRegex: regexp.MustCompile(`(?i)(invoice|faktur)`),
			},
			MoveTo: "Finance",
		},
		{
			Name: "BigArchives",
			Match: Match{
				Ext:     []string{"zip", "gz"},
				MinSize: &minSize,
			},
			MoveTo: "Archives/Big",
		},
		{
			Name: "OldDocuments",
			Match: Match{
				Ext:       []string{"pdf", "docx"},
				OlderThan: &olderThan,
			},
			MoveTo: "Docs/Old",
		},
		{
			Name: "AllDocuments",
			Match: Match{
				Ext: []string{"pdf", "docx"},
			},
			MoveTo: "Docs/Recent",
		},
	}

	t.Run("matches regex", func(t *testing.T) {
		fi := FileInfo{Name: "my_invoice_2026.pdf", ModTime: now, Size: 500}
		matched := MatchFirst(fi, rules, now)
		if matched == nil || matched.Name != "Invoices" {
			t.Errorf("expected 'Invoices', got %v", matched)
		}
	})

	t.Run("matches double extension .tar.gz based on final gz and min_size", func(t *testing.T) {
		fi := FileInfo{Name: "backup.tar.gz", ModTime: now, Size: 2048}
		matched := MatchFirst(fi, rules, now)
		if matched == nil || matched.Name != "BigArchives" {
			t.Errorf("expected 'BigArchives', got %v", matched)
		}
	})

	t.Run("fails min_size condition (AND semantics)", func(t *testing.T) {
		fi := FileInfo{Name: "tiny.gz", ModTime: now, Size: 100}
		matched := MatchFirst(fi, rules, now)
		if matched != nil {
			t.Errorf("expected nil (size too small), got %v", matched)
		}
	})

	t.Run("first-match-wins: old doc matches OldDocuments before AllDocuments", func(t *testing.T) {
		twoDaysAgo := now.Add(-48 * time.Hour)
		fi := FileInfo{Name: "statement.pdf", ModTime: twoDaysAgo, Size: 500}
		matched := MatchFirst(fi, rules, now)
		if matched == nil || matched.Name != "OldDocuments" {
			t.Errorf("expected 'OldDocuments', got %v", matched)
		}
	})

	t.Run("recent doc falls through to AllDocuments", func(t *testing.T) {
		oneHourAgo := now.Add(-1 * time.Hour)
		fi := FileInfo{Name: "statement.pdf", ModTime: oneHourAgo, Size: 500}
		matched := MatchFirst(fi, rules, now)
		if matched == nil || matched.Name != "AllDocuments" {
			t.Errorf("expected 'AllDocuments', got %v", matched)
		}
	})

	t.Run("case insensitive extension matching (JPG vs jpg)", func(t *testing.T) {
		imgRule := Rule{
			Name: "Images",
			Match: Match{
				Ext: []string{"jpg", "png"},
			},
			MoveTo: "Images",
		}
		fi := FileInfo{Name: "PHOTO.JPG", ModTime: now, Size: 100}
		if !imgRule.Matches(fi, now) {
			t.Errorf("expected PHOTO.JPG to match jpg extension rule")
		}
	})

	t.Run("file without extension matches glob", func(t *testing.T) {
		globRule := Rule{
			Name: "Docker",
			Match: Match{
				NameGlob: []string{"Dockerfile*"},
			},
			MoveTo: "Build",
		}
		fi := FileInfo{Name: "Dockerfile", ModTime: now, Size: 100}
		if !globRule.Matches(fi, now) {
			t.Errorf("expected Dockerfile to match Dockerfile* glob rule")
		}
	})
}

func TestPlanner(t *testing.T) {
	tempDir := t.TempDir()
	now := time.Now()

	// Create test files
	files := map[string]string{
		"sample.pdf":       "pdf content",
		"download.part":    "partial download",
		"desktop.ini":      "ini content",
		"normal.txt":       "txt content",
		".hidden_file.txt": "hidden content",
	}

	for name, content := range files {
		p := filepath.Join(tempDir, name)
		if err := os.WriteFile(p, []byte(content), 0600); err != nil {
			t.Fatalf("failed to create file %q: %v", name, err)
		}
	}

	// Create a subdirectory (should be ignored)
	subDir := filepath.Join(tempDir, "subfolder")
	if err := os.Mkdir(subDir, 0755); err != nil {
		t.Fatalf("failed to create subfolder: %v", err)
	}

	ignoreHidden := true
	settings := config.Settings{
		IgnoreExt:    []string{"part", "tmp"},
		IgnoreNames:  []string{"desktop.ini"},
		IgnoreHidden: &ignoreHidden,
		FallbackDir:  "",
	}

	rules := []Rule{
		{
			Name: "PDFs",
			Match: Match{
				Ext: []string{"pdf"},
			},
			MoveTo: filepath.Join(tempDir, "PDF_Dest"),
		},
	}

	planned, err := Plan(tempDir, rules, settings, now)
	if err != nil {
		t.Fatalf("unexpected plan error: %v", err)
	}

	results := make(map[string]PlannedMove)
	for _, p := range planned {
		results[filepath.Base(p.Source)] = p
	}

	// 1. sample.pdf must match rule PDFs
	if p, ok := results["sample.pdf"]; !ok || p.Skipped || p.RuleName != "PDFs" {
		t.Errorf("sample.pdf expected matched PDFs, got: %+v", p)
	}

	// 2. download.part must be ignored by extension
	if p, ok := results["download.part"]; !ok || !p.Skipped || !strings.Contains(p.Reason, "ignored extension") {
		t.Errorf("download.part expected skipped with ignored extension, got: %+v", p)
	}

	// 3. desktop.ini must be ignored by name
	if p, ok := results["desktop.ini"]; !ok || !p.Skipped || !strings.Contains(p.Reason, "ignored name") {
		t.Errorf("desktop.ini expected skipped with ignored name, got: %+v", p)
	}

	// 4. .hidden_file.txt must be ignored by hidden
	if p, ok := results[".hidden_file.txt"]; !ok || !p.Skipped || !strings.Contains(p.Reason, "hidden") {
		t.Errorf(".hidden_file.txt expected skipped as hidden, got: %+v", p)
	}

	// 5. normal.txt is unmatched
	if p, ok := results["normal.txt"]; !ok || !p.Skipped || p.Reason != "unmatched" {
		t.Errorf("normal.txt expected unmatched, got: %+v", p)
	}

	// 6. Subfolder must not be in planned moves
	if _, ok := results["subfolder"]; ok {
		t.Errorf("subfolder directory should be completely ignored")
	}
}
