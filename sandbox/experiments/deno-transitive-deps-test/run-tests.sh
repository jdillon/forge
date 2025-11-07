#!/usr/bin/env bash
set -euo pipefail

echo "============================================"
echo "Deno Transitive Dependencies Test"
echo "============================================"
echo ""

# Check if deno is installed
if ! command -v deno &> /dev/null; then
    echo "❌ Deno not found. Please install: https://deno.land/"
    exit 1
fi

echo "Using: $(deno --version | head -1)"
echo ""

# Test 1: npm package
echo "============================================"
echo "Test 1: npm Package (express)"
echo "============================================"
cd test-1-npm-package
echo "Caching dependencies..."
deno cache --quiet main.ts 2>&1 | head -20 || true
echo ""
echo "Running test..."
deno run --allow-all main.ts
echo ""
if [ -f deno.lock ]; then
    echo "Lock file created: $(wc -l < deno.lock) lines"
    echo "npm dependencies in lock file:"
    jq -r '.npm.packages | keys[]' deno.lock 2>/dev/null | wc -l || echo "Could not parse lock file"
fi
cd ..
echo ""

# Test 2: JSR package
echo "============================================"
echo "Test 2: JSR Package (oak)"
echo "============================================"
cd test-2-jsr-package
echo "Caching dependencies..."
deno cache --quiet main.ts 2>&1 | head -20 || true
echo ""
echo "Running test..."
deno run --allow-all main.ts
echo ""
if [ -f deno.lock ]; then
    echo "Lock file created: $(wc -l < deno.lock) lines"
fi
cd ..
echo ""

# Test 3: User module
echo "============================================"
echo "Test 3: User Module (forge mock)"
echo "============================================"
cd test-3-user-module
echo "Caching dependencies..."
deno cache --quiet user-module/command.ts 2>&1 | head -20 || true
echo ""
echo "Running test..."
deno run --allow-all user-module/command.ts
echo ""
if [ -f user-module/deno.lock ]; then
    echo "Lock file created: $(wc -l < user-module/deno.lock) lines"
fi
cd ..
echo ""

echo "============================================"
echo "All Tests Complete"
echo "============================================"
echo ""
echo "If all three tests passed, transitive dependencies work!"
echo "See RESULTS.md for analysis."
