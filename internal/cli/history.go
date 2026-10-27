// SPDX-License-Identifier: AGPL-3.0-only

package cli

import (
	"fmt"
	"strings"

	"github.com/Fizm00/organizer/internal/history"
	"github.com/spf13/cobra"
)

var (
	historyLimit    int
	historyBatchID  string
	historyFilePath string
)

var historyCmd = &cobra.Command{
	Use:   "history",
	Short: "View operation history and batches",
	Long:  "Inspect recorded file organization batches or view detailed file records for a specific batch.",
	RunE: func(cmd *cobra.Command, args []string) error {
		histPath := historyFilePath
		storage, err := history.NewStorage(histPath)
		if err != nil {
			return err
		}

		out := cmd.OutOrStdout()

		// Case 1: Inspect detailed records for a specific batch
		if strings.TrimSpace(historyBatchID) != "" {
			records, err := storage.Batch(historyBatchID)
			if err != nil {
				return fmt.Errorf("failed to read batch %q: %w", historyBatchID, err)
			}
			if len(records) == 0 {
				fmt.Fprintf(out, "Batch %q not found in history (%s)\n", historyBatchID, storage.Path)
				return nil
			}

			fmt.Fprintf(out, "Batch: %s (%s UTC)\n", historyBatchID, records[0].Time.UTC().Format("2006-01-02 15:04:05"))
			fmt.Fprintf(out, "Records (%d):\n", len(records))
			for i, r := range records {
				fmt.Fprintf(out, "  %d. [%s] %s -> %s (rule: %s, %d bytes)\n",
					i+1, r.Status, r.Source, r.Dest, r.Rule, r.Size)
			}
			return nil
		}

		// Case 2: List recent batch summaries
		summaries, err := storage.Batches(historyLimit)
		if err != nil {
			return fmt.Errorf("failed to load batches: %w", err)
		}
		if len(summaries) == 0 {
			fmt.Fprintf(out, "No history records found in %s\n", storage.Path)
			return nil
		}

		fmt.Fprintf(out, "Recent Batches (%s):\n\n", storage.Path)
		fmt.Fprintf(out, "%-24s %-20s %-7s %-7s %-7s %-8s\n", "BATCH ID", "TIME (UTC)", "TOTAL", "MOVED", "UNDONE", "STATUS")
		fmt.Fprintf(out, "%s\n", strings.Repeat("-", 78))

		for _, b := range summaries {
			statusStr := "active"
			if b.AllUndone {
				statusStr = "undone"
			} else if b.Undone > 0 {
				statusStr = "partial"
			}
			fmt.Fprintf(out, "%-24s %-20s %-7d %-7d %-7d %-8s\n",
				b.ID,
				b.Time.UTC().Format("2006-01-02 15:04:05"),
				b.Total,
				b.Moved,
				b.Undone,
				statusStr,
			)
		}

		return nil
	},
}

func init() {
	historyCmd.Flags().IntVar(&historyLimit, "limit", 10, "maximum number of batches to display")
	historyCmd.Flags().StringVar(&historyBatchID, "batch", "", "view detailed records for a specific batch ID")
	historyCmd.Flags().StringVar(&historyFilePath, "history-file", "", "custom path to history.jsonl file")
	rootCmd.AddCommand(historyCmd)
}
