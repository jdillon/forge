#!/usr/bin/env bash
set -euo pipefail

# Forge v2 Uninstallation Script
# Removes forge installation from ~/.local/share/forge and ~/.local/bin/forge

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

# Determine installation locations (all potential XDG directories)
FORGE_DATA="${XDG_DATA_HOME:-$HOME/.local/share}/forge"
FORGE_CONFIG="${XDG_CONFIG_HOME:-$HOME/.config}/forge"
FORGE_CACHE="${XDG_CACHE_HOME:-$HOME/.cache}/forge"
FORGE_STATE="${XDG_STATE_HOME:-$HOME/.local/state}/forge"
FORGE_BIN="${HOME}/.local/bin"
FORGE_CMD="${FORGE_BIN}/forge"

# Check what exists
ITEMS_TO_REMOVE=()
CONFIG_EXISTS=false

if [[ -d "${FORGE_DATA}" ]]; then
  ITEMS_TO_REMOVE+=("  - ${FORGE_DATA}")
fi
if [[ -d "${FORGE_CONFIG}" ]]; then
  CONFIG_EXISTS=true
  if [[ "$PURGE_CONFIG" == "true" ]]; then
    ITEMS_TO_REMOVE+=("  - ${FORGE_CONFIG}")
  fi
fi
if [[ -d "${FORGE_CACHE}" ]]; then
  ITEMS_TO_REMOVE+=("  - ${FORGE_CACHE}")
fi
if [[ -d "${FORGE_STATE}" ]]; then
  ITEMS_TO_REMOVE+=("  - ${FORGE_STATE}")
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
  echo "${YELLOW}Note:${RESET} Configuration will be preserved at ${FORGE_CONFIG}"
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

# Remove installation (all XDG directories)
if [[ -d "${FORGE_DATA}" ]]; then
  info "Removing ${FORGE_DATA}..."
  rm -rf "${FORGE_DATA}"
fi

if [[ -d "${FORGE_CONFIG}" && "$PURGE_CONFIG" == "true" ]]; then
  info "Removing ${FORGE_CONFIG}..."
  rm -rf "${FORGE_CONFIG}"
fi

if [[ -d "${FORGE_CACHE}" ]]; then
  info "Removing ${FORGE_CACHE}..."
  rm -rf "${FORGE_CACHE}"
fi

if [[ -d "${FORGE_STATE}" ]]; then
  info "Removing ${FORGE_STATE}..."
  rm -rf "${FORGE_STATE}"
fi

if [[ -L "${FORGE_CMD}" ]] || [[ -f "${FORGE_CMD}" ]]; then
  info "Removing ${FORGE_CMD}..."
  rm -f "${FORGE_CMD}"
fi

info "Forge has been uninstalled"
