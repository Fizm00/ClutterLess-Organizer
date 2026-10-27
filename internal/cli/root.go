// SPDX-License-Identifier: AGPL-3.0-only

// Package cli implements the command-line interface for organizer.
package cli

import (
	"os"

	"github.com/spf13/cobra"
)

var rootCmd = &cobra.Command{
	Use:   "organizer",
	Short: "Smart local file organizer and automator",
	Long: `ClutterLess Organizer (organizer / cless) is a cross-platform CLI tool that
watches messy folders and automatically organizes files based on user-defined rules.`,
}

// Execute adds all child commands to the root command and sets flags appropriately.
// It is called by main.main().
func Execute() {
	if err := rootCmd.Execute(); err != nil {
		os.Exit(1)
	}
}
