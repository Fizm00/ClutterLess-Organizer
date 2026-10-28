// SPDX-License-Identifier: AGPL-3.0-only

package platform

import (
	"fmt"
	"os"
	"path/filepath"
	"strings"
)

const (
	// WindowsRunRegistrySubKey is the per-user registry subkey where autostart entries are registered.
	// Requires zero administrator privileges and cleanly supports arguments such as --hidden.
	WindowsRunRegistrySubKey = `Software\Microsoft\Windows\CurrentVersion\Run`

	// DefaultAutostartIdentifier is the entry name used across platforms.
	DefaultAutostartIdentifier = "ClutterLess"

	// MacOSLaunchAgentLabel is the reverse-DNS identifier for the launchd agent on macOS.
	MacOSLaunchAgentLabel = "com.clutterless.cless-gui"
)

// GenerateDesktopEntry generates the content of an XDG autostart .desktop file for Linux.
func GenerateDesktopEntry(execPath string, hidden bool) string {
	args := ""
	if hidden {
		args = " --hidden"
	}
	return fmt.Sprintf(`[Desktop Entry]
Type=Application
Version=1.0
Name=ClutterLess
GenericName=File Organizer
Comment=Smart Local File Organizer & Automator
Exec=%s%s
Terminal=false
Categories=Utility;System;
StartupNotify=false
X-GNOME-Autostart-enabled=true
`, execPath, args)
}

// GenerateLaunchAgentPlist generates the XML content of a macOS LaunchAgent property list.
func GenerateLaunchAgentPlist(label, execPath string, hidden bool) string {
	if label == "" {
		label = MacOSLaunchAgentLabel
	}
	argsXML := fmt.Sprintf("\t\t<string>%s</string>\n", execPath)
	if hidden {
		argsXML += "\t\t<string>--hidden</string>\n"
	}

	return fmt.Sprintf(`<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
	<key>Label</key>
	<string>%s</string>
	<key>ProgramArguments</key>
	<array>
%s	</array>
	<key>RunAtLoad</key>
	<true/>
	<key>KeepAlive</key>
	<false/>
</dict>
</plist>
`, label, argsXML)
}

// FormatWindowsRegistryCommand prepares the command string stored in HKCU\Software\Microsoft\Windows\CurrentVersion\Run.
// If the path contains spaces, it is safely enclosed in double quotes.
func FormatWindowsRegistryCommand(exePath string, hidden bool) string {
	cleanExe := filepath.Clean(exePath)
	var cmd string
	if strings.ContainsAny(cleanExe, " \t") {
		cmd = fmt.Sprintf(`"%s"`, cleanExe)
	} else {
		cmd = cleanExe
	}
	if hidden {
		cmd += " --hidden"
	}
	return cmd
}

// ParseWindowsCommandExe extracts the target executable path from a Windows registry command string.
func ParseWindowsCommandExe(cmd string) string {
	trimmed := strings.TrimSpace(cmd)
	if trimmed == "" {
		return ""
	}
	if trimmed[0] == '"' {
		end := strings.IndexByte(trimmed[1:], '"')
		if end >= 0 {
			return trimmed[1 : 1+end]
		}
		return trimmed[1:]
	}
	if idx := strings.IndexAny(trimmed, " \t"); idx >= 0 {
		return trimmed[:idx]
	}
	return trimmed
}

// LinuxAutostartFilePath returns the target file path in $XDG_CONFIG_HOME/autostart/.
func LinuxAutostartFilePath() (string, error) {
	configHome := os.Getenv("XDG_CONFIG_HOME")
	if configHome == "" {
		home, err := os.UserHomeDir()
		if err != nil {
			return "", err
		}
		configHome = filepath.Join(home, ".config")
	}
	return filepath.Join(configHome, "autostart", "clutterless.desktop"), nil
}

// MacOSLaunchAgentFilePath returns the target file path in ~/Library/LaunchAgents/.
func MacOSLaunchAgentFilePath(label string) (string, error) {
	if label == "" {
		label = MacOSLaunchAgentLabel
	}
	home, err := os.UserHomeDir()
	if err != nil {
		return "", err
	}
	return filepath.Join(home, "Library", "LaunchAgents", fmt.Sprintf("%s.plist", label)), nil
}

