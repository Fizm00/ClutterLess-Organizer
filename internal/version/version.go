// SPDX-License-Identifier: AGPL-3.0-only

// Package version provides application version and build metadata.
package version

import "fmt"

// Build information injected via ldflags during build.
var (
	// Version is the current version of the application.
	Version = "1.0.0"
	// Commit is the git commit hash the binary was built from.
	Commit = "none"
	// BuildDate is the date and time when the binary was built.
	BuildDate = "unknown"
)

// Info returns a human-readable formatted version string.
func Info() string {
	return fmt.Sprintf("cless version %s (commit: %s, built: %s)", Version, Commit, BuildDate)
}
