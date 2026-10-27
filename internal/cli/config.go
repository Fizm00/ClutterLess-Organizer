// SPDX-License-Identifier: AGPL-3.0-only

package cli

import (
	"fmt"
	"os"

	"github.com/Fizm00/organizer/internal/config"
	"github.com/spf13/cobra"
)

var configCmd = &cobra.Command{
	Use:   "config",
	Short: "Manage organizer configuration",
	Long:  "Commands to validate, inspect, and manage configuration files.",
}

var configValidateCmd = &cobra.Command{
	Use:   "validate",
	Short: "Validate configuration syntax and rules",
	Long:  "Check the configuration file for syntax errors, missing fields, broken regex, or invalid rules.",
	RunE: func(cmd *cobra.Command, args []string) error {
		path, err := resolveConfigPath()
		if err != nil {
			return fmt.Errorf("failed to locate config file: %w", err)
		}

		_, err = config.Load(path)
		if err != nil {
			fmt.Fprintf(cmd.ErrOrStderr(), "Configuration error in %s:\n%v\n", path, err)
			os.Exit(2)
		}

		fmt.Fprintf(cmd.OutOrStdout(), "Configuration is valid: %s\n", path)
		return nil
	},
}

func init() {
	configCmd.AddCommand(configValidateCmd)
	rootCmd.AddCommand(configCmd)
}
