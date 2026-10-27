#!/usr/bin/env bash
# ClutterLess Organizer (cless) - One-Line Linux & macOS Uninstaller
# Usage:
#   curl -fsSL https://raw.githubusercontent.com/Fizm00/ClutterLess-Organizer/main/uninstall.sh | bash
# Or with config removal:
#   CLESS_PURGE_CONFIG=1 curl -fsSL https://raw.githubusercontent.com/Fizm00/ClutterLess-Organizer/main/uninstall.sh | bash

set -e

echo "Uninstalling ClutterLess Organizer (cless)..."

# 1. Detect and remove binary
REMOVED_ANY=false

for BIN_PATH in "/usr/local/bin/cless" "${HOME}/.local/bin/cless"; do
  if [ -f "$BIN_PATH" ]; then
    echo "Removing binary at $BIN_PATH..."
    if [ -w "$BIN_PATH" ]; then
      rm -f "$BIN_PATH"
      REMOVED_ANY=true
    elif command -v sudo >/dev/null 2>&1; then
      sudo rm -f "$BIN_PATH"
      REMOVED_ANY=true
    else
      echo "Warning: Permission denied to remove $BIN_PATH. Please run with sudo."
    fi
  fi
done

if [ "$REMOVED_ANY" = false ]; then
  echo "Binary not found in standard paths (/usr/local/bin or ~/.local/bin)."
else
  echo "Binary removed successfully."
fi

# 2. Config paths
OS="$(uname -s | tr '[:upper:]' '[:lower:]')"
if [ "$OS" = "darwin" ]; then
  CONFIG_DIR="${HOME}/Library/Application Support/organizer"
else
  CONFIG_DIR="${XDG_CONFIG_HOME:-$HOME/.config}/organizer"
fi

if [ -d "$CONFIG_DIR" ]; then
  PURGE="${CLESS_PURGE_CONFIG:-0}"
  if [ "$PURGE" = "1" ]; then
    rm -rf "$CONFIG_DIR"
    echo "Removed configuration and history at $CONFIG_DIR."
  else
    echo "Configuration preserved at: $CONFIG_DIR"
    echo "(To completely wipe all settings and logs, remove that directory manually: rm -rf '$CONFIG_DIR')"
  fi
fi

echo ""
echo "Uninstallation complete! ClutterLess Organizer has been removed from your system."
