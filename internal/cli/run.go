// SPDX-License-Identifier: AGPL-3.0-only

package cli

import (
	"context"
	"fmt"
	"os"
	"time"

	"github.com/Fizm00/organizer/internal/config"
	"github.com/Fizm00/organizer/internal/engine"
	"github.com/Fizm00/organizer/internal/history"
	"github.com/Fizm00/organizer/internal/ui"
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
		colorOn := ui.ShouldUseColor(noColor, out)
		styler := ui.NewStyler(colorOn)

		opts := engine.RunOptions{
			Dir:    dirOverride,
			DryRun: dryRun,
		}

		spinner := ui.NewSpinner("Scanning and planning file organization...", out, styler)
		spinner.Start()
		startTime := time.Now()

		result, err := organizer.Run(context.Background(), opts)
		duration := time.Since(startTime)
		spinner.Stop("")

		if err != nil {
			return err
		}

		// Print one line per file
		for _, m := range result.Moves {
			if m.Failed {
				fmt.Fprintf(out, "%s %s -> %s (error: %s)\n", styler.BadgeFail(), m.Source, m.Dest, m.Reason)
			} else if m.Skipped {
				if m.Reason == "unmatched" {
					fmt.Fprintf(out, "%s %s\n", styler.BadgeUnmatched(), m.Source)
				} else {
					fmt.Fprintf(out, "%s %s (%s)\n", styler.BadgeSkip(), m.Source, m.Reason)
				}
			} else {
				badge := styler.BadgeMove()
				if dryRun {
					badge = styler.BadgeDryRun()
				}
				ruleInfo := ""
				if m.RuleName != "" {
					ruleInfo = " " + styler.RuleTag(m.RuleName)
				}
				fmt.Fprintf(out, "%s %s -> %s%s\n", badge, m.Source, m.Dest, ruleInfo)
			}
		}

		// Render interactive summary box + standard summary line
		ui.RenderSummaryBox(out, ui.SummaryStats{
			Moved:     result.Stats.Moved,
			Skipped:   result.Stats.Skipped,
			Unmatched: result.Stats.Unmatched,
			Failed:    result.Stats.Failed,
			Duration:  duration,
			DryRun:    dryRun,
		}, styler)

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
