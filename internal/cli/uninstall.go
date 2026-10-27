// SPDX-License-Identifier: AGPL-3.0-only

package cli

import (
	"bufio"
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
	"runtime"
	"strings"

	"github.com/Fizm00/organizer/internal/ui"
	"github.com/spf13/cobra"
)

var (
	uninstallYes         bool
	uninstallPurgeConfig bool
)

var uninstallCmd = &cobra.Command{
	Use:   "uninstall",
	Short: "Uninstall ClutterLess Organizer binary and clean up system PATH",
	Long: `Remove the cless executable from your system and clean up PATH settings.
Optionally purge user configurations and history logs with --purge-config.`,
	RunE: runUninstall,
}

func init() {
	uninstallCmd.Flags().BoolVarP(&uninstallYes, "yes", "y", false, "confirm uninstall without interactive prompt")
	uninstallCmd.Flags().BoolVar(&uninstallPurgeConfig, "purge-config", false, "also delete configuration files and history logs")
	rootCmd.AddCommand(uninstallCmd)
}

func runUninstall(cmd *cobra.Command, args []string) error {
	colorOn := ui.ShouldUseColor(noColor, cmd.OutOrStdout())
	styler := ui.NewStyler(colorOn)

	exePath, err := os.Executable()
	if err != nil {
		return fmt.Errorf("unable to determine binary path: %w", err)
	}
	exePath, _ = filepath.EvalSymlinks(exePath)
	exeDir := filepath.Dir(exePath)

	fmt.Fprintf(cmd.OutOrStdout(), "\n%s\n", styler.Cyan(styler.Bold("Uninstalling ClutterLess Organizer (cless)...")))
	fmt.Fprintf(cmd.OutOrStdout(), "  Binary location: %s\n", styler.Dim(exePath))

	if !uninstallYes {
		fmt.Fprintf(cmd.OutOrStdout(), "\n%s [y/N]: ", styler.Yellow("Are you sure you want to uninstall cless?"))
		reader := bufio.NewReader(os.Stdin)
		input, err := reader.ReadString('\n')
		if err != nil {
			return nil
		}
		ans := strings.TrimSpace(strings.ToLower(input))
		if ans != "y" && ans != "yes" {
			fmt.Fprintln(cmd.OutOrStdout(), styler.Dim("Uninstall canceled."))
			return nil
		}
	}

	// Clean configuration if requested
	if uninstallPurgeConfig {
		configDir, err := os.UserConfigDir()
		if err == nil {
			orgDir := filepath.Join(configDir, "organizer")
			if _, err := os.Stat(orgDir); err == nil {
				if err := os.RemoveAll(orgDir); err == nil {
					fmt.Fprintf(cmd.OutOrStdout(), "  %s Removed configuration directory: %s\n", styler.Green("✓"), orgDir)
				}
			}
		}
	}

	if runtime.GOOS == "windows" {
		// On Windows, the binary is locked while running.
		// Launch a background detached PowerShell cleanup script that waits 1 second then removes files and User PATH.
		psScript := fmt.Sprintf(`
Start-Sleep -Seconds 1
$dir = '%s'
if (Test-Path $dir) {
    Remove-Item -Path $dir -Recurse -Force -ErrorAction SilentlyContinue
}
$userPath = [Environment]::GetEnvironmentVariable('Path', 'User')
if ($userPath -like "*$dir*") {
    $parts = $userPath -split ';' | Where-Object { $_ -ne '' -and $_ -ne $dir -and $_ -ne "$dir\" }
    [Environment]::SetEnvironmentVariable('Path', ($parts -join ';'), 'User')
}
`, strings.ReplaceAll(exeDir, "'", "''"))

		cmdDetached := exec.Command("powershell.exe", "-NoProfile", "-WindowStyle", "Hidden", "-Command", psScript)
		if err := cmdDetached.Start(); err != nil {
			// Fallback: inform user how to remove manually
			fmt.Fprintf(cmd.OutOrStdout(), "  %s Please remove %s manually.\n", styler.Yellow("!"), exeDir)
		} else {
			fmt.Fprintf(cmd.OutOrStdout(), "  %s Scheduled binary removal from %s\n", styler.Green("✓"), exeDir)
			fmt.Fprintf(cmd.OutOrStdout(), "  %s Removed from User PATH.\n", styler.Green("✓"))
		}
	} else {
		// Linux & macOS: can remove directly while running
		if err := os.Remove(exePath); err != nil {
			return fmt.Errorf("failed to remove %s: %w (try running with sudo)", exePath, err)
		}
		fmt.Fprintf(cmd.OutOrStdout(), "  %s Removed binary at %s\n", styler.Green("✓"), exePath)
	}

	fmt.Fprintf(cmd.OutOrStdout(), "\n%s ClutterLess Organizer has been successfully uninstalled.\n\n", styler.Green(styler.Bold("Done!")))
	return nil
}
