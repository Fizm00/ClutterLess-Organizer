#!/usr/bin/env bash
# ClutterLess Organizer (cless) - One-Line Linux & macOS Installer
# Usage:
#   curl -fsSL https://raw.githubusercontent.com/Fizm00/ClutterLess-Organizer/main/install.sh | bash
# Or specify a version:
#   CLESS_VERSION="0.3.0" curl -fsSL https://raw.githubusercontent.com/Fizm00/ClutterLess-Organizer/main/install.sh | bash

set -e

VERSION_INPUT="${CLESS_VERSION:-latest}"

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

# 3. Detect existing installation and compare versions
INSTALLED_BIN=""
if command -v cless >/dev/null 2>&1; then
  INSTALLED_BIN="$(command -v cless)"
elif [ -x "/usr/local/bin/cless" ]; then
  INSTALLED_BIN="/usr/local/bin/cless"
elif [ -x "${HOME}/.local/bin/cless" ]; then
  INSTALLED_BIN="${HOME}/.local/bin/cless"
fi

INSTALL_ACTION="install"
INSTALLED_VERSION=""

if [ -n "$INSTALLED_BIN" ] && [ -x "$INSTALLED_BIN" ]; then
  INSTALLED_VERSION=$("$INSTALLED_BIN" version 2>/dev/null | grep -oE '[0-9]+\.[0-9]+(\.[0-9]+)?' | head -n1 || true)
fi

if [ -n "$INSTALLED_VERSION" ]; then
  if [ "$INSTALLED_VERSION" = "$VERSION" ]; then
    echo "ClutterLess Organizer v${INSTALLED_VERSION} is already installed at: ${INSTALLED_BIN}"
    if [ "$CLESS_FORCE" != "1" ]; then
      if [ -t 0 ] || [ -c /dev/tty ]; then
        read -r -p "Do you want to reinstall? [y/N]: " REPLY </dev/tty || REPLY="n"
        case "$REPLY" in
          [yY]|[yY][eE][sS])
            INSTALL_ACTION="reinstall"
            echo "Reinstalling ClutterLess Organizer v${VERSION}..."
            ;;
          *)
            echo "Reinstall canceled. Existing version v${INSTALLED_VERSION} preserved."
            exit 0
            ;;
        esac
      else
        echo "Reinstall skipped (already on version v${INSTALLED_VERSION}). Set CLESS_FORCE=1 to override."
        exit 0
      fi
    else
      INSTALL_ACTION="reinstall"
      echo "Reinstalling ClutterLess Organizer v${VERSION}..."
    fi
  else
    LOWEST=$(printf '%s\n%s' "$INSTALLED_VERSION" "$VERSION" | sort -V | head -n1)
    if [ "$LOWEST" = "$INSTALLED_VERSION" ]; then
      INSTALL_ACTION="upgrade"
      echo "Existing installation detected: v${INSTALLED_VERSION}"
      echo "Upgrading ClutterLess Organizer to v${VERSION}..."
    else
      INSTALL_ACTION="downgrade"
      echo "A newer version (v${INSTALLED_VERSION}) is already installed at: ${INSTALLED_BIN}"
      if [ "$CLESS_FORCE" != "1" ]; then
        if [ -t 0 ] || [ -c /dev/tty ]; then
          read -r -p "Do you want to downgrade to v${VERSION}? [y/N]: " REPLY </dev/tty || REPLY="n"
          case "$REPLY" in
            [yY]|[yY][eE][sS])
              echo "Downgrading ClutterLess Organizer to v${VERSION}..."
              ;;
            *)
              echo "Downgrade canceled. Existing version v${INSTALLED_VERSION} preserved."
              exit 0
              ;;
          esac
        else
          echo "Downgrade skipped. Set CLESS_FORCE=1 to override."
          exit 0
        fi
      else
        echo "Downgrading ClutterLess Organizer to v${VERSION}..."
      fi
    fi
  fi
else
  echo "Installing ClutterLess Organizer (cless v${VERSION})..."
fi

# 4. Download and extract
TAR_NAME="cless_${VERSION}_${OS}_${ARCH}.tar.gz"
DOWNLOAD_URL="https://github.com/${REPO}/releases/download/${TAG}/${TAR_NAME}"
TEMP_DIR="$(mktemp -d)"

echo "Downloading ${TAR_NAME} (version: ${TAG}) from GitHub..."
curl -sSL "$DOWNLOAD_URL" -o "${TEMP_DIR}/${TAR_NAME}"

tar -xzf "${TEMP_DIR}/${TAR_NAME}" -C "$TEMP_DIR"

# 5. Install location
INSTALL_DIR="/usr/local/bin"
if [ ! -w "$INSTALL_DIR" ]; then
  INSTALL_DIR="${HOME}/.local/bin"
  mkdir -p "$INSTALL_DIR"
fi

mv "${TEMP_DIR}/cless" "${INSTALL_DIR}/cless"
chmod +x "${INSTALL_DIR}/cless"
rm -rf "$TEMP_DIR"

echo ""
case "$INSTALL_ACTION" in
  upgrade)
    echo "Upgrade successful! ClutterLess Organizer updated: v${INSTALLED_VERSION} -> v${VERSION}"
    ;;
  reinstall)
    echo "Reinstall successful! (Version: ${VERSION})"
    ;;
  downgrade)
    echo "Downgrade successful! (Version: ${VERSION})"
    ;;
  *)
    echo "Installation successful! (Version: ${VERSION})"
    ;;
esac

echo "ClutterLess Organizer is installed at: ${INSTALL_DIR}/cless"
echo ""
echo "Next steps:"
echo "  1. Run 'cless init' to create your configuration."
echo "  2. Run 'cless run --dry-run' to test safely."
echo "  3. Type 'cless help' anytime to explore all commands and practical examples."
echo ""
echo "To uninstall in the future, run: curl -fsSL https://raw.githubusercontent.com/${REPO}/main/uninstall.sh | bash"
