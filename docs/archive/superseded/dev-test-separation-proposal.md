# Proposal: Separate Dev, Test, and Installed Modes

**Status:** Approved
**Date:** 2025-01-02
**Updated:** 2025-01-02 (reconciled with Jason's feedback)
**Problem:** Mixed concerns between dev, test, and installed modes causing confusion and slowness

---

## Current Problem

We have **3 different use cases with conflicting needs**:

### 1. Dev Mode (you/me hacking)
- **Need:** Run local changes instantly, no install
- **Current issue:** Uses local `lib/cli.ts` BUT writes to real forge-home (`~/.local/share/forge/`)
- **Problem:** Pollutes real forge-home with test dependencies, mixes dev/installed state

### 2. Test Mode (automated tests)
- **Need:** Clean, isolated, repeatable environment
- **Current issue:** Uses `build/test-node_modules` but tests are fragile, install tests are slow
- **Problem:** Each test run is expensive, hard to debug failures

### 3. Installed Mode (real users)
- **Need:** Stable, installed version in forge-home
- **Current issue:** Works fine, but dev/test modes blur the lines
- **Problem:** Can't test "real" install behavior without affecting dev environment

## Root Cause

**We're trying to use ONE bootstrap script (`bin/forge`) for THREE different modes**, creating chaos:

- Dev mode needs: local code, isolated forge-home
- Test mode needs: packaged code, isolated forge-home
- Installed mode needs: installed code, real forge-home

**The confusion:** Dev mode currently uses local code BUT real forge-home. This is the worst of both worlds - you get fast iteration but pollute your real environment.

---

## Proposed Solution

### Separate the concerns with explicit modes:

```
bin/forge           → Real installed version (users)
bin/forge-dev       → Dev version (you/me hacking)
tests/lib/runner.ts → Test version (isolated)
```

---

## 1. Dev Mode: `bin/forge-dev`

**Create a dedicated dev script** that uses completely isolated environment.

### Implementation: `bin/forge-dev`

```bash
#!/usr/bin/env bash
# bin/forge-dev - For local development only
# Uses local code and isolated forge-home
set -euo pipefail

script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
project_root="${script_dir}/.."

# Dev mode: use local everything
export FORGE_NODE_MODULES="${project_root}/node_modules"
export XDG_DATA_HOME="${project_root}/dev-home"  # Isolated dev forge-home!
export NODE_PATH="${FORGE_NODE_MODULES}"

# Run local CLI directly
exec bun run "${project_root}/lib/cli.ts" "$@"
```

### Directory Structure

```
/project
├── dev-home/                # Dev forge-home (gitignored)
│   └── forge/
│       ├── node_modules/    # Dev dependencies installed here
│       ├── package.json     # Managed by bun
│       └── bunfig.toml
├── node_modules/            # Project dependencies
└── lib/                     # Source code
```

### Benefits

✅ **Fast iteration** - No install step, runs local code
✅ **Isolated** - Doesn't touch real forge-home
✅ **Safe** - Can install test dependencies without polluting
✅ **Clear intent** - You know you're in dev mode

### Usage

```bash
# You and I use this for development
./bin/forge-dev --debug hello greet

# Or make it convenient
alias forge-dev='./bin/forge-dev'
```

---

## 2. Test Mode: One-time install, reuse across tests

**Install forge package once at test suite start, reuse for all tests.**

### Implementation: `tests/lib/test-env.ts`

```typescript
/**
 * Shared test environment setup
 * Installs forge once for entire test suite
 */

import { join } from 'path';
import { existsSync } from 'fs';
import { TEST_DIRS } from './utils';

let testForgeHome: string | null = null;
let testForgeCmd: string | null = null;

/**
 * Set up test environment (called once at test suite start)
 * Installs forge package to isolated location and returns paths
 */
export async function setupTestEnvironment(): Promise<{
  forgeHome: string;
  forgeCmd: string;
  nodeModules: string;
}> {
  if (testForgeHome) {
    // Already set up
    return {
      forgeHome: testForgeHome,
      forgeCmd: testForgeCmd!,
      nodeModules: join(testForgeHome, 'forge', 'node_modules'),
    };
  }

  // One-time setup for entire test suite
  testForgeHome = join(TEST_DIRS.build, 'test-forge-installation');

  // Install forge package once (if not already installed)
  if (!existsSync(join(testForgeHome, 'forge', 'node_modules', '@planet57/forge'))) {
    await installForgeForTests(testForgeHome);
  }

  testForgeCmd = join(testForgeHome, 'bin', 'forge');

  return {
    forgeHome: testForgeHome,
    forgeCmd: testForgeCmd,
    nodeModules: join(testForgeHome, 'forge', 'node_modules'),
  };
}

/**
 * Install forge package for testing
 */
async function installForgeForTests(testHome: string): Promise<void> {
  // Create tarball from current code
  const tarball = await createTestTarball();

  // Run install.sh with test home
  // (Details omitted - similar to current install tests)
}

/**
 * Reset test environment (optionally called between test files)
 */
export async function resetTestEnvironment(): Promise<void> {
  // Clear state, reset forge-home, etc.
  // Keep installation intact for speed
}
```

### Usage in Tests

```typescript
// At top of test file
import { setupTestEnvironment } from './lib/test-env';

describe('My Feature Tests', () => {
  // Get shared test environment
  const testEnv = await setupTestEnvironment();

  test('some test', async () => {
    const result = await runForge({
      args: ['test', 'greet'],
      env: {
        XDG_DATA_HOME: testEnv.forgeHome,
        FORGE_NODE_MODULES: testEnv.nodeModules,
      },
      logDir: logs.logDir,
    });

    expect(result.exitCode).toBe(0);
  });
});
```

### Benefits

✅ **Fast tests** - Install once, reuse many times
✅ **Isolated** - Each test file can reset state if needed
✅ **Realistic** - Tests use installed package (closer to real usage)
✅ **Clean** - Controlled environment

---

## 3. Installed Mode: Keep as-is

**`bin/forge` stays as the production bootstrap script.**

No changes needed - continues to work for real installations.

---

## Complete Directory Structure

```
/project
├── bin/
│   ├── forge              # Production bootstrap (installed mode)
│   ├── forge-dev          # Development bootstrap (dev mode)
│   ├── install.sh         # Production installer
│   └── uninstall.sh       # Production uninstaller
│
├── lib/                   # Source code
│   ├── cli.ts
│   └── ...
│
├── node_modules/          # Project dev dependencies
│
├── dev-home/              # Dev forge-home (gitignored!)
│   └── forge/
│       ├── node_modules/  # Dev module dependencies
│       ├── package.json
│       └── bunfig.toml
│
├── build/
│   ├── test-forge-installation/  # Test forge-home (shared by tests)
│   │   ├── bin/
│   │   │   └── forge      # Installed for tests
│   │   └── forge/
│   │       ├── node_modules/
│   │       └── package.json
│   ├── test-tmp/          # Per-test temp files
│   └── test-logs/         # Test output logs
│
├── examples/
│   └── standard/
│       └── forge -> ../../bin/forge-dev  # Use dev mode
│
└── ~/.local/share/forge/  # Real forge-home (production)
    ├── node_modules/
    └── package.json
```

**Note:** Once all 3 modes are working, we'll simplify the primary `bin/forge` script by removing dev mode detection.

---

## Migration Path

### Phase 1: Create Dev Mode ✅ APPROVED
1. Create `bin/forge-dev` script
2. Add `dev-home/` to `.gitignore`
3. Update examples to use `forge-dev`
4. You and I switch to using `forge-dev` for development
5. Dev mode auto-installs dependencies for convenience

### Phase 2: Update Tests ✅ APPROVED
1. Create `tests/lib/test-env.ts` with shared setup
2. Tests install package once (not use forge-dev - keeps dev hacking isolated)
3. Update test runner to use test environment
4. Update existing tests to use shared environment
5. Verify all tests pass and are faster

### Phase 3: Cleanup (LATER - after phases 1-2 work)
1. Simplify `bin/forge` by removing dev mode detection
2. Update documentation
3. Remove old test isolation hacks
4. Celebrate cleaner codebase 🎉

---

## Decisions Made ✅

### Q1: Should `forge-dev` auto-install dependencies?

**Decision:** **A** - Yes, auto-install to `./dev-home/forge/node_modules/` when config changes
**Rationale:** Convenience for development, uses isolated dev-home so it's safe

### Q2: Should tests use `forge-dev` or install a package?

**Decision:** **B** - Tests install package once and reuse
**Rationale:** Don't let dev hacking interfere with tests. Tests should be as close to real usage as possible.

### Q3: How to handle example projects?

**Decision:** **A** - Examples symlink to `forge-dev`
**Rationale:** Examples are for demonstrating features during development

### Q4: Should we keep `bin/forge` dev mode detection?

**Decision:** **A** - Remove dev mode from `bin/forge`, make it production-only
**Timing:** Only after phases 1-2 work (don't thrash too much at once)

---

## What This Solves

✅ **Dev mode confusion** - Clear separation, isolated environment
✅ **Test slowness** - One-time install, fast test runs
✅ **Polluted forge-home** - Dev uses isolated `./forge-home/`
✅ **Mixed state bugs** - Each mode has clear boundaries
✅ **Iteration speed** - `forge-dev` is instant, no install

## What This Doesn't Solve

❌ **Test flakiness** - Still need good test patterns
❌ **Complex module system** - Separate issue
❌ **Documentation** - Need to update docs after changes

---

## Trade-offs

### Pros
- Clear separation of concerns
- Faster development iteration
- Faster test execution (after first install)
- No more polluted environments
- Easier to reason about

### Cons
- One more script to maintain (`forge-dev`)
- Tests have initial setup cost (one-time)
- Need to update documentation
- Need to migrate existing tests

---

## Next Steps

1. **Review this proposal** - Does this solve the problem?
2. **Discuss open questions** - Make decisions on auto-install, test strategy, etc.
3. **Prototype `forge-dev`** - Create and test the dev script
4. **Update one test file** - Prove the test environment works
5. **Full migration** - Update all tests and docs

---

## Alternative Considered: Environment Variables Only

Instead of separate scripts, use environment variables to control mode:

```bash
FORGE_MODE=dev ./bin/forge ...
FORGE_MODE=test ./bin/forge ...
FORGE_MODE=prod ./bin/forge ...
```

**Rejected because:**
- More complex logic in one script
- Easy to forget to set FORGE_MODE
- Less explicit than separate scripts
- Harder to debug which mode you're in

Separate scripts are clearer and harder to misuse.

---

## Summary

**Approved for implementation.** All key decisions made:
- Use `dev-home/` for development isolation
- Auto-install dependencies in dev mode
- Tests install package once (not use forge-dev)
- Examples use forge-dev
- Simplify bin/forge later (after phases 1-2 work)

Next: Begin Phase 1 implementation.
