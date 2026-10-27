// SPDX-License-Identifier: AGPL-3.0-only

package ui

import (
	"fmt"
	"io"
)

const BannerASCII = `
   ____ _       _   _             _                
  / ___| |_   _| |_| |_ ___ _ __ | |    ___  ___ ___ 
 | |   | | | | | __| __/ _ \ '__|| |   / _ \/ __/ __|
 | |___| | |_| | |_| ||  __/ |   | |__|  __/\__ \__ \
  \____|_|\__,_|\__|\__\___|_|   |_____\___||___/___/`

// RenderHelp prints the comprehensive, stylized help screen.
func RenderHelp(w io.Writer, versionStr string, styler *Styler) {
	fmt.Fprintln(w, styler.Cyan(BannerASCII))
	fmt.Fprintf(w, "  %s %s\n\n",
		styler.Bold("ClutterLess Organizer (cless)"),
		styler.Dim(fmt.Sprintf("v%s — Smart Local File Organizer & Automator", versionStr)))

	fmt.Fprintf(w, "%s\n", styler.Bold("USAGE:"))
	fmt.Fprintf(w, "  cless %s\n\n", styler.Cyan("[command] [flags]"))

	fmt.Fprintf(w, "%s\n", styler.Bold("CORE COMMANDS:"))
	printCmd(w, styler, "run", "Organize files in watched folders (or --dir) once")
	printCmd(w, styler, "watch", "Continuously monitor folders and organize files in real-time")
	printCmd(w, styler, "undo", "Safely reverse the last batch of moves back to original locations")
	fmt.Fprintln(w)

	fmt.Fprintf(w, "%s\n", styler.Bold("FOLDER MANAGEMENT:"))
	printCmd(w, styler, "folder list", "View all folders currently configured for watching")
	printCmd(w, styler, "folder add <path>", "Add a folder to the watch list (e.g. cless folder add ~/Desktop)")
	printCmd(w, styler, "folder remove <path>", "Remove a folder from the watch list")
	fmt.Fprintln(w)

	fmt.Fprintf(w, "%s\n", styler.Bold("CONFIGURATION & RULES:"))
	printCmd(w, styler, "init", "Create a fresh default configuration file")
	printCmd(w, styler, "config edit", "Open config.yaml directly in your text editor (Notepad / $EDITOR)")
	printCmd(w, styler, "config path", "Print the exact path to your active config.yaml")
	printCmd(w, styler, "config validate", "Check configuration file for syntax errors or invalid rules")
	printCmd(w, styler, "rules list", "View all active organization rules and destinations")
	printCmd(w, styler, "rules test <file>", "Preview which rule would match a specific file")
	fmt.Fprintln(w)

	fmt.Fprintf(w, "%s\n", styler.Bold("SYSTEM & HISTORY:"))
	printCmd(w, styler, "history", "View history of past organization batches")
	printCmd(w, styler, "version", "Show binary version, git commit, and build date")
	printCmd(w, styler, "uninstall", "Uninstall cless binary and clean system PATH")
	fmt.Fprintln(w)

	fmt.Fprintf(w, "%s\n", styler.Bold("QUICK START EXAMPLES:"))
	printExample(w, styler, "cless run --dry-run", "Preview what files will move without touching anything")
	printExample(w, styler, "cless run", "Organize your Downloads folder immediately")
	printExample(w, styler, "cless run --dir ~/Desktop --dry-run", "Preview organizing your Desktop folder")
	printExample(w, styler, "cless folder add ~/Desktop", "Add Desktop to your permanent watch list")
	printExample(w, styler, "cless watch", "Start background real-time organizer daemon")
	printExample(w, styler, "cless undo", "Accidentally organized? Undo the last batch instantly")
	printExample(w, styler, "cless config edit", "Open and customize your rules in Notepad")
	fmt.Fprintln(w)

	fmt.Fprintf(w, "%s\n", styler.Bold("GLOBAL FLAGS:"))
	printFlag(w, styler, "--config <path>", "Override configuration file path")
	printFlag(w, styler, "--no-color", "Disable ANSI colored terminal output")
	printFlag(w, styler, "-v, --verbose", "Enable detailed debug logging")
	printFlag(w, styler, "-h, --help", "Show help information")
	fmt.Fprintln(w)

	fmt.Fprintf(w, "%s Run %s for detailed flags of any command.\n",
		styler.Dim("Need details?"),
		styler.Cyan("cless [command] --help"))
}

func printCmd(w io.Writer, styler *Styler, cmdName, desc string) {
	fmt.Fprintf(w, "  %-24s %s\n", styler.Cyan(cmdName), desc)
}

func printExample(w io.Writer, styler *Styler, cmdExample, desc string) {
	fmt.Fprintf(w, "  %-38s %s\n", styler.Green(cmdExample), styler.Dim("# "+desc))
}

func printFlag(w io.Writer, styler *Styler, flagName, desc string) {
	fmt.Fprintf(w, "  %-24s %s\n", styler.Yellow(flagName), desc)
}
