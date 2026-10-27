// SPDX-License-Identifier: AGPL-3.0-only

package version

import (
	"testing"
)

func TestInfo_FormatsDefaultValues(t *testing.T) {
	// Reset to test values
	origVersion, origCommit, origBuildDate := Version, Commit, BuildDate
	defer func() {
		Version, Commit, BuildDate = origVersion, origCommit, origBuildDate
	}()

	Version = "0.3.0"
	Commit = "none"
	BuildDate = "unknown"

	expected := "cless version 0.3.0 (commit: none, built: unknown)"
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

	Version = "v0.3.0"
	Commit = "abcdef1"
	BuildDate = "2026-10-28T00:00:00Z"

	expected := "cless version v0.3.0 (commit: abcdef1, built: 2026-10-28T00:00:00Z)"
	actual := Info()

	if actual != expected {
		t.Errorf("expected %q, got %q", expected, actual)
	}
}
