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

# Check prerequisites
info "Checking prerequisites..."

check_command bun "Install Bun from https://bun.sh"
check_command git "Install Git from https://git-scm.com"

# Determine installation locations
FORGE_SHARE="${XDG_DATA_HOME:-$HOME/.local/share}/forge"
FORGE_BIN="${HOME}/.local/bin"
FORGE_WRAPPER="${FORGE_BIN}/forge"

# Determine branch (default to module-system for Phase 1)
FORGE_BRANCH="${FORGE_BRANCH:-module-system}"

info "Installing forge..."
echo "  Share location: ${FORGE_SHARE}"
echo "  Binary location: ${FORGE_WRAPPER}"
echo "  Branch: ${FORGE_BRANCH}"
echo

# Create meta project directory
info "Creating meta project..."
mkdir -p "${FORGE_SHARE}"
cd "${FORGE_SHARE}"

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
if ! bun add "github:jdillon/forge#${FORGE_BRANCH}"; then
  die "Failed to install forge. Check your internet connection and GitHub access."
fi

# Verify installation
FORGE_CLI="${FORGE_SHARE}/node_modules/@planet57/forge/bin/forge2"
if [[ ! -f "${FORGE_CLI}" ]]; then
  die "Installation verification failed: ${FORGE_CLI} not found"
fi

# Create wrapper script
info "Creating wrapper script..."
mkdir -p "${FORGE_BIN}"

cat > "${FORGE_WRAPPER}" << 'EOF'
#!/usr/bin/env bash
# Forge wrapper script - delegates to installed version
set -euo pipefail

FORGE_SHARE="${XDG_DATA_HOME:-$HOME/.local/share}/forge"
FORGE_CLI="${FORGE_SHARE}/node_modules/@planet57/forge/bin/forge2"

if [[ ! -f "${FORGE_CLI}" ]]; then
  echo "Error: Forge not found at ${FORGE_CLI}" >&2
  echo "Run install.sh to reinstall forge" >&2
  exit 1
fi

exec bun "${FORGE_CLI}" "$@"
EOF

chmod +x "${FORGE_WRAPPER}"

# Verify wrapper works
info "Verifying installation..."
if "${FORGE_WRAPPER}" --version &>/dev/null; then
  VERSION=$("${FORGE_WRAPPER}" --version 2>&1 || echo "unknown")
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
