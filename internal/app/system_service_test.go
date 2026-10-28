// SPDX-License-Identifier: AGPL-3.0-only

package app

import (
	"testing"

	"github.com/Fizm00/organizer/internal/version"
)

func TestSystemService_Version(t *testing.T) {
	service := NewSystemService()
	info := service.Version()

	if info.Version != version.Version {
		t.Errorf("expected version %q, got %q", version.Version, info.Version)
	}
	if info.Commit != version.Commit {
		t.Errorf("expected commit %q, got %q", version.Commit, info.Commit)
	}
	if info.BuildDate != version.BuildDate {
		t.Errorf("expected buildDate %q, got %q", version.BuildDate, info.BuildDate)
	}
}

