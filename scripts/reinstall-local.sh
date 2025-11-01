#!/usr/bin/env bash
# Helper script for local testing - reinstalls from local tarball
set -euo pipefail

cd "$(dirname "${BASH_SOURCE[0]}")/.."

echo "==> Building tarball..."
bun run pack

echo
echo "==> Uninstalling current version..."
./bin/uninstall.sh --purge -y 2>/dev/null || true

echo
echo "==> Installing from local tarball..."
FORGE_REPO="file://$(pwd)/build/planet57-forge-2.0.0-alpha.1.tgz" \
FORGE_BRANCH="" \
./bin/install.sh -y

echo
echo "==> Testing installation..."
forge --version
