#!/usr/bin/env bash
# Copyright 2025 Jason Dillon
#
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
#
#      http://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.
set -euo pipefail

# Forge v2 Installation Script
# Installs forge to ~/.forge and creates wrapper at ~/.local/bin/forge

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
FORGE_HOME="${FORGE_HOME:-$HOME/.forge}"
FORGE_BIN="${HOME}/.local/bin"
FORGE_CMD="${FORGE_BIN}/forge"

# Auto-detect local development mode
# If running from a git repo with a local tarball, use that instead of GitHub
if [[ -z "${FORGE_REPO:-}" ]]; then
  SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
  REPO_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"

  # Check if we're in the forge git repo and have a local tarball
  if [[ -d "${REPO_ROOT}/.git" ]]; then
    # Find any planet57-forge-*.tgz tarball
    TARBALL=$(ls -t "${REPO_ROOT}/build/planet57-forge-"*.tgz 2>/dev/null | head -n1)
    if [[ -n "${TARBALL}" ]]; then
      # Use local tarball for development
      FORGE_REPO="file://${TARBALL}"
      FORGE_BRANCH=""
      info "Detected local development mode - using tarball: $(basename "${TARBALL}")"
    else
      # Use GitHub for production installs
      FORGE_REPO="git+ssh://git@github.com/jdillon/forge"
      # Determine branch (default to module-system for Phase 1, unless explicitly set to empty)
      if [[ -z "${FORGE_BRANCH+x}" ]]; then
        FORGE_BRANCH="module-system"
      fi
    fi
  else
    # Use GitHub for production installs
    FORGE_REPO="git+ssh://git@github.com/jdillon/forge"
    # Determine branch (default to module-system for Phase 1, unless explicitly set to empty)
    if [[ -z "${FORGE_BRANCH+x}" ]]; then
      FORGE_BRANCH="module-system"
    fi
  fi
else
  # FORGE_REPO was explicitly set, use it
  if [[ -z "${FORGE_BRANCH+x}" ]]; then
    FORGE_BRANCH="module-system"
  fi
fi

# Show installation plan
echo
echo "${BOLD}Forge Installation${RESET}"
echo
echo "The following will be installed/created:"
echo "  - Forge home: ${FORGE_HOME}"
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

# Create forge home directory with subdirectories
info "Creating forge home..."
mkdir -p "${FORGE_HOME}"/{config,state,cache,logs}
cd "${FORGE_HOME}"

# Create or update package.json for meta project
cat > package.json << 'EOF'
{
  "name": "forge-meta",
  "version": "1.0.0",
  "private": true,
  "description": "Forge meta-project for shared dependencies"
}
EOF

# Create bunfig.toml for bun install configuration
cat > bunfig.toml << 'EOF'
[install]
exact = true
dev = false
peer = true
optional = false
auto = "disable"
EOF

# Create tsconfig.json for module resolution control
# This file is used with --tsconfig-override flag to control module resolution
cat > tsconfig.json << 'EOF'
{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@forge/*": ["./node_modules/@planet57/forge/lib/*"]
    }
  }
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
FORGE_PKG_DIR="${FORGE_HOME}/node_modules/@planet57/forge"
if [[ ! -d "${FORGE_PKG_DIR}" ]]; then
  die "Installation verification failed: package not found at ${FORGE_PKG_DIR}"
fi

# Generate version.json
info "Generating version information..."

# Read base version from package.json
VERSION=$(node -p "require('${FORGE_PKG_DIR}/package.json').version" 2>/dev/null || echo "unknown")

# Try to get git info (works if package was installed with .git directory)
if cd "${FORGE_PKG_DIR}" 2>/dev/null && git rev-parse --git-dir &>/dev/null; then
  HASH=$(git rev-parse --short HEAD 2>/dev/null || echo "unknown")
  HASH_FULL=$(git rev-parse HEAD 2>/dev/null || echo "unknown")
  TIMESTAMP=$(git log -1 --format=%cI HEAD 2>/dev/null || date -u +"%Y-%m-%dT%H:%M:%SZ")
  TIMESTAMP_UNIX=$(git log -1 --format=%ct HEAD 2>/dev/null || echo "0")
  BRANCH=$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo "unknown")
  DIRTY=$(git diff-index --quiet HEAD 2>/dev/null && echo "false" || echo "true")
else
  # Fallback if no git info available (e.g., npm/tarball install)
  HASH="unknown"
  HASH_FULL="unknown"
  TIMESTAMP=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
  TIMESTAMP_UNIX=$(date +%s)
  BRANCH="unknown"
  DIRTY="false"
fi

# Extract date and time components (YYYYMMDD.HHMM) from timestamp
# Timestamp format: 2025-11-09T21:28:47Z or 2025-11-09T12:49:29-08:00
DATE_PART=$(echo "$TIMESTAMP" | cut -d'T' -f1 | tr -d '-')  # 20251109
TIME_PART=$(echo "$TIMESTAMP" | cut -d'T' -f2 | cut -d':' -f1,2 | tr -d ':')  # 2128
DATE_TIME="${DATE_PART}.${TIME_PART}"

# Build semver string
if [[ "$HASH" != "unknown" ]]; then
  SEMVER="${VERSION}+${DATE_TIME}.${HASH}"
else
  SEMVER="${VERSION}+${DATE_TIME}"
fi

# Write version.json to forge home
cat > "${FORGE_HOME}/version.json" <<EOF
{
  "version": "$VERSION",
  "hash": "$HASH",
  "hashFull": "$HASH_FULL",
  "timestamp": "$TIMESTAMP",
  "timestampUnix": $TIMESTAMP_UNIX,
  "branch": "$BRANCH",
  "dirty": $DIRTY,
  "semver": "$SEMVER"
}
EOF

cd "${FORGE_HOME}"
info "Version: $SEMVER"

# Find the CLI entry point
if [[ -f "${FORGE_PKG_DIR}/bin/forge" ]]; then
  FORGE_CLI="${FORGE_PKG_DIR}/bin/forge"
elif [[ -f "${FORGE_HOME}/node_modules/.bin/forge" ]]; then
  FORGE_CLI="${FORGE_HOME}/node_modules/.bin/forge"
else
  die "Installation verification failed: could not find forge CLI binary"
fi

# Create symlink to bootstrap script in bin directory
info "Creating bootstrap symlink..."
FORGE_BOOTSTRAP="${FORGE_PKG_DIR}/bin/forge"

if [[ ! -f "${FORGE_BOOTSTRAP}" ]]; then
  die "Bootstrap script not found at ${FORGE_BOOTSTRAP}"
fi

mkdir -p "${FORGE_BIN}"
ln -sf "${FORGE_BOOTSTRAP}" "${FORGE_CMD}"

# Verify installation works
info "Verifying installation..."
if VERSION=$("${FORGE_CMD}" --version 2>&1); then
  info "Successfully installed forge ${VERSION}"
else
  echo "ERROR: Installation verification failed" >&2
  echo "Output from 'forge --version':" >&2
  echo "${VERSION}" >&2
  exit 1
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
