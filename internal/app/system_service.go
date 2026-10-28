// SPDX-License-Identifier: AGPL-3.0-only

package app

import (
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
	"runtime"

	"github.com/Fizm00/organizer/internal/config"
	"github.com/Fizm00/organizer/internal/version"
)

// FolderPicker defines the interface for native folder selection dialogs (implemented in bootstrap/G6).
type FolderPicker interface {
	PickFolder() (string, error)
}

// AutostartManager defines the interface for platform autostart configuration (implemented in G6).
type AutostartManager interface {
	Get() (bool, error)
	Set(enabled bool) error
}

// SystemService provides system-level capabilities and information.
// It must NOT import Wails packages so that it remains purely unit-testable.
type SystemService struct {
	configPath  string
	historyPath string
	picker      FolderPicker
	autostart   AutostartManager
}

// NewSystemService creates a new SystemService instance.
func NewSystemService() *SystemService {
	return &SystemService{}
}

// SetConfigPath sets the config path used by OpenConfig.
func (s *SystemService) SetConfigPath(path string) {
	s.configPath = path
}

// SetHistoryPath sets the history log path used by OpenHistory.
func (s *SystemService) SetHistoryPath(path string) {
	s.historyPath = path
}

// SetFolderPicker injects a native folder picker implementation.
func (s *SystemService) SetFolderPicker(picker FolderPicker) {
	s.picker = picker
}

// SetAutostartManager injects a platform autostart manager implementation.
func (s *SystemService) SetAutostartManager(mgr AutostartManager) {
	s.autostart = mgr
}

// Version returns application version and build metadata.
func (s *SystemService) Version() VersionInfo {
	return VersionInfo{
		Version:   version.Version,
		Commit:    version.Commit,
		BuildDate: version.BuildDate,
	}
}

// RevealPath opens the operating system file manager with the specified path selected.
func (s *SystemService) RevealPath(path string) error {
	cleanPath := filepath.Clean(path)
	var cmd *exec.Cmd

	switch runtime.GOOS {
	case "windows":
		cmd = exec.Command("explorer", "/select,", cleanPath)
	case "darwin":
		cmd = exec.Command("open", "-R", cleanPath)
	default:
		// Linux / other
		cmd = exec.Command("xdg-open", filepath.Dir(cleanPath))
	}

	return cmd.Start()
}

// OpenConfig opens the current configuration file in the system default text editor.
func (s *SystemService) OpenConfig() error {
	if s.configPath == "" {
		return fmt.Errorf("config path is not configured")
	}

	var cmd *exec.Cmd
	switch runtime.GOOS {
	case "windows":
		cmd = exec.Command("cmd", "/c", "start", "", s.configPath)
	case "darwin":
		cmd = exec.Command("open", s.configPath)
	default:
		cmd = exec.Command("xdg-open", s.configPath)
	}

	return cmd.Start()
}

// OpenHistory opens the history log file in the system default text editor.
func (s *SystemService) OpenHistory() error {
	if s.historyPath == "" {
		return fmt.Errorf("history path is not configured")
	}

	var cmd *exec.Cmd
	switch runtime.GOOS {
	case "windows":
		cmd = exec.Command("cmd", "/c", "start", "", s.historyPath)
	case "darwin":
		cmd = exec.Command("open", s.historyPath)
	default:
		cmd = exec.Command("xdg-open", s.historyPath)
	}

	return cmd.Start()
}

// PickFolder invokes the injected folder picker, if available.
func (s *SystemService) PickFolder() (string, error) {
	if s.picker == nil {
		return "", NewAppError(ErrInternal, "Folder picker not initialized", "Dialog will be available when running inside GUI", "")
	}
	return s.picker.PickFolder()
}

// GetAutostart returns whether autostart on system boot is enabled.
func (s *SystemService) GetAutostart() (bool, error) {
	if s.autostart == nil {
		return false, nil
	}
	return s.autostart.Get()
}

// SetAutostart configures whether the app launches automatically on system boot.
func (s *SystemService) SetAutostart(enabled bool) error {
	if s.autostart == nil {
		return NewAppError(ErrInternal, "Autostart manager not initialized", "", "")
	}
	return s.autostart.Set(enabled)
}

// CountFiles returns the count of regular files directly inside the given directory without blocking.
func (s *SystemService) CountFiles(folderPath string) (int, error) {
	expanded := config.ExpandPath(folderPath)
	entries, err := os.ReadDir(expanded)
	if err != nil {
		return 0, err
	}
	count := 0
	for _, entry := range entries {
		if !entry.IsDir() {
			count++
		}
	}
	return count, nil
}
