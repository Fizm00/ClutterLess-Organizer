// SPDX-License-Identifier: AGPL-3.0-only

package cli

import (
	"fmt"
	"strings"
	"time"

	"github.com/Fizm00/organizer/internal/config"
	"github.com/Fizm00/organizer/internal/engine"
	"github.com/spf13/cobra"
)

var rulesCmd = &cobra.Command{
	Use:   "rules",
	Short: "Inspect and test organization rules",
	Long:  "Commands to list defined rules or test rule matching against a specific file.",
}

var rulesListCmd = &cobra.Command{
	Use:   "list",
	Short: "List all rules in evaluation order",
	Long:  "Print all rules with their match conditions and target destination in order of evaluation.",
	RunE: func(cmd *cobra.Command, args []string) error {
		path, err := resolveConfigPath()
		if err != nil {
			return fmt.Errorf("failed to locate config file: %w", err)
		}

		cfg, err := config.Load(path)
		if err != nil {
			return fmt.Errorf("failed to load config %q: %w", path, err)
		}

		out := cmd.OutOrStdout()
		fmt.Fprintf(out, "Configured Rules in %s (%d rules, first-match-wins):\n\n", path, len(cfg.Rules))
		for i, r := range cfg.Rules {
			fmt.Fprintf(out, "%d. %s\n", i+1, r.Name)
			fmt.Fprintln(out, "   Match:")
			if len(r.Match.Ext) > 0 {
				fmt.Fprintf(out, "     ext:        [%s]\n", strings.Join(r.Match.Ext, ", "))
			}
			if len(r.Match.NameGlob) > 0 {
				fmt.Fprintf(out, "     name_glob:  [%s]\n", strings.Join(r.Match.NameGlob, ", "))
			}
			if r.Match.NameRegex != "" {
				fmt.Fprintf(out, "     name_regex: %s\n", r.Match.NameRegex)
			}
			if r.Match.MinSize != "" {
				fmt.Fprintf(out, "     min_size:   %s\n", r.Match.MinSize)
			}
			if r.Match.MaxSize != "" {
				fmt.Fprintf(out, "     max_size:   %s\n", r.Match.MaxSize)
			}
			if r.Match.OlderThan != "" {
				fmt.Fprintf(out, "     older_than: %s\n", r.Match.OlderThan)
			}
			fmt.Fprintf(out, "   Move to: %s\n\n", r.MoveTo)
		}

		return nil
	},
}

var rulesTestCmd = &cobra.Command{
	Use:   "test <file>",
	Short: "Test which rule matches a given file",
	Long:  "Evaluate a file against configured rules and show matching rule and destination without moving anything.",
	Args:  cobra.ExactArgs(1),
	RunE: func(cmd *cobra.Command, args []string) error {
		filePath := args[0]

		path, err := resolveConfigPath()
		if err != nil {
			return fmt.Errorf("failed to locate config file: %w", err)
		}

		cfg, err := config.Load(path)
		if err != nil {
			return fmt.Errorf("failed to load config %q: %w", path, err)
		}

		rules, err := engine.CompileRules(cfg.Rules)
		if err != nil {
			return fmt.Errorf("failed to compile rules: %w", err)
		}

		plan, err := engine.PlanFile(filePath, rules, cfg.Settings, time.Now())
		if err != nil {
			return err
		}

		out := cmd.OutOrStdout()
		if plan.Skipped {
			fmt.Fprintf(out, "File:   %s\n", plan.Source)
			fmt.Fprintf(out, "Status: Skipped\n")
			fmt.Fprintf(out, "Reason: %s\n", plan.Reason)
		} else {
			fmt.Fprintf(out, "File:    %s\n", plan.Source)
			fmt.Fprintf(out, "Matched: Rule %q\n", plan.RuleName)
			fmt.Fprintf(out, "Dest:    %s\n", plan.Dest)
		}

		return nil
	},
}

func init() {
	rulesCmd.AddCommand(rulesListCmd)
	rulesCmd.AddCommand(rulesTestCmd)
	rootCmd.AddCommand(rulesCmd)
}
