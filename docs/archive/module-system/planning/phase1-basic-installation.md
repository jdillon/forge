# Phase 1: Basic Installation & Local Modules

**Epic**: [#2 Module Distribution System](https://github.com/jdillon/forge-bash/issues/2)
**Issue**: [#10 Phase 1: Basic Installation & Local Modules](https://github.com/jdillon/forge-bash/issues/10)
**Spec Reference**: [installation-and-module-system.md](../../planning/installation-and-module-system.md#phase-1-basic-installation--local-modules)
**Status**: Ready to Start
**Branch**: `module-system` (to be created from `module-system`)

**Related Docs**:
- [phase1-execution-plan.md](./phase1-execution-plan.md) - Full execution plan with branching strategy
- [phase1-summary.md](./phase1-summary.md) - Quick reference guide

---

## Goals

Get forge installable with local modules working. No changes to current module loading yet.

**Success Criteria:**
- ✅ Can install forge via `install.sh`
- ✅ `forge --version` works
- ✅ Local modules (`.forge2/*.ts`) still work

---

## Tasks

### 1. Create `package.json`

Add proper npm package metadata to the repo root.

**Required fields:**
```json
{
  "name": "@planet57/forge",
  "version": "2.0.0-alpha.1",
  "description": "Modern CLI framework for deployments",
  "type": "module",
  "bin": {
    "forge": "./cli.ts"
  },
  "exports": {
    ".": "./lib/core.ts",
    "./types": "./lib/types.ts"
  },
  "files": [
    "cli.ts",
    "lib/**/*.ts",
    "README.md"
  ],
  "repository": {
    "type": "git",
    "url": "https://github.com/jdillon/forge.git"
  },
  "author": "Jason Dillon",
  "license": "MIT"
}
```

**Decisions to make:**
- [ ] Exact version number format (semver with alpha/beta?)
- [ ] What to include in `files` array
- [ ] Export structure (what should be importable?)

---

### 2. Create `install.sh`

One-line installation script.

**Location**: `install.sh` (repo root)

**Responsibilities:**
1. Check prerequisites (Bun, Git)
2. Create meta project at `~/.local/share/forge/`
3. Install forge via `bun add github:jdillon/forge#module-system`
4. Create wrapper script at `~/.local/bin/forge`
5. Verify installation works
6. Provide PATH instructions if needed

**Key decisions:**
- [ ] Bash or shell script? (Bash = more features, sh = more portable)
- [ ] Error handling verbosity
- [ ] Interactive vs silent mode
- [ ] Colorized output?

**Pseudocode:**
```bash
#!/usr/bin/env bash
set -euo pipefail

# Check prerequisites
check_command bun "Bun is required. Install from https://bun.sh"
check_command git "Git is required"

# Create meta project
mkdir -p ~/.local/share/forge
cd ~/.local/share/forge
echo '{"name":"forge-meta","version":"1.0.0"}' > package.json

# Install forge
bun add github:jdillon/forge#module-system

# Create wrapper
mkdir -p ~/.local/bin
cat > ~/.local/bin/forge << 'EOF'
#!/usr/bin/env bash
exec bun ~/.local/share/forge/node_modules/@planet57/forge/cli.ts "$@"
EOF
chmod +x ~/.local/bin/forge

# Verify
~/.local/bin/forge --version

# Check PATH
if ! echo "$PATH" | grep -q "$HOME/.local/bin"; then
  echo "Add ~/.local/bin to PATH"
fi
```

---

### 3. Test Installation Flow

**Test scenarios:**
1. Fresh install (no existing forge)
2. Re-install (forge already exists)
3. Missing Bun (should fail gracefully)
4. Missing Git (should fail gracefully)
5. PATH not including ~/.local/bin

**Test environments:**
- [ ] macOS (primary)
- [ ] Linux (Ubuntu/Debian)
- [ ] Linux (RHEL/Fedora)

---

### 4. Verify Wrapper Script

**Tests:**
- [ ] `forge --version` shows correct version
- [ ] `forge --help` shows help
- [ ] Arguments pass through correctly
- [ ] Exit codes propagate
- [ ] stdin/stdout/stderr work

**Edge cases:**
- [ ] Arguments with spaces
- [ ] Arguments with special characters
- [ ] Very long argument lists
- [ ] Piped input/output

---

### 5. Ensure Local Modules Still Work

**Test with `examples/website/`:**
```bash
cd examples/website
forge website build
forge website deploy
```

**Verify:**
- [ ] Commands discovered correctly
- [ ] Arguments passed correctly
- [ ] Context (forge, config, state) available
- [ ] Error handling works
- [ ] No regressions from current implementation

---

## Implementation Notes

### package.json Considerations

**What to export:**
- Core framework (`./lib/core.ts`) for programmatic use
- Types (`./lib/types.ts`) for module authors
- Maybe utilities? (logger, state, etc.)

**Bin entry point:**
- Points to `cli.ts` (current entry point)
- No changes needed to existing code

**Files to include:**
- TypeScript source (Bun handles natively)
- No build step required
- Keep it simple

---

### Wrapper Script Considerations

**Pure bash vs Bun script:**

**Option A: Pure Bash** (recommended)
```bash
#!/usr/bin/env bash
exec bun ~/.local/share/forge/node_modules/@planet57/forge/cli.ts "$@"
```
- ✅ Simple, fast
- ✅ No extra dependencies
- ✅ Easy to debug
- ❌ Limited logic capability

**Option B: Bun Script**
```typescript
#!/usr/bin/env bun
import { spawn } from 'bun';
const cliPath = `${process.env.HOME}/.local/share/forge/node_modules/@planet57/forge/cli.ts`;
const result = spawn(['bun', cliPath, ...process.argv.slice(2)], { stdio: 'inherit' });
process.exit(await result.exited);
```
- ✅ More powerful (version checking, etc.)
- ❌ Slower startup
- ❌ More complex
- ❌ Harder to debug

**Decision**: Start with bash, can enhance later if needed.

---

### Installation Script Considerations

**Error handling:**
- Clear, actionable error messages
- Suggest solutions (e.g., "Install Bun: brew install oven-sh/bun/bun")
- Exit codes: 0 = success, 1 = user error, 2 = system error

**Idempotency:**
- Safe to run multiple times
- Update existing installation
- Don't break if partially installed

**User feedback:**
- Show what's happening
- Indicate progress
- Confirm success

---

## Files to Create/Modify

### New Files
- [ ] `install.sh` - Installation script
- [ ] `package.json` - npm package metadata

### Modified Files
- [ ] `README.md` - Update installation instructions
- [ ] `CHANGELOG.md` - Add entry for Phase 1

### No Changes Needed
- `cli.ts` - Works as-is
- `lib/core.ts` - Works as-is
- `examples/website/` - Should work unchanged
- `tests/` - Should pass unchanged

---

## Testing Checklist

- [ ] Install script runs successfully
- [ ] Wrapper script delegates correctly
- [ ] `forge --version` works
- [ ] `forge --help` works
- [ ] Local modules load and execute
- [ ] Examples still work
- [ ] Tests still pass
- [ ] No regressions

---

## Gotchas & Learning

*(Track issues discovered during implementation)*

---

## Current State

**Branch**: Working on `module-system`
**Tests**: 39 passing, 0 skipping, 0 failing
**Examples**: `examples/website/` working with local modules
**Module loading**: Currently loads from `.forge2/*.ts` only

## Open Questions

1. **Package name**: Confirm `@planet57/forge` is correct scope
2. **Version number**: Start with `2.0.0-alpha.1` or `0.2.0`?
3. **npm registry**: Publish to npm or just GitHub packages?
4. **Homebrew**: Create formula for easier installation?

## Implementation Notes

**Key files**:
- `cli.ts` - Current entry point (will become bin target)
- `lib/core.ts` - Framework implementation
- `examples/website/.forge2/` - Local module example (DO NOT modify in tests)
- `tests/fixtures/` - Use for testing

**Installation approach**:
- Meta project at `~/.local/share/forge/`
- Wrapper script at `~/.local/bin/forge`
- Install via `bun add github:jdillon/forge#module-system`

**Testing strategy**:
- Keep existing 39 tests passing
- Add tests for installation flow
- Mark any temporary tests clearly (see phase1-execution-plan.md § Testing Strategy)

---

## Handoff to Phase 2

**What Phase 2 needs:**
- Working installation via `install.sh`
- Meta project at `~/.local/share/forge/`
- Wrapper script at `~/.local/bin/forge`
- package.json with proper exports
- No changes to module loading yet (Phase 2 will implement resolver)

**State to preserve:**
- Current local module loading still works
- Test suite passes
- Examples work unchanged
