# Deno Migration - Handoff Document

**Date:** 2025-11-04
**Branch:** `module-system`
**Status:** POC complete, ready for implementation
**Next Session:** Start Day 1 of migration

---

## Quick Context

**Problem:** Bun's `--tsconfig-override` flag has a critical bug (produces "Internal error" on every run). This blocks Phase 3 of module system development.

**Solution:** Migrate from Bun to Deno as runtime engine for Forge CLI. Keep Bun for build/test tooling.

**POC Status:** ✅ Complete and successful - no blockers found

---

## What We Accomplished This Session

### 1. Research & POC (sandbox/experiments/deno-forge-runtime/)
- ✅ Researched Deno's module resolution (import maps)
- ✅ Built working POC - minimal Forge CLI runs via Deno
- ✅ Tested npm packages (commander auto-downloads)
- ✅ Tested import maps (module resolution control works)
- ✅ Verified global cache is safe (versioned, content-addressed)

### 2. Migration Planning
- ✅ Identified all Bun-specific code (2 files need changes)
- ✅ Designed abstraction strategy (runtime.ts, package-manager.ts)
- ✅ Analyzed git dependency handling requirements
- ✅ Created 5-day implementation timeline

### 3. Documentation (all in sandbox/experiments/deno-forge-runtime/)
- **summary.md** - Executive summary of everything
- **migration-plan.md** - Detailed 5-day implementation plan
- **abstraction-strategy.md** - Architecture & design decisions
- **additional-findings.md** - Git dependency handling analysis
- **results.md** - POC test results

---

## Key Decisions Made

### ✅ Use Global Deno Cache
- No `DENO_DIR` env var needed initially
- Cache is versioned and safe to share
- Can add isolation later if needed

### ✅ Use deno.jsonc (with comments)
- Import maps for all dependencies
- Comments for documentation
- Replaces package.json for runtime deps

### ✅ Keep It Simple
- No interfaces (just classes)
- No logging in runtime wrappers initially
- No unnecessary abstraction
- **YAGNI principle** - implement what we need, not what we might need

### ✅ Three-Phase Logging
1. **Phase 1:** Skip logging in `lib/runtime.ts` (bootstrap issue)
2. **Phase 2:** Add logging at framework level (package-manager, core, etc.)
3. **Phase 3:** Revisit low-level logging later if needed

---

## Implementation Plan (5 Days)

### Day 1: Create Abstractions
**Files to create:**
- `lib/runtime.ts` - Isolate all Deno/dax APIs (NO logging yet - just `// TODO`)
- `lib/package-manager.ts` - Handle npm/file:/git+ dependencies (WITH logging)

**Key points:**
- Keep names consistent (readTextFile wraps Deno.readTextFile)
- Simple re-exports where possible
- Singleton pattern: `export const packageManager = new PackageManager()`
- All functions marked `// TODO: Add logging later`

### Day 2: Update Consumers
**Files to update:**
- `lib/command.ts` - Change `export { $ } from 'bun'` → `export { $ } from './runtime'`
- `lib/state.ts` - Use `runtime.readJsonFile/writeJsonFile`
- `lib/helpers.ts` - Use `runtime.exit`
- `lib/forge-home.ts` - Use `packageManager.installDependency`

**Goal:** All Bun.* and dax imports go through abstractions

### Day 3: Config & Wrappers
**Tasks:**
- Create `deno.jsonc` with all npm dependencies
- Update `bin/forge` wrapper script
- Update `bin/forge-dev` wrapper script
- Test: Can execute basic commands?

### Day 4: Dependencies & Git Handling
**Tasks:**
- Implement `file:` URL support in PackageManager (copy to forge-home)
- Start git clone implementation (or defer to later)
- Test with examples

### Day 5: Testing & Documentation
**Tasks:**
- Run test suite (via Bun or port to Deno)
- Update README.md
- Update CHANGELOG.md
- Final integration testing

---

## Critical Code Changes

### Two New Files

**lib/runtime.ts** (thin wrappers, NO logging)
```typescript
// ONLY file that imports from dax or Deno.*
export { default as $ } from 'dax';
export async function readTextFile(path: string): Promise<string> {
  // TODO: Add logging later (bootstrap issue)
  return Deno.readTextFile(path);
}
export async function writeTextFile(path, content) { ... }
export async function readJsonFile<T>(path) { ... }
export async function writeJsonFile(path, data) { ... }
export function exit(code: number): never { ... }
export const env = { get, set, has, delete };
```

**lib/package-manager.ts** (business logic, WITH logging)
```typescript
import { $, spawn } from './runtime';
import { getGlobalLogger } from './logging';

const log = getGlobalLogger();

export class PackageManager {
  async installDependency(dep: string): Promise<boolean> {
    log.debug({ dep }, 'Installing dependency');

    // npm package - add to deno.jsonc
    if (!dep.startsWith('file:') && !dep.startsWith('git+')) { ... }

    // file: URL - copy to forge-home
    if (dep.startsWith('file:')) { ... }

    // git URL - clone
    if (dep.startsWith('git+')) { ... }
  }
}

export const packageManager = new PackageManager();
```

### Updated Files (4)

**lib/command.ts:**
```diff
- export { $ } from 'bun';
+ export { $ } from './runtime';
```

**lib/state.ts:**
```diff
- const file = Bun.file(filepath);
- const data = await file.json();
+ import { readJsonFile, writeJsonFile } from './runtime';
+ const data = await readJsonFile(filepath);
```

**lib/helpers.ts:**
```diff
- process.exit(code);
+ import { exit } from './runtime';
+ exit(code);
```

**lib/forge-home.ts:**
```diff
- const proc = Bun.spawn(['bun', 'add', dep], ...);
+ import { packageManager } from './package-manager';
+ await packageManager.installDependency(dep);
```

---

## Important Notes

### ✅ Keep Simple
- Don't add interfaces yet (YAGNI)
- Don't add logging to runtime wrappers yet (bootstrap issue)
- Don't over-engineer

### ✅ Logging Strategy
**DO add logging:**
- `lib/package-manager.ts` - "Installing dependency", "Dependency installed"
- `lib/core.ts` - "Loading module"
- `lib/config-loader.ts` - "Loading config"

**DON'T add logging:**
- `lib/runtime.ts` functions - Mark with `// TODO: Add logging later`
- Reason: Bootstrap chicken-and-egg problem

### ⚠️ If Logging Needed in Runtime Wrappers (Later)
**NEVER silently drop logs!** Use console fallback:
```typescript
function getLogger() {
  try {
    return getGlobalLogger();
  } catch {
    return {
      debug: (...args) => console.log('[DEBUG]', ...args),
      // ... etc - NEVER return no-op functions
    };
  }
}
```

### ✅ Git Dependency Handling
**For POC/Initial:**
- Focus on `file:` URLs first (easiest)
- Git clone can be implemented or deferred

**Implementation sketch:**
```typescript
// file: URL
if (dep.startsWith('file:')) {
  await $`cp -r ${srcPath} ${targetPath}`;
}

// git URL
if (dep.startsWith('git+')) {
  const [url, ref] = gitUrl.split('#');
  await $`git clone ${url} ${targetPath}`;
  if (ref) await $`git checkout ${ref}`.cwd(targetPath);
}
```

---

## Import Rules (Enforce These)

### ✅ ALLOWED
```typescript
// In lib/runtime.ts ONLY
import dax from 'dax';

// In lib/package-manager.ts
import { $, spawn } from './runtime';

// In lib/command.ts
import { $ } from './runtime';

// In lib/*.ts
import { readJsonFile, exit } from './runtime';

// In commands
import { $, createLogger } from '@forge/command';
```

### ❌ NEVER ALLOWED
```typescript
import dax from 'dax';              // ❌ Only in runtime.ts
import { $ } from 'bun';            // ❌ Anywhere
import { readTextFile } from 'node:fs';  // ❌ Go through runtime.ts
```

### Verification
```bash
# Should find ONLY lib/runtime.ts
grep -r "from 'dax'" lib/
grep -r "from 'bun'" lib/

# Should find NO Deno.* outside runtime.ts
grep -r "Deno\." lib/ | grep -v runtime.ts
```

---

## Testing Strategy

### Phase 1: Local Testing
```bash
# Create abstractions
# Update consumers
./bin/forge-dev version
./bin/forge-dev hello world
```

### Phase 2: Examples
```bash
cd examples/website
../../bin/forge-dev hello world
```

### Phase 3: Test Suite
```bash
# Option A: Keep using Bun for tests (tests business logic)
bun test

# Option B: Port to Deno test runner (later)
deno test
```

---

## Files to Reference

### In POC Directory (sandbox/experiments/deno-forge-runtime/)
- **summary.md** - Start here for overview
- **migration-plan.md** - Detailed implementation steps
- **abstraction-strategy.md** - Architecture decisions
- **additional-findings.md** - Git handling details
- **results.md** - POC test results
- **bin/forge-deno** - Working wrapper script
- **deno.jsonc** - Working config example

### In Main Codebase
- `lib/command.ts` - Current exports (needs $ updated)
- `lib/state.ts` - Uses Bun.file (needs updating)
- `lib/forge-home.ts` - Uses Bun.spawn (needs PackageManager)
- `lib/helpers.ts` - Uses process.exit (needs runtime.exit)

---

## Success Criteria

Before considering migration complete:

### Must Have
- ✅ All commands execute via Deno
- ✅ `./bin/forge-dev version` works
- ✅ `./bin/forge-dev hello world` works
- ✅ No `--tsconfig-override` errors
- ✅ Import maps control module resolution
- ✅ Examples work

### Should Have
- ✅ Test suite passes (Bun or Deno)
- ✅ file: URL dependencies work
- ✅ Framework logging shows important operations

### Nice to Have (Defer if Needed)
- ⏸️ Git clone implementation (can use file: for testing)
- ⏸️ Low-level runtime logging (marked with TODO)
- ⏸️ Full test suite ported to Deno

---

## Quick Start for Next Session

1. **Read summary.md** - Get full context
2. **Review abstraction-strategy.md** - Understand design
3. **Start Day 1:** Create `lib/runtime.ts` and `lib/package-manager.ts`
4. **Keep it simple** - No interfaces, no runtime logging initially
5. **Test incrementally** - After each file, verify it works

---

## Questions & Clarifications

### Q: Why no logging in runtime wrappers?
**A:** Bootstrap chicken-and-egg problem. Logger may not be initialized when these functions are called during startup. Add logging at framework level instead (package-manager, core, etc.).

### Q: Why no interfaces?
**A:** YAGNI (You Aren't Gonna Need It). We don't have multiple implementations. Easy to add interface later if needed. Keep it simple now.

### Q: What about the test suite?
**A:** Tests can keep running via Bun (they test business logic, not runtime). Can port to Deno later if desired.

### Q: What if we hit issues?
**A:** POC proved it works. If you hit something unexpected, check POC code for reference. All edge cases should be documented in these files.

---

## Gotchas & Pitfalls

### ❌ DON'T
- Don't add interfaces for hypothetical future needs
- Don't add logging to runtime wrappers initially
- Don't silently drop logs (use console fallback if needed)
- Don't import dax/Deno directly outside runtime.ts
- Don't get stuck on logging infrastructure again

### ✅ DO
- Keep names consistent (readTextFile wraps readTextFile)
- Add `// TODO: Add logging later` comments
- Test after each major change
- Use structured logging: `log.debug({ key: value }, 'message')`
- Keep messages terse

---

## Timeline Expectations

- **Day 1-2:** Abstractions and updates (core work)
- **Day 3:** Config and wrappers (integration)
- **Day 4:** Dependencies (may defer git clone)
- **Day 5:** Testing and docs (polish)

**Total: 5 days with some flexibility**

If you need to cut scope:
- Defer git clone implementation (use file: URLs for testing)
- Defer low-level runtime logging (framework logging is enough)
- Keep tests in Bun (don't port to Deno yet)

---

## Commit Message Template

```
Add Deno runtime POC and migration plan

- Working POC in sandbox/experiments/deno-forge-runtime/
- Comprehensive migration plan (5 days)
- Abstraction strategy for runtime isolation
- Analysis of git dependency handling

POC proves Deno is viable replacement for Bun runtime:
- Import maps solve module resolution problem
- npm packages work seamlessly
- No bootstrap issues found
- Solves --tsconfig-override bug

Next: Implement Day 1 (create lib/runtime.ts and lib/package-manager.ts)
```

---

## Final Checklist Before Starting

- [ ] Read summary.md for full context
- [ ] Review abstraction-strategy.md for design decisions
- [ ] Understand logging strategy (framework level, not runtime wrappers)
- [ ] Understand YAGNI principle (no interfaces, keep simple)
- [ ] Ready to create lib/runtime.ts (thin wrappers, no logging)
- [ ] Ready to create lib/package-manager.ts (with logging)

**You've got this! The POC proves it works. Just follow the plan and keep it simple.**

🚀 Ready to implement!
