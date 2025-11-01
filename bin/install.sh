#!/usr/bin/env bash
set -euo pipefail

# Forge v2 Installation Script
# Installs forge to ~/.local/share/forge and creates wrapper at ~/.local/bin/forge

# Color output (only if terminal supports it)
if [[ -t 1 ]] && command -v tput &>/dev/null && tput colors &>/dev/null && [[ $(tput colors) -ge 8 ]]; then
  BOLD="$(tput bold)"
  GREEN="$(tput setaf 2)"
  YELLOW="$(tput setaf 3)"
  RED="$(tput setaf 1)"
  RESET="$(tput sgr0)"
else
  BOLD=""
  GREEN=""
  YELLOW=""
  RED=""
  RESET=""
fi

# Helper functions
info() {
  echo "${GREEN}==>${RESET}${BOLD} $*${RESET}"
}

warn() {
  echo "${YELLOW}Warning:${RESET} $*" >&2
}

error() {
  echo "${RED}Error:${RESET} $*" >&2
}

die() {
  error "$*"
  exit 1
}

check_command() {
  local cmd="$1"
  local install_msg="$2"

  if ! command -v "$cmd" &>/dev/null; then
    error "$cmd is not installed"
    echo "  $install_msg" >&2
    exit 1
  fi
}

# Parse arguments
AUTO_CONFIRM=false
while [[ $# -gt 0 ]]; do
  case "$1" in
    -y|--yes)
      AUTO_CONFIRM=true
      shift
      ;;
    -h|--help)
      echo "Usage: $0 [-y|--yes]"
      echo ""
      echo "Installs forge to your system."
      echo ""
      echo "Options:"
      echo "  -y, --yes    Skip confirmation prompts"
      echo "  -h, --help   Show this help message"
      echo ""
      echo "Environment variables:"
      echo "  FORGE_REPO    Repository URL (default: git+ssh://git@github.com/jdillon/forge)"
      echo "  FORGE_BRANCH  Branch to install (default: module-system)"
      exit 0
      ;;
    *)
      die "Unknown option: $1. Use -h for help."
      ;;
  esac
done

# Check prerequisites
info "Checking prerequisites..."

check_command bun "Install Bun from https://bun.sh"
check_command git "Install Git from https://git-scm.com"

# Determine installation locations
FORGE_DATA="${XDG_DATA_HOME:-$HOME/.local/share}/forge"
FORGE_CONFIG="${XDG_CONFIG_HOME:-$HOME/.config}/forge"
FORGE_CACHE="${XDG_CACHE_HOME:-$HOME/.cache}/forge"
FORGE_STATE="${XDG_STATE_HOME:-$HOME/.local/state}/forge"
FORGE_BIN="${HOME}/.local/bin"
FORGE_CMD="${FORGE_BIN}/forge"

# Determine repository URL (SSH for private repos)
FORGE_REPO="${FORGE_REPO:-git+ssh://git@github.com/jdillon/forge}"

# Determine branch (default to module-system for Phase 1, unless explicitly set to empty)
if [[ -z "${FORGE_BRANCH+x}" ]]; then
  # Variable is unset, use default
  FORGE_BRANCH="module-system"
fi
# If FORGE_BRANCH is set (even to empty string), use that value

# Show installation plan
echo
echo "${BOLD}Forge Installation${RESET}"
echo
echo "The following will be installed/created:"
echo "  - Meta-project: ${FORGE_DATA}"
echo "  - Command: ${FORGE_CMD}"
echo
echo "Installation source:"
echo "  - Repository: ${FORGE_REPO}"
if [[ -n "${FORGE_BRANCH}" ]]; then
  echo "  - Branch: ${FORGE_BRANCH}"
else
  echo "  - Branch: (current checkout)"
fi
echo

# Confirm unless -y was passed
if [[ "$AUTO_CONFIRM" != "true" ]]; then
  read -p "Continue? [y/N] " -n 1 -r
  echo
  if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Installation cancelled."
    exit 0
  fi
  echo
fi

# Create meta project directory
info "Creating meta project..."
mkdir -p "${FORGE_DATA}"
cd "${FORGE_DATA}"

# Create or update package.json for meta project
cat > package.json << 'EOF'
{
  "name": "forge-meta",
  "version": "1.0.0",
  "private": true,
  "description": "Forge meta-project for shared dependencies"
}
EOF

# Install forge from GitHub
info "Installing @planet57/forge from GitHub..."
# Build package spec with optional branch suffix
if [[ -n "${FORGE_BRANCH}" ]]; then
  PACKAGE_SPEC="${FORGE_REPO}#${FORGE_BRANCH}"
else
  PACKAGE_SPEC="${FORGE_REPO}"
fi

if ! bun add "${PACKAGE_SPEC}"; then
  die "Failed to install forge. Check your internet connection and GitHub access."
fi

# Verify installation - check for the package
FORGE_PKG_DIR="${FORGE_DATA}/node_modules/@planet57/forge"
if [[ ! -d "${FORGE_PKG_DIR}" ]]; then
  die "Installation verification failed: package not found at ${FORGE_PKG_DIR}"
fi

# Find the CLI entry point
if [[ -f "${FORGE_PKG_DIR}/bin/forge" ]]; then
  FORGE_CLI="${FORGE_PKG_DIR}/bin/forge"
elif [[ -f "${FORGE_DATA}/node_modules/.bin/forge" ]]; then
  FORGE_CLI="${FORGE_DATA}/node_modules/.bin/forge"
else
  die "Installation verification failed: could not find forge CLI binary"
fi

# Create symlink to bootstrap script in bin directory
info "Creating bootstrap symlink..."
FORGE_BOOTSTRAP="${FORGE_PKG_DIR}/bin/forge-bootstrap"

if [[ ! -f "${FORGE_BOOTSTRAP}" ]]; then
  die "Bootstrap script not found at ${FORGE_BOOTSTRAP}"
fi

mkdir -p "${FORGE_BIN}"
ln -sf "${FORGE_BOOTSTRAP}" "${FORGE_CMD}"

# Verify installation works
info "Verifying installation..."
if "${FORGE_CMD}" --version &>/dev/null; then
  VERSION=$("${FORGE_CMD}" --version 2>&1 || echo "unknown")
  info "Successfully installed forge ${VERSION}"
else
  die "Installation verification failed: forge --version did not succeed"
fi

# Check PATH
echo
if echo "$PATH" | grep -q "${FORGE_BIN}"; then
  info "Installation complete! Try: forge --help"
else
  warn "${FORGE_BIN} is not in your PATH"
  echo
  echo "Add this to your shell profile (~/.bashrc, ~/.zshrc, etc.):"
  echo
  echo "  export PATH=\"\${HOME}/.local/bin:\${PATH}\""
  echo
  echo "Then restart your shell or run: source ~/.bashrc"
  echo
  echo "After that, you can run: forge --help"
fi
