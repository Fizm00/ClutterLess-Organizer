#!/usr/bin/env bash
# ClutterLess Organizer (cless) - One-Line Linux & macOS Installer
# Usage:
#   curl -fsSL https://raw.githubusercontent.com/Fizm00/ClutterLess-Organizer/main/install.sh | bash

set -e

echo "Installing ClutterLess Organizer (cless)..."

# 1. Detect OS and architecture
OS="$(uname -s | tr '[:upper:]' '[:lower:]')"
ARCH="$(uname -m)"

case "$ARCH" in
  x86_64|amd64)
    ARCH="amd64"
    ;;
  aarch64|arm64)
    ARCH="arm64"
    ;;
  *)
    echo "Error: Unsupported architecture: $ARCH"
    exit 1
    ;;
esac

case "$OS" in
  linux)
    OS="linux"
    ;;
  darwin)
    OS="darwin"
    ;;
  *)
    echo "Error: Unsupported operating system: $OS"
    exit 1
    ;;
esac

# 2. Get latest release from GitHub API
REPO="Fizm00/ClutterLess-Organizer"
API_URL="https://api.github.com/repos/${REPO}/releases/latest"
TAG="v0.2.0"
VERSION="0.2.0"

LATEST_TAG=$(curl -sSL "$API_URL" | grep '"tag_name":' | sed -E 's/.*"([^"]+)".*/\1/' || true)
if [ -n "$LATEST_TAG" ]; then
  TAG="$LATEST_TAG"
  VERSION="${TAG#v}"
fi

TAR_NAME="cless_${VERSION}_${OS}_${ARCH}.tar.gz"
DOWNLOAD_URL="https://github.com/${REPO}/releases/download/${TAG}/${TAR_NAME}"
TEMP_DIR="$(mktemp -d)"

echo "Downloading ${TAR_NAME} from GitHub..."
curl -sSL "$DOWNLOAD_URL" -o "${TEMP_DIR}/${TAR_NAME}"

# 3. Extract binary
tar -xzf "${TEMP_DIR}/${TAR_NAME}" -C "$TEMP_DIR"

# 4. Install location
INSTALL_DIR="/usr/local/bin"
if [ ! -w "$INSTALL_DIR" ]; then
  INSTALL_DIR="${HOME}/.local/bin"
  mkdir -p "$INSTALL_DIR"
fi

mv "${TEMP_DIR}/cless" "${INSTALL_DIR}/cless"
chmod +x "${INSTALL_DIR}/cless"
rm -rf "$TEMP_DIR"

echo ""
echo "Installation successful!"
echo "ClutterLess Organizer is installed at: ${INSTALL_DIR}/cless"
echo ""
echo "Next steps:"
echo "  1. Run 'cless init' to create your configuration."
echo "  2. Run 'cless run --dry-run' to test safely."
echo "  3. Type 'cless help' anytime to explore all commands and practical examples."

