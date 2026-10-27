// SPDX-License-Identifier: AGPL-3.0-only

package engine

import (
	"context"
	"os"
	"path/filepath"
	"runtime"
	"strings"
	"testing"
)

func TestSanitizeSegment_ReservedNames(t *testing.T) {
	tests := []struct {
		input    string
		expected string
	}{
		{"CON", "_CON"},
		{"con", "_con"},
		{"CON.txt", "_CON.txt"},
		{"con.pdf", "_con.pdf"},
		{"PRN", "_PRN"},
		{"prn.docx", "_prn.docx"},
		{"AUX", "_AUX"},
		{"aux.log", "_aux.log"},
		{"NUL", "_NUL"},
		{"nul.tar.gz", "_nul.tar.gz"},
		{"COM1", "_COM1"},
		{"com9.dat", "_com9.dat"},
		{"LPT1", "_LPT1"},
		{"lpt9.bin", "_lpt9.bin"},
		// Non-reserved words with similar prefixes should remain untouched
		{"CONSOLE", "CONSOLE"},
		{"contact.txt", "contact.txt"},
		{"auxiliary.pdf", "auxiliary.pdf"},
		{"null.json", "null.json"},
	}

	for _, tc := range tests {
		tc := tc
		t.Run(tc.input, func(t *testing.T) {
			actual := SanitizeSegment(tc.input)
			if actual != tc.expected {
				t.Errorf("SanitizeSegment(%q) = %q, expected %q", tc.input, actual, tc.expected)
			}
		})
	}
}

func TestSanitizeSegment_IllegalCharsAndTrailing(t *testing.T) {
	tests := []struct {
		input    string
		expected string
	}{
		{"file:name", "file_name"},
		{"file<test>*.jpg", "file_test__.jpg"},
		{"trailing dot.", "trailing dot"},
		{"trailing space ", "trailing space"},
		{"trailing both. .", "trailing both"},
		{"...", "_"},
		{"", ""},
		{"CON. ", "_CON"},
		{"\x00\x1Fcontrol", "__control"},
	}

	for _, tc := range tests {
		tc := tc
		t.Run(tc.input, func(t *testing.T) {
			actual := SanitizeSegment(tc.input)
			if actual != tc.expected {
				t.Errorf("SanitizeSegment(%q) = %q, expected %q", tc.input, actual, tc.expected)
			}
		})
	}
}

func TestSanitizePath(t *testing.T) {
	t.Run("preserves drive letters", func(t *testing.T) {
		if runtime.GOOS != "windows" {
			t.Skip("skipping Windows drive letter test on non-Windows OS")
		}
		p := `C:\Users\test\CON\sample:file.txt`
		sanitized := SanitizePath(p)
		expected := `C:\Users\test\_CON\sample_file.txt`
		if filepath.Clean(sanitized) != filepath.Clean(expected) {
			t.Errorf("SanitizePath(%q) = %q, expected %q", p, sanitized, expected)
		}
	})

	t.Run("unix absolute path with illegal segments", func(t *testing.T) {
		if runtime.GOOS == "windows" {
			t.Skip("skipping unix path test on Windows OS")
		}
		p := `/home/test/CON/sample:file.txt`
		sanitized := SanitizePath(p)
		expected := `/home/test/_CON/sample_file.txt`
		if filepath.Clean(sanitized) != filepath.Clean(expected) {
			t.Errorf("SanitizePath(%q) = %q, expected %q", p, sanitized, expected)
		}
	})

	t.Run("relative path with illegal segments", func(t *testing.T) {
		p := filepath.Join("relative", "folder.", "NUL", "bad*file.pdf")
		sanitized := SanitizePath(p)
		expected := filepath.Join("relative", "folder", "_NUL", "bad_file.pdf")
		if filepath.Clean(sanitized) != filepath.Clean(expected) {
			t.Errorf("SanitizePath(%q) = %q, expected %q", p, sanitized, expected)
		}
	})
}

func TestMover_CaseInsensitiveConflict(t *testing.T) {
	tempDir := t.TempDir()
	sourceDir := filepath.Join(tempDir, "Source")
	destDir := filepath.Join(tempDir, "Dest")

	_ = os.MkdirAll(sourceDir, 0755)
	_ = os.MkdirAll(destDir, 0755)

	// Create existing file in Dest with lowercase name
	existingInDest := filepath.Join(destDir, "photo.jpg")
	if err := os.WriteFile(existingInDest, []byte("existing in dest"), 0644); err != nil {
		t.Fatalf("failed to create existing dest file: %v", err)
	}

	// Create source file with UPPERCASE name
	sourceFile := filepath.Join(sourceDir, "PHOTO.JPG")
	if err := os.WriteFile(sourceFile, []byte("new source file"), 0644); err != nil {
		t.Fatalf("failed to create source file: %v", err)
	}

	// Move with conflictStrategy: "rename"
	mover := NewMover("rename")
	pm := PlannedMove{
		Source:   sourceFile,
		Dest:     filepath.Join(destDir, "PHOTO.JPG"),
		RuleName: "Images",
	}

	res, err := mover.Move(context.Background(), pm)
	if err != nil {
		t.Fatalf("unexpected move error: %v", err)
	}

	if runtime.GOOS == "windows" {
		// On Windows case-insensitive filesystem, PHOTO.JPG conflicts with photo.jpg
		// and must be resolved to PHOTO (1).JPG
		if !strings.Contains(res.Dest, "(1)") {
			t.Errorf("expected conflict rename on Windows case-insensitive filesystem, got dest: %s", res.Dest)
		}
		if _, err := os.Stat(res.Dest); err != nil {
			t.Errorf("moved file should exist at %s: %v", res.Dest, err)
		}
	} else {
		// On Linux case-sensitive, PHOTO.JPG can coexist or move cleanly
		if _, err := os.Stat(res.Dest); err != nil {
			t.Errorf("moved file should exist at %s: %v", res.Dest, err)
		}
	}
}

func TestMover_PathLengthLimit(t *testing.T) {
	tempDir := t.TempDir()
	sourceFile := filepath.Join(tempDir, "sample.txt")
	_ = os.WriteFile(sourceFile, []byte("data"), 0644)

	// Construct path exceeding 260 characters
	longDest := filepath.Join(tempDir, strings.Repeat("subfolder_", 25), "sample.txt")

	mover := NewMover("rename")
	pm := PlannedMove{
		Source:   sourceFile,
		Dest:     longDest,
		RuleName: "LongPathRule",
	}

	res, _ := mover.Move(context.Background(), pm)
	if runtime.GOOS == "windows" {
		if !res.Failed || !strings.Contains(res.Reason, "260") {
			t.Errorf("expected move to fail on Windows with clear 260 char limit message, got: %+v", res)
		}
	}
}

func TestMover_IdenticalSourceAndDest(t *testing.T) {
	tempDir := t.TempDir()
	sourceFile := filepath.Join(tempDir, "same.txt")
	_ = os.WriteFile(sourceFile, []byte("data"), 0644)

	mover := NewMover("rename")
	pm := PlannedMove{
		Source:   sourceFile,
		Dest:     sourceFile,
		RuleName: "SelfRule",
	}

	res, err := mover.Move(context.Background(), pm)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if !res.Skipped || !strings.Contains(res.Reason, "identical") {
		t.Errorf("expected skip due to identical source and destination, got: %+v", res)
	}
}
