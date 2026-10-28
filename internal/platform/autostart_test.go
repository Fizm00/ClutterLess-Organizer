// SPDX-License-Identifier: AGPL-3.0-only

package platform

import (
	"strings"
	"testing"
)

func TestGenerateDesktopEntry(t *testing.T) {
	entry := GenerateDesktopEntry("/usr/local/bin/cless-gui", true)
	if !strings.Contains(entry, "Exec=/usr/local/bin/cless-gui --hidden") {
		t.Errorf("expected Exec with --hidden flag, got:\n%s", entry)
	}
	if !strings.Contains(entry, "Name=ClutterLess") {
		t.Errorf("expected Name=ClutterLess, got:\n%s", entry)
	}

	entryVisible := GenerateDesktopEntry("/usr/local/bin/cless-gui", false)
	if !strings.Contains(entryVisible, "Exec=/usr/local/bin/cless-gui\n") {
		t.Errorf("expected Exec without --hidden, got:\n%s", entryVisible)
	}
}

func TestGenerateLaunchAgentPlist(t *testing.T) {
	plist := GenerateLaunchAgentPlist("", "/Applications/ClutterLess.app/Contents/MacOS/cless-gui", true)
	if !strings.Contains(plist, "<string>com.clutterless.cless-gui</string>") {
		t.Errorf("expected default label, got:\n%s", plist)
	}
	if !strings.Contains(plist, "<string>--hidden</string>") {
		t.Errorf("expected --hidden argument, got:\n%s", plist)
	}
	if !strings.Contains(plist, "<key>RunAtLoad</key>\n\t<true/>") {
		t.Errorf("expected RunAtLoad true, got:\n%s", plist)
	}
}

func TestFormatWindowsRegistryCommand(t *testing.T) {
	tests := []struct {
		name     string
		exe      string
		hidden   bool
		expected string
	}{
		{
			name:     "path without spaces with hidden",
			exe:      `C:\Tools\cless-gui.exe`,
			hidden:   true,
			expected: `C:\Tools\cless-gui.exe --hidden`,
		},
		{
			name:     "path with spaces with hidden",
			exe:      `C:\Program Files\ClutterLess\cless-gui.exe`,
			hidden:   true,
			expected: `"C:\Program Files\ClutterLess\cless-gui.exe" --hidden`,
		},
		{
			name:     "path with spaces without hidden",
			exe:      `C:\Program Files\ClutterLess\cless-gui.exe`,
			hidden:   false,
			expected: `"C:\Program Files\ClutterLess\cless-gui.exe"`,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			actual := FormatWindowsRegistryCommand(tt.exe, tt.hidden)
			if actual != tt.expected {
				t.Errorf("expected %q, got %q", tt.expected, actual)
			}
		})
	}
}

func TestParseWindowsCommandExe(t *testing.T) {
	tests := []struct {
		cmd      string
		expected string
	}{
		{
			cmd:      `"C:\Program Files\ClutterLess\cless-gui.exe" --hidden`,
			expected: `C:\Program Files\ClutterLess\cless-gui.exe`,
		},
		{
			cmd:      `C:\Tools\cless-gui.exe --hidden`,
			expected: `C:\Tools\cless-gui.exe`,
		},
		{
			cmd:      `"C:\cless-gui.exe"`,
			expected: `C:\cless-gui.exe`,
		},
		{
			cmd:      ``,
			expected: ``,
		},
	}

	for _, tt := range tests {
		t.Run(tt.cmd, func(t *testing.T) {
			actual := ParseWindowsCommandExe(tt.cmd)
			if actual != tt.expected {
				t.Errorf("expected %q, got %q", tt.expected, actual)
			}
		})
	}
}
