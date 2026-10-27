// SPDX-License-Identifier: AGPL-3.0-only

// Package cli implements the command-line interface for organizer.
package cli

import (
	"fmt"
	"os"

	"github.com/Fizm00/organizer/internal/config"
	"github.com/spf13/cobra"
)

var (
	cfgFile string
	verbose bool
	noColor bool
)

var rootCmd = &cobra.Command{
	Use:   "organizer",
	Short: "Smart local file organizer and automator",
	Long: `ClutterLess Organizer (organizer / cless) is a cross-platform CLI tool that
watches messy folders and automatically organizes files based on user-defined rules.`,
	SilenceUsage:  true,
	SilenceErrors: true,
}

// Execute adds all child commands to the root command and sets flags appropriately.
// It is called by main.main().
func Execute() {
	if err := rootCmd.Execute(); err != nil {
		fmt.Fprintf(os.Stderr, "Error: %v\n", err)
		os.Exit(1)
	}
}

func init() {
	rootCmd.PersistentFlags().StringVar(&cfgFile, "config", "", "config file override")
	rootCmd.PersistentFlags().BoolVarP(&verbose, "verbose", "v", false, "debug logging")
	rootCmd.PersistentFlags().BoolVar(&noColor, "no-color", false, "disable colored output")
}

// resolveConfigPath returns the config file path from --config or the OS default location.
func resolveConfigPath() (string, error) {
	if cfgFile != "" {
		return cfgFile, nil
	}
	return config.DefaultConfigPath()
}
