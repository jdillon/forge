# Bun Module Resolution Problem & Solutions

**Status:** Research Complete - Awaiting Decision
**Date:** 2025-11-02
**Context:** Test environment fails due to package self-reference resolution

---

## Problem Summary

When running tests with the installed forge package, test fixtures inside the project directory resolve `@planet57/forge` imports to **local project source** instead of the **installed package in NODE_PATH**, causing two separate logger module instances to be loaded.

### Root Cause

Bun's **package self-reference feature** allows files inside a package to import from that package using its published name (via the `exports` field in package.json). This resolution happens **before** NODE_PATH is consulted.

**Resolution order:**
1. Package self-reference check (if inside package directory)
2. node_modules lookup
3. NODE_PATH (fallback only)

**Result:** Test fixtures at `tests/fixtures/test-project/.forge2/test-commands.ts` are physically inside `/Users/jason/ws/jdillon/forge/`, so when they import `@planet57/forge/*`, Bun finds the local package.json and resolves to project source instead of using NODE_PATH to find the installed package.

---

## Evidence

**Diagnostic output shows two logger instances:**

```
[DIAGNOSTIC] Logger module loaded - instanceId: ujxkt
[DIAGNOSTIC] Loaded from: .../build/test-forge-installation/.local/share/forge/node_modules/@planet57/forge/lib/logging/logger.ts

[DIAGNOSTIC] Logger module loaded - instanceId: z7b4is
[DIAGNOSTIC] Loaded from: .../lib/logging/logger.ts  ← PROJECT SOURCE!
```

**Why forge-dev works but test-env fails:**

- **forge-dev**: Both CLI and user modules resolve to project source (same singleton) ✓
- **test-env**: CLI uses installed package, user modules use project source (different singletons) ✗

---

## Research Findings

### 1. Bun Runtime Plugins ⭐ (Most Promising)

**Capability:** Intercept module resolution with `onResolve()` callback before standard resolution

**Implementation:**
```typescript
// tests/lib/resolution-plugin.ts
import { plugin } from "bun";

plugin({
  name: "Force NODE_PATH resolution for forge",
  setup(build) {
    build.onResolve({ filter: /@planet57\/forge/ }, (args) => {
      const nodePath = process.env.NODE_PATH;
      if (!nodePath) return;

      // Rewrite to force NODE_PATH lookup
      const subpath = args.path.slice('@planet57/forge'.length);
      return {
        path: `${nodePath}/@planet57/forge${subpath}`,
        external: false
      };
    });
  },
});
```

**Activation:**
```toml
# bunfig.toml
[test]
preload = ["./tests/lib/resolution-plugin.ts"]
```

**Known Issues (2024):**
- Runtime `onResolve` has issues with async imports (#9862)
- `onLoad` callbacks may not trigger in some scenarios (#9446)
- Workers don't load preload config correctly (#12608)

---

### 2. NODE_PATH Environment Variable

**Status:** Supported in Bun v1.2.2+ (February 2025)

**Why it doesn't solve our problem:**
- Package self-reference takes **precedence** over NODE_PATH
- NODE_PATH is only a **fallback** after standard resolution fails
- Test fixtures inside project directory will always self-reference first

**Verdict:** ❌ Not viable alone

---

### 3. Package.json Exports Manipulation

**Current approach:** Changed from specific aliases to wildcard
```json
{
  "exports": {
    "*": "./lib/*"  // Simplified from "./logger": "./lib/logging/index.ts"
  }
}
```

**Result:** Reduced double-loading with wildcard-only pattern, but self-reference still occurs

**Why this doesn't work:**
- Self-reference happens **regardless** of export pattern structure
- Removing exports entirely breaks the package's public API
- Can't selectively disable self-reference for tests

**Verdict:** ❌ Not sufficient

---

### 4. tsconfig.json Paths

**Capability:** Bun respects `compilerOptions.paths` at runtime (unlike Node.js)

**Resolution priority** (as of PR #16825, April 2025):
- **exports field takes precedence over tsconfig paths**
- Previous behavior: tsconfig paths took precedence

**Disable via:**
```bash
bun --tsconfig-override=./tsconfig-no-paths.json
```

**Why this doesn't help:**
- Exports already takes precedence
- Would need to modify every test invocation
- Doesn't prevent self-reference

**Verdict:** ❌ Not applicable

---

### 5. bunfig.toml Configuration

**Available options:** None relevant to disabling self-reference or controlling resolution priority

**Missing:**
- No option to disable package.json exports
- No option to disable self-reference
- No option to control resolution priority order

**Verdict:** ❌ No native solution

---

### 6. Future Features (Not Yet Available)

**Bun.resolveSync options parameter** (Issue #1527):
```typescript
Bun.resolveSync(moduleId, parent, {
  conditions: ["import", "require"],
  mainFields: ["module", "main"],
  extensions: [".ts", ".js"]
});
```

**Status:** Proposed, not implemented

**Verdict:** ⏳ Future consideration

---

## Recommended Solutions

### Option A: Runtime Plugin (Recommended) ⭐

**Approach:** Create plugin that intercepts `@planet57/forge` imports and forces NODE_PATH resolution

**Implementation:**
1. Create `tests/lib/resolution-plugin.ts` with plugin code
2. Add to bunfig.toml test preload
3. Plugin rewrites import paths before standard resolution

**Pros:**
- Most direct control over resolution
- No need to move fixtures
- Can be scoped to test environment only
- Preserves package structure and API

**Cons:**
- Requires understanding Bun's plugin API
- May hit known plugin bugs
- Needs thorough testing
- Additional maintenance burden

**Risk Level:** Medium (plugin API bugs possible)

**Effort:** Medium (plugin development + testing)

---

### Option B: Copy Fixtures Outside Project

**Approach:** Copy `tests/fixtures/` to `/tmp` or `build/test-fixtures/` before running tests

**Implementation:**
1. Test setup copies fixtures to temp location outside project
2. Update test paths to point to copied fixtures
3. Clean up after tests complete

**Pros:**
- Guaranteed to work (no self-reference possible)
- Simple to understand
- No reliance on Bun plugin system

**Cons:**
- More complex test setup
- Fixtures no longer in git for easy review
- Copy operation adds overhead to every test run
- Harder to debug (fixtures in temp location)

**Risk Level:** Low (straightforward approach)

**Effort:** Medium (setup + path management)

---

### Option C: Move Fixtures Permanently

**Approach:** Move test fixtures to a location outside the project directory permanently

**Structure:**
```
/Users/jason/ws/jdillon/
  forge/                    # Main project
  forge-test-fixtures/      # Separate directory
    test-project/
      .forge2/
        test-commands.ts
```

**Pros:**
- Clean separation of concerns
- No self-reference issues
- Still in version control (separate repo or submodule)

**Cons:**
- Breaks co-location of tests and code
- More complex project structure
- Harder to keep fixtures in sync with code changes
- May need git submodule or separate repo management

**Risk Level:** Low

**Effort:** High (restructuring + CI/CD updates)

---

### Option D: Accept Dev-Mode Testing Only

**Approach:** Keep fixtures in project, accept they always test against local source

**Changes:**
- Remove test environment setup
- Update all tests to use `bin/forge-dev` directly
- Document that tests only validate dev mode

**Pros:**
- Zero implementation effort
- Simplest approach
- Tests are fast (no installation needed)

**Cons:**
- Can't test installed package behavior
- No validation of packaging/distribution
- Doesn't meet original goal of separate modes
- Missing coverage for real-world usage

**Risk Level:** Low

**Effort:** Minimal (mostly documentation)

---

## Decision Matrix

| Option | Effort | Risk | Testing Coverage | Maintenance | Recommended |
|--------|--------|------|------------------|-------------|-------------|
| **A. Runtime Plugin** | Medium | Medium | Full | Medium | ⭐ **Yes** |
| **B. Copy Fixtures** | Medium | Low | Full | Low | ✓ Fallback |
| **C. Move Fixtures** | High | Low | Full | Medium | Consider |
| **D. Dev-Only Tests** | Minimal | Low | Partial | Low | No |

---

## Recommendation

**Try Option A (Runtime Plugin) first.** If plugin proves too buggy or unreliable, **fall back to Option B (Copy Fixtures)**.

### Rationale

1. **Runtime Plugin provides the cleanest solution** without restructuring the project
2. **Known risks are manageable** - plugin bugs can be worked around or trigger fallback
3. **Preserves co-location** of tests and fixtures in the repo
4. **Option B is a solid fallback** if plugin approach fails

### Implementation Plan (Option A)

1. **Create plugin** (`tests/lib/resolution-plugin.ts`)
2. **Add bunfig.toml test configuration** with preload
3. **Test with one fixture** to validate approach
4. **Monitor for plugin bugs** and document workarounds
5. **If unstable, switch to Option B** (copy fixtures)

---

## Open Questions

1. **Should we support both dev and test modes long-term?** Or accept dev-mode testing is sufficient?
2. **Are there other ways user modules will import forge?** Do we need to handle more patterns?
3. **Plugin reliability concerns:** Should we prototype plugin first before committing?

---

## Next Steps

**Awaiting your decision on:**
- Proceed with Option A (plugin)?
- Skip to Option B (copy)?
- Accept Option D (dev-only)?
- Other approach?

Once decided, I can implement the chosen solution.
