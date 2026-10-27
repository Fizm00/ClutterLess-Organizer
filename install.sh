#!/usr/bin/env bash
# ClutterLess Organizer (cless) - One-Line Linux & macOS Installer
# Usage:
#   curl -fsSL https://raw.githubusercontent.com/Fizm00/ClutterLess-Organizer/main/install.sh | bash
# Or specify a version:
#   CLESS_VERSION="0.3.0" curl -fsSL https://raw.githubusercontent.com/Fizm00/ClutterLess-Organizer/main/install.sh | bash

set -e

VERSION_INPUT="${CLESS_VERSION:-latest}"

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

# 2. Resolve version tag
REPO="Fizm00/ClutterLess-Organizer"
TAG="v0.3.0"

if [ "$VERSION_INPUT" = "latest" ]; then
  # Try redirect location header first (fast, reliable, no API rate limits)
  REDIRECT_TAG=$(curl -sI "https://github.com/${REPO}/releases/latest" | grep -i '^location:' | sed -E 's/.*releases\/tag\/(.*)/\1/' | tr -d '\r\n' || true)
  if [ -n "$REDIRECT_TAG" ]; then
    TAG="$REDIRECT_TAG"
  else
    # Fallback to GitHub API
    API_TAG=$(curl -sSL "https://api.github.com/repos/${REPO}/releases/latest" | grep '"tag_name":' | sed -E 's/.*"([^"]+)".*/\1/' || true)
    if [ -n "$API_TAG" ]; then
      TAG="$API_TAG"
    fi
  fi
else
  TAG="${VERSION_INPUT}"
  if [[ ! "$TAG" =~ ^v ]]; then
    TAG="v${TAG}"
  fi
fi

VERSION="${TAG#v}"
TAR_NAME="cless_${VERSION}_${OS}_${ARCH}.tar.gz"
DOWNLOAD_URL="https://github.com/${REPO}/releases/download/${TAG}/${TAR_NAME}"
TEMP_DIR="$(mktemp -d)"

echo "Downloading ${TAR_NAME} (version: ${TAG}) from GitHub..."
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
echo "Installation successful! (Version: ${VERSION})"
echo "ClutterLess Organizer is installed at: ${INSTALL_DIR}/cless"
echo ""
echo "Next steps:"
echo "  1. Run 'cless init' to create your configuration."
echo "  2. Run 'cless run --dry-run' to test safely."
echo "  3. Type 'cless help' anytime to explore all commands and practical examples."
echo ""
echo "To uninstall in the future, run: curl -fsSL https://raw.githubusercontent.com/${REPO}/main/uninstall.sh | bash"
