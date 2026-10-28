// SPDX-License-Identifier: AGPL-3.0-only

package app

import (
	"github.com/Fizm00/organizer/internal/version"
)

// VersionInfo holds version and build metadata exposed to the frontend.
type VersionInfo struct {
	Version   string `json:"version"`
	Commit    string `json:"commit"`
	BuildDate string `json:"buildDate"`
}

// SystemService provides system-level capabilities and information.
// It must NOT import Wails packages so that it remains purely unit-testable.
type SystemService struct{}

// NewSystemService creates a new SystemService instance.
func NewSystemService() *SystemService {
	return &SystemService{}
}

// Version returns application version and build metadata.
func (s *SystemService) Version() VersionInfo {
	return VersionInfo{
		Version:   version.Version,
		Commit:    version.Commit,
		BuildDate: version.BuildDate,
	}
}

