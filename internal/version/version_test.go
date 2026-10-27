// SPDX-License-Identifier: AGPL-3.0-only

package version

import (
	"testing"
)

func TestInfo_FormatsDefaultValues(t *testing.T) {
	// Reset to default values
	origVersion, origCommit, origBuildDate := Version, Commit, BuildDate
	defer func() {
		Version, Commit, BuildDate = origVersion, origCommit, origBuildDate
	}()

	Version = "dev"
	Commit = "none"
	BuildDate = "unknown"

	expected := "organizer version dev (commit: none, built: unknown)"
	actual := Info()

	if actual != expected {
		t.Errorf("expected %q, got %q", expected, actual)
	}
}

func TestInfo_FormatsCustomValues(t *testing.T) {
	origVersion, origCommit, origBuildDate := Version, Commit, BuildDate
	defer func() {
		Version, Commit, BuildDate = origVersion, origCommit, origBuildDate
	}()

	Version = "v0.1.0"
	Commit = "abcdef1"
	BuildDate = "2026-10-28T00:00:00Z"

	expected := "organizer version v0.1.0 (commit: abcdef1, built: 2026-10-28T00:00:00Z)"
	actual := Info()

	if actual != expected {
		t.Errorf("expected %q, got %q", expected, actual)
	}
}
