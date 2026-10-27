// SPDX-License-Identifier: AGPL-3.0-only

package cli

import (
	"fmt"
	"os"
	"path/filepath"

	"github.com/Fizm00/organizer/internal/config"
	"github.com/spf13/cobra"
)

var (
	initForce bool
	initPath  string
)

var initCmd = &cobra.Command{
	Use:   "init",
	Short: "Create a default configuration file",
	Long:  "Create a default configuration file at the standard OS location or specified path.",
	RunE: func(cmd *cobra.Command, args []string) error {
		targetPath := initPath
		if targetPath == "" {
			defaultPath, err := config.DefaultConfigPath()
			if err != nil {
				return fmt.Errorf("failed to determine default config path: %w", err)
			}
			targetPath = defaultPath
		}

		targetPath = config.ExpandPath(targetPath)

		// Check if file already exists
		if _, err := os.Stat(targetPath); err == nil {
			if !initForce {
				return fmt.Errorf("config file already exists at %q (use --force to overwrite)", targetPath)
			}
		}

		// Ensure parent directory exists
		parentDir := filepath.Dir(targetPath)
		if err := os.MkdirAll(parentDir, 0755); err != nil {
			return fmt.Errorf("failed to create config directory %q: %w", parentDir, err)
		}

		// Write default configuration YAML
		if err := os.WriteFile(targetPath, []byte(config.DefaultYAML()), 0644); err != nil {
			return fmt.Errorf("failed to write config file %q: %w", targetPath, err)
		}

		fmt.Fprintf(cmd.OutOrStdout(), "Configuration initialized at: %s\n", targetPath)
		return nil
	},
}

func init() {
	initCmd.Flags().BoolVar(&initForce, "force", false, "overwrite existing configuration file")
	initCmd.Flags().StringVar(&initPath, "path", "", "custom destination path for the configuration file")
	rootCmd.AddCommand(initCmd)
}
