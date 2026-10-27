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

var runCmd = &cobra.Command{
	Use:   "run",
	Short: "Organize files once",
	Long:  "Scan watched directories (or a specified directory) and organize files according to configured rules.",
	RunE: func(cmd *cobra.Command, args []string) error {
		path, err := resolveConfigPath()
		if err != nil {
			return fmt.Errorf("failed to locate config file: %w", err)
		}

		cfg, err := config.Load(path)
		if err != nil {
			return fmt.Errorf("failed to load config %q: %w", path, err)
		}

		dryRun, _ := cmd.Flags().GetBool("dry-run")
		dirOverride, _ := cmd.Flags().GetString("dir")
		histFile, _ := cmd.Flags().GetString("history-file")

		organizer := engine.NewOrganizer(cfg)
		if histFile != "" {
			if h, err := history.NewStorage(histFile); err == nil {
				organizer.History = h
			}
		}

		out := cmd.OutOrStdout()

		opts := engine.RunOptions{
			Dir:    dirOverride,
			DryRun: dryRun,
		}

		result, err := organizer.Run(context.Background(), opts)
		if err != nil {
			return err
		}

		// Print one line per file
		for _, m := range result.Moves {
			if m.Failed {
				fmt.Fprintf(out, "[FAIL] %s -> %s (error: %s)\n", m.Source, m.Dest, m.Reason)
			} else if m.Skipped {
				if m.Reason == "unmatched" {
					fmt.Fprintf(out, "[UNMATCHED] %s\n", m.Source)
				} else {
					fmt.Fprintf(out, "[SKIP] %s (%s)\n", m.Source, m.Reason)
				}
			} else {
				prefix := "[MOVE]"
				if dryRun {
					prefix = "[DRY-RUN]"
				}
				ruleInfo := ""
				if m.RuleName != "" {
					ruleInfo = fmt.Sprintf(" (rule: %s)", m.RuleName)
				}
				fmt.Fprintf(out, "%s %s -> %s%s\n", prefix, m.Source, m.Dest, ruleInfo)
			}
		}

		// Final summary counts
		fmt.Fprintf(out, "\nSummary: moved %d, skipped %d, unmatched %d, failed %d\n",
			result.Stats.Moved, result.Stats.Skipped, result.Stats.Unmatched, result.Stats.Failed)

		// Partial failure exit code 3
		if result.Stats.Failed > 0 {
			os.Exit(3)
		}

		return nil
	},
}

func init() {
	runCmd.Flags().Bool("dry-run", false, "preview planned moves without making changes")
	runCmd.Flags().String("dir", "", "organize this folder only (overrides config watch)")
	runCmd.Flags().Bool("yes", false, "skip confirmation prompts")
	runCmd.Flags().String("history-file", "", "custom path to history.jsonl file")
	rootCmd.AddCommand(runCmd)
}
