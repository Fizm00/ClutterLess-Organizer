// SPDX-License-Identifier: AGPL-3.0-only

package cli

import (
	"fmt"
	"os"
	"os/exec"
	"runtime"

	"github.com/Fizm00/organizer/internal/config"
	"github.com/spf13/cobra"
)

var configCmd = &cobra.Command{
	Use:   "config",
	Short: "Manage organizer configuration",
	Long:  "Commands to validate, inspect, edit, and manage configuration files.",
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

var configPathCmd = &cobra.Command{
	Use:   "path",
	Short: "Print the path to the active configuration file",
	RunE: func(cmd *cobra.Command, args []string) error {
		path, err := resolveConfigPath()
		if err != nil {
			return fmt.Errorf("failed to locate config file: %w", err)
		}
		fmt.Fprintln(cmd.OutOrStdout(), path)
		return nil
	},
}

var configEditCmd = &cobra.Command{
	Use:   "edit",
	Short: "Open the configuration file in your text editor",
	RunE: func(cmd *cobra.Command, args []string) error {
		path, err := resolveConfigPath()
		if err != nil {
			return fmt.Errorf("failed to locate config file: %w", err)
		}

		editor := os.Getenv("EDITOR")
		if editor == "" {
			if runtime.GOOS == "windows" {
				editor = "notepad.exe"
			} else {
				editor = "nano"
			}
		}

		execCmd := exec.Command(editor, path)
		execCmd.Stdin = os.Stdin
		execCmd.Stdout = os.Stdout
		execCmd.Stderr = os.Stderr
		return execCmd.Run()
	},
}

func init() {
	configCmd.AddCommand(configValidateCmd)
	configCmd.AddCommand(configPathCmd)
	configCmd.AddCommand(configEditCmd)
	rootCmd.AddCommand(configCmd)
}
