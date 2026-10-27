// SPDX-License-Identifier: AGPL-3.0-only

package cli

import (
	"fmt"
	"os"

	"github.com/Fizm00/organizer/internal/config"
	"github.com/spf13/cobra"
)

var (
	folderRecursive bool
)

var folderCmd = &cobra.Command{
	Use:     "folder",
	Aliases: []string{"folders", "dir", "dirs"},
	Short:   "Manage watched folders in configuration",
	Long:    "List, add, or remove folders that cless monitors and organizes.",
	RunE: func(cmd *cobra.Command, args []string) error {
		return runFolderList(cmd)
	},
}

var folderListCmd = &cobra.Command{
	Use:   "list",
	Short: "List all watched folders",
	RunE: func(cmd *cobra.Command, args []string) error {
		return runFolderList(cmd)
	},
}

func runFolderList(cmd *cobra.Command) error {
	path, err := resolveConfigPath()
	if err != nil {
		return fmt.Errorf("failed to locate config file: %w", err)
	}

	cfg, err := config.Load(path)
	if err != nil {
		return fmt.Errorf("failed to load config %q: %w", path, err)
	}

	out := cmd.OutOrStdout()
	if len(cfg.Watch) == 0 {
		fmt.Fprintln(out, "No watched folders configured.")
		fmt.Fprintln(out, "Add one with: cless folder add <path>")
		return nil
	}

	fmt.Fprintf(out, "Watched folders in %s (%d):\n", path, len(cfg.Watch))
	for _, w := range cfg.Watch {
		expanded := config.ExpandPath(w.Path)
		recStr := ""
		if w.Recursive {
			recStr = " [recursive]"
		}
		if expanded != w.Path {
			fmt.Fprintf(out, "  - %s (%s)%s\n", w.Path, expanded, recStr)
		} else {
			fmt.Fprintf(out, "  - %s%s\n", w.Path, recStr)
		}
	}
	return nil
}

var folderAddCmd = &cobra.Command{
	Use:   "add <path>",
	Short: "Add a folder to watched folders",
	Args:  cobra.ExactArgs(1),
	RunE: func(cmd *cobra.Command, args []string) error {
		folderPath := args[0]
		path, err := resolveConfigPath()
		if err != nil {
			return fmt.Errorf("failed to locate config file: %w", err)
		}

		// Check if folder exists on disk, warn if not
		expanded := config.ExpandPath(folderPath)
		if fi, err := os.Stat(expanded); err != nil || !fi.IsDir() {
			fmt.Fprintf(cmd.ErrOrStderr(), "Notice: folder %q (%s) does not exist yet on disk.\n", folderPath, expanded)
		}

		entry := config.WatchEntry{
			Path:      folderPath,
			Recursive: folderRecursive,
		}

		if err := config.AddWatchEntry(path, entry); err != nil {
			return err
		}

		out := cmd.OutOrStdout()
		fmt.Fprintf(out, "Successfully added %q to watched folders.\n", folderPath)
		fmt.Fprintln(out, "Run 'cless run --dry-run' to preview or 'cless watch' to monitor live.")
		return nil
	},
}

var folderRemoveCmd = &cobra.Command{
	Use:     "remove <path>",
	Aliases: []string{"rm", "delete"},
	Short:   "Remove a folder from watched folders",
	Args:    cobra.ExactArgs(1),
	RunE: func(cmd *cobra.Command, args []string) error {
		folderPath := args[0]
		path, err := resolveConfigPath()
		if err != nil {
			return fmt.Errorf("failed to locate config file: %w", err)
		}

		if err := config.RemoveWatchEntry(path, folderPath); err != nil {
			return err
		}

		fmt.Fprintf(cmd.OutOrStdout(), "Successfully removed %q from watched folders.\n", folderPath)
		return nil
	},
}

func init() {
	folderAddCmd.Flags().BoolVarP(&folderRecursive, "recursive", "r", false, "watch subfolders recursively")

	folderCmd.AddCommand(folderListCmd)
	folderCmd.AddCommand(folderAddCmd)
	folderCmd.AddCommand(folderRemoveCmd)

	rootCmd.AddCommand(folderCmd)
}
