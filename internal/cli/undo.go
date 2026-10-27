// SPDX-License-Identifier: AGPL-3.0-only

package cli

import (
	"context"
	"fmt"
	"os"

	"github.com/Fizm00/organizer/internal/config"
	"github.com/Fizm00/organizer/internal/engine"
	"github.com/Fizm00/organizer/internal/history"
	"github.com/spf13/cobra"
)

var (
	undoBatchID   string
	undoDryRun    bool
	undoHistFile  string
)

var undoCmd = &cobra.Command{
	Use:   "undo",
	Short: "Reverse previous organization moves",
	Long:  "Reverse a batch of file moves, restoring files back to their original locations safely.",
	RunE: func(cmd *cobra.Command, args []string) error {
		path, err := resolveConfigPath()
		var cfg *config.Config
		if err == nil {
			loadedCfg, loadErr := config.Load(path)
			if loadErr == nil {
				cfg = loadedCfg
			}
		}
		if cfg == nil {
			cfg = config.Default()
		}

		storage, err := history.NewStorage(undoHistFile)
		if err != nil {
			return err
		}

		organizer := engine.NewOrganizer(cfg)
		organizer.History = storage

		dryRun, _ := cmd.Flags().GetBool("dry-run")
		batchID, _ := cmd.Flags().GetString("batch")

		out := cmd.OutOrStdout()

		result, err := organizer.Undo(context.Background(), batchID, dryRun)
		if err != nil {
			return err
		}

		if result.Message != "" {
			fmt.Fprintln(out, result.Message)
			return nil
		}

		prefix := "[RESTORE]"
		if dryRun {
			prefix = "[DRY-RUN]"
		}

		for _, m := range result.Moves {
			if m.Failed {
				fmt.Fprintf(out, "[FAIL] %s -> %s (error: %s)\n", m.CurrentDest, m.OriginalSource, m.Reason)
			} else if m.Skipped {
				fmt.Fprintf(out, "[SKIP] %s (%s)\n", m.CurrentDest, m.Reason)
			} else {
				fmt.Fprintf(out, "%s %s -> %s\n", prefix, m.CurrentDest, m.RestoredTo)
			}
		}

		fmt.Fprintf(out, "\nSummary: batch %s, restored %d, skipped %d, failed %d\n",
			result.BatchID, result.Restored, result.Skipped, result.Failed)

		if result.Failed > 0 {
			os.Exit(3)
		}

		return nil
	},
}

func init() {
	undoCmd.Flags().StringVar(&undoBatchID, "batch", "", "specific batch ID to undo (defaults to latest active batch)")
	undoCmd.Flags().BoolVar(&undoDryRun, "dry-run", false, "preview undo moves without modifying files")
	undoCmd.Flags().StringVar(&undoHistFile, "history-file", "", "custom path to history.jsonl file")
	rootCmd.AddCommand(undoCmd)
}
