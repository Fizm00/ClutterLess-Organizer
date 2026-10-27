// SPDX-License-Identifier: AGPL-3.0-only

package cli

import (
	"fmt"
	"io"
	"os"
	"os/signal"
	"syscall"

	"github.com/Fizm00/organizer/internal/config"
	"github.com/Fizm00/organizer/internal/engine"
	"github.com/Fizm00/organizer/internal/history"
	"github.com/spf13/cobra"
)

var (
	watchDryRun     bool
	watchLogFile    string
	watchInitialRun bool
	watchHistFile   string
)

var watchCmd = &cobra.Command{
	Use:   "watch",
	Short: "Continuously watch directories and organize new files",
	Long:  "Monitor watched folders in real-time, waiting for files to stabilize before organizing them according to rules.",
	RunE: func(cmd *cobra.Command, args []string) error {
		path, err := resolveConfigPath()
		if err != nil {
			return fmt.Errorf("failed to locate config file: %w", err)
		}

		cfg, err := config.Load(path)
		if err != nil {
			return fmt.Errorf("failed to load config %q: %w", path, err)
		}

		organizer := engine.NewOrganizer(cfg)
		if watchHistFile != "" {
			if h, err := history.NewStorage(watchHistFile); err == nil {
				organizer.History = h
			}
		}

		// Setup output destination (stdout + optional log file)
		out := cmd.OutOrStdout()
		var logWriter io.Writer = out

		if watchLogFile != "" {
			lf, err := os.OpenFile(watchLogFile, os.O_CREATE|os.O_APPEND|os.O_WRONLY, 0644)
			if err != nil {
				return fmt.Errorf("failed to open log file %q: %w", watchLogFile, err)
			}
			defer lf.Close()
			logWriter = io.MultiWriter(out, lf)
		}

		// Handle graceful shutdown on Ctrl+C or termination signals
		ctx, stop := signal.NotifyContext(cmd.Context(), os.Interrupt, syscall.SIGTERM)
		defer stop()

		fmt.Fprintf(logWriter, "Watching %d configured directories (press Ctrl+C to stop)...\n", len(cfg.Watch))

		opts := engine.WatchOptions{
			InitialRun: watchInitialRun,
			DryRun:     watchDryRun,
			LogFn: func(m engine.MoveResult) {
				if m.Failed {
					fmt.Fprintf(logWriter, "[FAIL] %s -> %s (error: %s)\n", m.Source, m.Dest, m.Reason)
				} else if m.Skipped {
					if m.Reason != "" && m.Reason != "unmatched" {
						fmt.Fprintf(logWriter, "[SKIP] %s (%s)\n", m.Source, m.Reason)
					}
				} else {
					prefix := "[MOVE]"
					if watchDryRun {
						prefix = "[DRY-RUN]"
					}
					ruleInfo := ""
					if m.RuleName != "" {
						ruleInfo = fmt.Sprintf(" (rule: %s)", m.RuleName)
					}
					fmt.Fprintf(logWriter, "%s %s -> %s%s\n", prefix, m.Source, m.Dest, ruleInfo)
				}
			},
		}

		stats, watchErr := organizer.Watch(ctx, opts)
		if watchErr != nil && ctx.Err() == nil {
			return watchErr
		}

		fmt.Fprintf(logWriter, "\nWatch stopped. Summary: moved %d, skipped %d, failed %d\n",
			stats.Moved, stats.Skipped, stats.Failed)

		return nil
	},
}

func init() {
	watchCmd.Flags().BoolVar(&watchDryRun, "dry-run", false, "preview moves without modifying files")
	watchCmd.Flags().StringVar(&watchLogFile, "log-file", "", "write log output to a file in addition to stdout")
	watchCmd.Flags().BoolVar(&watchInitialRun, "initial-run", false, "organize existing files once before watching")
	watchCmd.Flags().StringVar(&watchHistFile, "history-file", "", "custom path to history.jsonl file")
	rootCmd.AddCommand(watchCmd)
}
