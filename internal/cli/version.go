// SPDX-License-Identifier: AGPL-3.0-only

package cli

import (
	"fmt"

	"github.com/Fizm00/organizer/internal/version"
	"github.com/spf13/cobra"
)

var versionCmd = &cobra.Command{
	Use:   "version",
	Short: "Print version information",
	Long:  "Print the application version, git commit hash, and build date.",
	Run: func(cmd *cobra.Command, args []string) {
		fmt.Fprintln(cmd.OutOrStdout(), version.Info())
	},
}

func init() {
	rootCmd.AddCommand(versionCmd)
}
