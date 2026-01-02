#!/bin/bash
set -euo pipefail

REPO="ZainW/burl"
INSTALL_DIR="${BURL_INSTALL:-$HOME/.burl/bin}"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
CYAN='\033[0;36m'
DIM='\033[2m'
NC='\033[0m'

info() { echo -e "${CYAN}$1${NC}"; }
success() { echo -e "${GREEN}$1${NC}"; }
error() { echo -e "${RED}error:${NC} $1" >&2; exit 1; }
dim() { echo -e "${DIM}$1${NC}"; }

# Detect OS and architecture
detect_platform() {
  OS=$(uname -s)
  ARCH=$(uname -m)

  case "$OS" in
    Linux)  OS="linux" ;;
    Darwin) OS="darwin" ;;
    MINGW*|MSYS*|CYGWIN*) OS="windows" ;;
    *) error "Unsupported OS: $OS" ;;
  esac

  case "$ARCH" in
    x86_64|amd64)  ARCH="x64" ;;
    aarch64|arm64) ARCH="arm64" ;;
    *) error "Unsupported architecture: $ARCH" ;;
  esac

  PLATFORM="${OS}-${ARCH}"
}

# Get latest version from GitHub
get_version() {
  if [ -n "${VERSION:-}" ]; then
    return
  fi

  VERSION=$(curl -fsSL "https://api.github.com/repos/${REPO}/releases/latest" 2>/dev/null | 
    grep '"tag_name"' | 
    sed -E 's/.*"v([^"]+)".*/\1/' || true)
  
  if [ -z "$VERSION" ]; then
    error "Failed to get latest version. Check your internet connection."
  fi
}

# Download and install
install() {
  BINARY="burl-${PLATFORM}"
  [ "$OS" = "windows" ] && BINARY="${BINARY}.exe"
  
  URL="https://github.com/${REPO}/releases/download/v${VERSION}/${BINARY}"
  
  info "Downloading burl v${VERSION} for ${PLATFORM}..."
  dim "  $URL"
  echo ""
  
  mkdir -p "$INSTALL_DIR"
  
  HTTP_CODE=$(curl -fsSL -w "%{http_code}" "$URL" -o "${INSTALL_DIR}/burl" 2>/dev/null || echo "000")
  
  if [ "$HTTP_CODE" != "200" ]; then
    rm -f "${INSTALL_DIR}/burl"
    error "Failed to download binary (HTTP $HTTP_CODE). Version v${VERSION} may not exist for ${PLATFORM}."
  fi
  
  chmod +x "${INSTALL_DIR}/burl"
  
  success "Installed burl v${VERSION} to ${INSTALL_DIR}/burl"
}

# Check if directory is in PATH and provide instructions
check_path() {
  if [[ ":$PATH:" == *":${INSTALL_DIR}:"* ]]; then
    return
  fi

  echo ""
  info "Add burl to your PATH:"
  echo ""
  
  # Detect shell and provide specific instructions
  case "${SHELL:-/bin/bash}" in
    */zsh)
      echo "  echo 'export PATH=\"\$PATH:${INSTALL_DIR}\"' >> ~/.zshrc"
      echo "  source ~/.zshrc"
      ;;
    */bash)
      if [ -f "$HOME/.bashrc" ]; then
        echo "  echo 'export PATH=\"\$PATH:${INSTALL_DIR}\"' >> ~/.bashrc"
        echo "  source ~/.bashrc"
      else
        echo "  echo 'export PATH=\"\$PATH:${INSTALL_DIR}\"' >> ~/.bash_profile"
        echo "  source ~/.bash_profile"
      fi
      ;;
    */fish)
      echo "  fish_add_path ${INSTALL_DIR}"
      ;;
    *)
      echo "  export PATH=\"\$PATH:${INSTALL_DIR}\""
      ;;
  esac
}

# Verify installation
verify() {
  if [ -x "${INSTALL_DIR}/burl" ]; then
    echo ""
    if [[ ":$PATH:" == *":${INSTALL_DIR}:"* ]]; then
      success "Run 'burl --help' to get started!"
    else
      success "Run '${INSTALL_DIR}/burl --help' to get started!"
    fi
  else
    error "Installation failed. Binary not found at ${INSTALL_DIR}/burl"
  fi
}

main() {
  echo ""
  info "Installing burl..."
  echo ""
  
  detect_platform
  get_version
  install
  check_path
  verify
  echo ""
}

main
