# Deno Migration Plan - High-Level

**Goal:** Replace Bun runtime with Deno for Forge CLI execution
**Keep:** Bun for build tooling, tests, development (separate concern)
**Timeline:** 3-4 days implementation + 1 day testing

---

## Executive Summary

The migration is straightforward with **minimal code changes**. Most of the work is configuration and dependency management.

**Key changes:**
1. Replace `package.json` → `deno.jsonc` (dependency declarations)
2. Add dax import for shell scripting (one import line)
3. Replace 2 Bun.* API calls → Deno API equivalents
4. Update bin/forge wrapper script
5. Keep all business logic unchanged

---

## Files That Need Changes

### 1. Configuration & Dependencies (1 day)

#### Create: `deno.jsonc` (new)
**What:** Deno's config file, replaces package.json for runtime deps

**Content:**
```jsonc
{
  // Import maps - control module resolution
  "imports": {
    // Forge internal
    "@forge/command": "./lib/command.ts",
    "forge/": "./lib/",

    // Deno standard library
    "@std/path": "jsr:@std/path@^1.0.0",
    "@std/fs": "jsr:@std/fs@^1.0.0",

    // npm packages (keep existing ones)
    "commander": "npm:commander@14.0.2",
    "chalk": "npm:chalk@^5.3.0",
    "ora": "npm:ora@^8.0.0",
    "boxen": "npm:boxen@^7.1.1",
    "listr2": "npm:listr2@^8.0.0",
    "cli-table3": "npm:cli-table3@^0.6.3",
    "pino": "npm:pino@^8.19.0",
    "pino-pretty": "npm:pino-pretty@^11.0.0",
    "enquirer": "npm:enquirer@^2.4.1",
    "cosmiconfig": "npm:cosmiconfig@^9.0.0",
    "zod": "npm:zod@^4.1.12",

    // Shell scripting (replacement for Bun's $)
    "dax": "jsr:@david/dax@^0.42.0"
  },

  "lock": "./deno.lock",
  "nodeModulesDir": "none"
}
```

**Notes:**
- All existing npm packages work via `npm:` prefix
- No code changes needed for these dependencies
- Import maps provide module resolution control (solves our core problem)

#### Update: `package.json` (keep for build tooling)
**What:** Keep for Bun build/test, but remove runtime-specific fields

**Changes:**
- Change `"description"` to mention "Deno runtime"
- Update `"engines"` to include Deno
- Keep all `scripts` (for Bun development)
- Keep all `devDependencies`

**Why keep it:** Bun is still our build/test/dev tool, just not the runtime.

---

### 2. Shell Scripting - Add dax Import (30 min)

#### Update: `lib/command.ts`
**Current:**
```typescript
export { $ } from 'bun';
```

**New:**
```typescript
import $ from 'dax';
export { $ };
```

**Impact:** Any command that uses `$` now imports from dax instead of Bun.
**User code:** No changes needed (same API).

---

### 3. File I/O - Replace Bun.* APIs (30 min)

#### Update: `lib/state.ts`
**Current:**
```typescript
const file = Bun.file(filepath);
const data = await file.json();

await Bun.write(filepath, JSON.stringify(data, null, 2));
```

**New:**
```typescript
const text = await Deno.readTextFile(filepath);
const data = JSON.parse(text);

await Deno.writeTextFile(filepath, JSON.stringify(data, null, 2));
```

**Impact:** Only 2 call sites in `lib/state.ts`.

---

### 3b. Process Spawning - Replace Bun.spawn (CRITICAL - 1 day)

#### Update: `lib/forge-home.ts`
**Current:**
```typescript
const proc = Bun.spawn(['bun', 'add', dep], {
  cwd: forgeHome,
  stdout: 'pipe',
  stderr: 'pipe',
});

const exitCode = await proc.exited;
```

**New Options:**

**Option A: Use dax for git operations (RECOMMENDED)**
```typescript
import $ from 'dax';

// For git URLs
if (dep.startsWith('git+') || dep.includes('github.com')) {
  await $`git clone ${dep} ${targetPath}`.cwd(forgeHome);
}

// For file: URLs (already supported by Bun)
if (dep.startsWith('file:')) {
  // Copy from local path
}

// For npm packages
// Let Deno handle via import maps (no bun add needed!)
```

**Option B: Use Deno.Command**
```typescript
const cmd = new Deno.Command('git', {
  args: ['clone', dep, targetPath],
  cwd: forgeHome,
  stdout: 'piped',
  stderr: 'piped',
});

const { code, stdout, stderr } = await cmd.output();
if (code !== 0) {
  throw new Error(`Git clone failed: ${new TextDecoder().decode(stderr)}`);
}
```

**Impact:**
- **CRITICAL**: Current code uses `bun add` which won't work with Deno
- **SOLUTION**: Implement custom git clone logic
- **BENEFIT**: More control, works with SSH keys (no HTTPS token issue!)
- **FILE URLS**: Easy - just copy from file:// path
- **NPM PACKAGES**: Handled by deno.jsonc imports (no install needed!)

---

### 4. Process/Environment - Already Compatible! (0 min)

The code uses `process.env`, `process.cwd()`, etc. which Deno supports via Node compatibility.

**No changes needed** to files like:
- `lib/cli.ts`
- `lib/core.ts`
- `lib/logging/logger.ts`
- `lib/auto-install.ts`
- `lib/xdg.ts`

---

### 5. Wrapper Script - Update bin/forge (1 hour)

#### Current: `bin/forge`
```bash
#!/usr/bin/env bun
bun --tsconfig-override="${forge_home}/tsconfig.json" run "${forge_home}/lib/cli.ts" "$@"
```

#### New: `bin/forge`
```bash
#!/usr/bin/env bash
set -euo pipefail

# Determine forge home
forge_home="${XDG_DATA_HOME:-$HOME/.local/share}/forge"

# Execute via Deno (no env vars needed)
exec deno run \
  --config="${forge_home}/deno.jsonc" \
  --allow-read \
  --allow-write \
  --allow-net \
  --allow-env \
  --allow-run \
  "${forge_home}/lib/cli.ts" \
  "$@"
```

**Notes:**
- No `--tsconfig-override` (fixes our bug!)
- No `DENO_DIR` env var (global cache is safe)
- Explicit permissions (can use `--allow-all` for simplicity)

#### Update: `bin/forge-dev`
Similar changes for dev mode:
```bash
#!/usr/bin/env bash
dev_home="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

exec deno run \
  --config="${dev_home}/deno.jsonc" \
  --allow-all \
  "${dev_home}/lib/cli.ts" \
  "$@"
```

---

### 6. Installation Scripts (1 hour)

#### Update: `bin/install.sh`
**Changes:**
- Remove tsconfig.json creation (no longer needed!)
- Create `deno.jsonc` in forge-home instead
- Copy lockfile if present

**Simplification:** No more tsconfig.json to manage!

#### Update: `bin/uninstall.sh`
**Changes:**
- Remove references to tsconfig.json cleanup

---

## Files That DON'T Need Changes

**Zero changes needed:**
- ✅ `lib/helpers.ts` - Uses standard APIs
- ✅ `lib/xdg.ts` - Node compat
- ✅ `lib/cli.ts` - Node compat (process.*, path, etc.)
- ✅ `lib/core.ts` - Node compat
- ✅ `lib/config-loader.ts` - Uses cosmiconfig (npm package)
- ✅ `lib/module-resolver.ts` - Standard TS
- ✅ `lib/types.ts` - Pure types
- ✅ `lib/logging/*` - Uses pino (npm package)
- ✅ `lib/auto-install.ts` - Node compat

**Why:** Deno has excellent Node.js compatibility for standard APIs.

---

## Testing Strategy

### Phase 1: Local Testing (2 hours)
```bash
# 1. Create deno.jsonc
# 2. Update bin/forge-dev
# 3. Test basic commands
./bin/forge-dev version
./bin/forge-dev hello world

# 4. Test module loading
./bin/forge-dev hello world  # Uses example module

# 5. Test auto-install
# (If it triggers install, verify it works)
```

### Phase 2: Test Suite (1 day)
**Options:**

**Option A:** Port tests to Deno test runner
```bash
deno test
```

**Option B:** Keep Bun for tests (faster iteration)
```bash
bun test  # Tests the code, not the runtime
```

**Recommendation:** Option B for now. The tests verify business logic, not runtime specifics.

### Phase 3: Integration Testing (2 hours)
- Install via `bin/install.sh`
- Test installed version
- Verify examples work
- Test on clean system

---

## Git Dependency Handling Strategy

**Current (Bun):**
```bash
bun add git+ssh://github.com/user/repo.git
bun add file:../local/path
bun add npm-package@version
```
→ Bun handles all three via `bun add`

**New (Deno):**

### npm packages
**No action needed** - handled by deno.jsonc imports:
```jsonc
{
  "imports": {
    "cowsay": "npm:cowsay@^1.6.0"
  }
}
```

### file: URLs
**Implement file copy** in `lib/forge-home.ts`:
```typescript
if (dep.startsWith('file:')) {
  const srcPath = dep.replace('file:', '');
  // Copy to forge-home for testing
  await $`cp -r ${srcPath} ${targetPath}`;
}
```

### git URLs
**Implement git clone** in `lib/forge-home.ts`:
```typescript
if (dep.startsWith('git+ssh://') || dep.startsWith('git+https://')) {
  const gitUrl = dep.replace('git+', '');
  await $`git clone ${gitUrl} ${targetPath}`;
}
```

**Benefits:**
- ✅ SSH keys work (no HTTPS token issue!)
- ✅ Full git control (branches, tags, commits)
- ✅ file: URLs for local testing/development
- ✅ npm packages via import maps (simpler!)

**POC Scope:**
- Focus on `file:` URLs for initial testing
- Git clone implementation can come later (Phase 3)

---

## Migration Checklist

### Day 1: Configuration & Setup
- [ ] Create `deno.jsonc` with all dependencies
- [ ] Update `bin/forge` wrapper script
- [ ] Update `bin/forge-dev` wrapper script
- [ ] Test: `./bin/forge-dev version` works

### Day 2: Code Changes
- [ ] Update `lib/command.ts` - add dax import
- [ ] Update `lib/state.ts` - replace Bun.* APIs (2 call sites)
- [ ] Update `lib/forge-home.ts` - replace Bun.spawn
- [ ] Implement file: URL handling (for POC)
- [ ] Test: Commands execute without errors

### Day 2.5: Git Dependency Handling
- [ ] Implement git clone logic in `lib/forge-home.ts`
- [ ] Test with file: URLs first
- [ ] Test with git+ssh:// URLs (if ready)
- [ ] Defer full git implementation if needed

### Day 3: Installation & Polish
- [ ] Update `bin/install.sh` - create deno.jsonc, not tsconfig
- [ ] Update `bin/uninstall.sh` - cleanup
- [ ] Update `package.json` description/engines
- [ ] Test: Fresh install works
- [ ] Test: Examples work

### Day 4: Testing & Documentation
- [ ] Run existing test suite (via Bun or port to Deno)
- [ ] Fix any issues discovered
- [ ] Update README.md - mention Deno runtime
- [ ] Update CHANGELOG.md
- [ ] Update any docs mentioning Bun

---

## Risks & Mitigations

### Risk 1: Hidden Bun APIs
**Risk:** Code uses Bun-specific APIs we didn't find
**Mitigation:** Grep for `Bun.`, `from 'bun'`, test thoroughly
**Likelihood:** Low (we did comprehensive search)

### Risk 2: npm Package Incompatibility
**Risk:** Some npm package doesn't work with Deno
**Mitigation:** Most packages work; test early; swap if needed
**Likelihood:** Very low (packages like commander, chalk well-tested)

### Risk 3: Performance Regression
**Risk:** Deno slower than Bun
**Mitigation:** Benchmark; acceptable for CLI usage
**Likelihood:** Low (startup ~100ms difference, imperceptible)

### Risk 4: User Install Friction
**Risk:** Users must install Deno separately
**Mitigation:** Clear instructions; most devs have it
**Likelihood:** Low (Deno widely available)

### Risk 5: Git Dependency Installation
**Risk:** `Bun.spawn(['bun', 'add', dep])` won't work with Deno
**Mitigation:** Implement custom git clone handling
**Likelihood:** **HIGH - REQUIRES IMPLEMENTATION**

---

## Rollback Plan

If migration fails:
1. Keep Bun wrapper in `bin/forge.bun` (backup)
2. Revert `bin/forge` to Bun version
3. All code still works (changes are minimal)
4. Loss: ~3-4 days effort

---

## Success Criteria

- ✅ Forge executes via Deno
- ✅ All commands work (version, hello, etc.)
- ✅ Module loading works
- ✅ Auto-install works
- ✅ Examples work
- ✅ No `--tsconfig-override` bug errors
- ✅ Import maps control module resolution
- ✅ Test suite passes (Bun or Deno)

---

## Benefits After Migration

1. **Solves tsconfig-override bug** - No more internal errors
2. **Simpler config** - No tsconfig.json, just import maps
3. **Better module control** - Import maps are explicit
4. **Stable runtime** - Deno mature, well-documented
5. **Standard APIs** - Web-standard, future-proof

---

## Timeline Summary

| Phase | Duration | Tasks |
|-------|----------|-------|
| Config & deps | 1 day | deno.jsonc, wrappers, install scripts |
| Code changes | 1 day | lib/command.ts, lib/state.ts |
| Testing | 1 day | Local tests, integration, examples |
| Documentation | 0.5 day | README, CHANGELOG, docs |
| **Total** | **3.5 days** | **Plus buffer** |

**With buffer: 4-5 days total**

---

## Next Steps

1. **Review this plan** - Any concerns or adjustments?
2. **Get approval** - Commit to migration?
3. **Execute Day 1** - Create deno.jsonc, update wrappers
4. **Test incrementally** - Don't wait until end

---

## Notes

- **Keep Bun for build tooling** - This is ONLY changing the runtime
- **package.json stays** - Used by Bun for development
- **Tests can stay in Bun** - They test logic, not runtime
- **POC proves it works** - No surprises expected

This is a **low-risk, high-value migration** that solves our blocking bug.
