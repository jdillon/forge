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

# Forge v2 Uninstallation Script
# Removes forge installation from ~/.forge and ~/.local/bin/forge

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

# Parse arguments
AUTO_CONFIRM=false
PURGE_CONFIG=false
while [[ $# -gt 0 ]]; do
  case "$1" in
    -y|--yes)
      AUTO_CONFIRM=true
      shift
      ;;
    --purge)
      PURGE_CONFIG=true
      shift
      ;;
    -h|--help)
      echo "Usage: $0 [-y|--yes] [--purge]"
      echo ""
      echo "Uninstalls forge from your system."
      echo ""
      echo "Options:"
      echo "  -y, --yes    Skip confirmation prompts"
      echo "  --purge      Also remove configuration (default: keep config)"
      echo "  -h, --help   Show this help message"
      exit 0
      ;;
    *)
      die "Unknown option: $1. Use -h for help."
      ;;
  esac
done

# Determine installation locations
FORGE_HOME="${FORGE_HOME:-$HOME/.forge}"
FORGE_CONFIG="${FORGE_HOME}/config"
FORGE_BIN="${HOME}/.local/bin"
FORGE_CMD="${FORGE_BIN}/forge"

# Check what exists
ITEMS_TO_REMOVE=()
CONFIG_EXISTS=false

if [[ -d "${FORGE_HOME}" ]]; then
  # Check if config subdirectory exists
  if [[ -d "${FORGE_CONFIG}" ]]; then
    CONFIG_EXISTS=true
  fi

  if [[ "$PURGE_CONFIG" == "true" ]]; then
    # Remove entire FORGE_HOME including config
    ITEMS_TO_REMOVE+=("  - ${FORGE_HOME}")
  else
    # Remove everything except config subdirectory
    ITEMS_TO_REMOVE+=("  - ${FORGE_HOME} (preserving config/)")
  fi
fi

if [[ -L "${FORGE_CMD}" ]] || [[ -f "${FORGE_CMD}" ]]; then
  ITEMS_TO_REMOVE+=("  - ${FORGE_CMD}")
fi

# Nothing to uninstall
if [[ ${#ITEMS_TO_REMOVE[@]} -eq 0 ]]; then
  info "Forge is not installed (nothing to remove)"
  exit 0
fi

# Show what will be removed
echo
echo "${BOLD}Forge Uninstallation${RESET}"
echo
echo "The following will be removed:"
for item in "${ITEMS_TO_REMOVE[@]}"; do
  echo "$item"
done
echo

# Show notes about what's preserved
if [[ "$CONFIG_EXISTS" == "true" && "$PURGE_CONFIG" != "true" ]]; then
  echo "${YELLOW}Note:${RESET} Configuration will be preserved in ${FORGE_CONFIG}"
  echo "      Use --purge to also remove configuration"
  echo
fi
echo "${YELLOW}Note:${RESET} Project files (e.g., .forge2/) will ${BOLD}NOT${RESET} be modified."
echo

# Confirm unless -y was passed
if [[ "$AUTO_CONFIRM" != "true" ]]; then
  read -p "Continue? [y/N] " -n 1 -r
  echo
  if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Uninstallation cancelled."
    exit 0
  fi
fi

# Remove installation
if [[ -d "${FORGE_HOME}" ]]; then
  if [[ "$PURGE_CONFIG" == "true" ]]; then
    # Remove everything including config
    info "Removing ${FORGE_HOME}..."
    rm -rf "${FORGE_HOME}"
  else
    # Remove everything except config subdirectory
    info "Removing ${FORGE_HOME} (preserving config/)..."

    # Remove all files and directories except config/
    find "${FORGE_HOME}" -mindepth 1 -maxdepth 1 ! -name 'config' -exec rm -rf {} +

    # If FORGE_HOME is now empty except for config/, and config/ is empty, remove it all
    if [[ ! -d "${FORGE_CONFIG}" ]] || [[ -z "$(ls -A "${FORGE_CONFIG}" 2>/dev/null)" ]]; then
      if [[ $(find "${FORGE_HOME}" -mindepth 1 | wc -l) -eq 0 ]] || \
         [[ $(find "${FORGE_HOME}" -mindepth 1 -maxdepth 1 | wc -l) -eq 1 && -d "${FORGE_CONFIG}" && -z "$(ls -A "${FORGE_CONFIG}")" ]]; then
        rm -rf "${FORGE_HOME}"
      fi
    fi
  fi
fi

if [[ -L "${FORGE_CMD}" ]] || [[ -f "${FORGE_CMD}" ]]; then
  info "Removing ${FORGE_CMD}..."
  rm -f "${FORGE_CMD}"
fi

info "Forge has been uninstalled"
