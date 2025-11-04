# Bun Plugin Viability Testing Plan

**Date:** 2025-11-03
**Context:** Testing if Bun runtime plugins can solve module resolution problems
**Related:** [bun-resolution-problem.md](bun-resolution-problem.md)

---

## Problems We're Solving

### 1. Test Fixture Self-Reference
**Problem:** Fixtures inside project resolve `@planet57/forge` to local source instead of installed package
**Impact:** Breaks singleton pattern (duplicate logger instances)
**Root Cause:** Bun's self-reference happens before NODE_PATH

### 2. Dev Mode Module Resolution
**Problem:** Need consistent resolution across different execution modes
**Modes:**
- `bin/forge-dev` → local source with dev-home
- `bin/forge` dev mode → local source with project node_modules
- `bin/forge` installed → installed package with forge home
- Test environment → installed package with test installation

### 3. User Module Dependencies
**Problem:** User modules need to resolve shared dependencies from correct location
**Example:** `examples/standard` looking for `@jdillon/forge-standard` in wrong node_modules

---

## Plugin Approach Overview

**Goal:** Use Bun's runtime plugin system to control module resolution **before** standard resolution happens.

**Key Insight:** Plugins run in `onResolve` phase **before** package self-reference, giving us complete control.

**Plugin Responsibilities:**
1. Intercept `@planet57/forge/*` imports
2. Rewrite to absolute paths based on execution mode
3. Intercept package module imports (e.g., `@jdillon/forge-standard/*`)
4. Force resolution to FORGE_NODE_MODULES location

---

## Experimental Plan

### Phase 1: Proof of Concept (2-3 hours)

**Goal:** Validate that plugins can intercept and rewrite module resolution

**Step 1.1: Create minimal plugin**

Create `tmp/experiments/test-plugin/plugin.ts`:
```typescript
import { plugin } from "bun";

console.log('[PLUGIN] Loading resolution plugin');

plugin({
  name: "forge-resolution-test",
  setup(build) {
    // Intercept ALL imports to verify plugin runs
    build.onResolve({ filter: /.*/ }, (args) => {
      console.log(`[PLUGIN] Resolving: ${args.path} from ${args.importer}`);
      // Don't rewrite, just log
      return undefined;
    });
  },
});

console.log('[PLUGIN] Plugin registered');
```

Create `tmp/experiments/test-plugin/bunfig.toml`:
```toml
preload = ["./plugin.ts"]
```

Create `tmp/experiments/test-plugin/test.ts`:
```typescript
import { log } from '@planet57/forge/lib/logging';
log.info('Test running');
```

**Run:**
```bash
cd tmp/experiments/test-plugin
bun run test.ts
```

**Success Criteria:**
- ✅ Plugin loads and logs "Loading resolution plugin"
- ✅ `onResolve` logs show for `@planet57/forge/lib/logging` import
- ✅ Module resolves successfully (even without rewriting)

**Failure Scenarios:**
- ❌ Plugin doesn't load → Check Bun version, preload syntax
- ❌ `onResolve` doesn't fire → Known Bun bug (see issue #9862)
- ❌ Plugin loads but breaks resolution → Filter pattern too broad

**What We Learn:**
- Do plugins load reliably in our Bun version?
- Do `onResolve` callbacks fire for our import patterns?
- What information is available in `args` object?

---

### Phase 2: Targeted Rewriting (2-3 hours)

**Goal:** Rewrite specific imports to absolute paths

**Step 2.1: Rewrite @planet57/forge imports**

Update plugin to rewrite forge imports:
```typescript
plugin({
  name: "forge-resolution-rewriter",
  setup(build) {
    build.onResolve({ filter: /@planet57\/forge/ }, (args) => {
      const nodePath = process.env.FORGE_NODE_MODULES;
      if (!nodePath) {
        console.warn('[PLUGIN] FORGE_NODE_MODULES not set, skipping rewrite');
        return undefined;
      }

      // Extract subpath: @planet57/forge/lib/logging → /lib/logging
      const subpath = args.path.replace('@planet57/forge', '');
      const absolutePath = `${nodePath}/@planet57/forge${subpath}`;

      console.log(`[PLUGIN] Rewrite: ${args.path} → ${absolutePath}`);

      return {
        path: absolutePath,
        external: false,
      };
    });
  },
});
```

**Test Setup:**
```bash
# Set FORGE_NODE_MODULES to installed location
export FORGE_NODE_MODULES=~/.local/share/forge/node_modules

# Run test
cd tmp/experiments/test-plugin
bun run test.ts
```

**Success Criteria:**
- ✅ Plugin rewrites `@planet57/forge/*` to absolute path
- ✅ Module loads from FORGE_NODE_MODULES location
- ✅ No double-loading (check with logger instanceId diagnostic)

**Failure Scenarios:**
- ❌ Absolute path doesn't exist → Check path construction logic
- ❌ Import fails after rewrite → Return value format wrong
- ❌ Still loads from local source → Self-reference happening after plugin
- ❌ Works for direct imports but not transitive → Plugin not applying recursively

**What We Learn:**
- Can we successfully rewrite package imports?
- Does rewriting work for nested imports?
- Do we hit known plugin bugs with this pattern?

---

### Phase 3: Integration with Test Environment (3-4 hours)

**Goal:** Use plugin in actual test environment

**Step 3.1: Create test-specific plugin**

Create `tests/lib/resolution-plugin.ts`:
```typescript
import { plugin } from "bun";
import { getGlobalLogger } from '../../lib/logging';

const log = getGlobalLogger();

plugin({
  name: "forge-test-resolution",
  setup(build) {
    // Only rewrite forge imports
    build.onResolve({ filter: /@planet57\/forge/ }, (args) => {
      const nodeModules = process.env.FORGE_NODE_MODULES;
      if (!nodeModules) {
        log.warn('FORGE_NODE_MODULES not set, plugin inactive');
        return undefined;
      }

      const subpath = args.path.replace('@planet57/forge', '');
      const absolutePath = `${nodeModules}/@planet57/forge${subpath}`;

      log.debug({ from: args.path, to: absolutePath }, 'Plugin rewrote import');

      return {
        path: absolutePath,
        external: false,
      };
    });
  },
});
```

**Step 3.2: Add bunfig.toml test configuration**

Create/update `bunfig.toml`:
```toml
[test]
preload = ["./tests/lib/resolution-plugin.ts"]
```

**Step 3.3: Test with fixture that previously failed**

Pick a test that showed double-loading:
```bash
bun test tests/installation.test.ts
```

**Success Criteria:**
- ✅ Plugin loads before tests run
- ✅ Fixtures resolve to installed package (not local source)
- ✅ No double-loading (single logger instance)
- ✅ All assertions pass

**Failure Scenarios:**
- ❌ Plugin doesn't load → Preload path wrong or syntax error
- ❌ Tests fail with import errors → Rewriting broken
- ❌ Still double-loading → Plugin not applying or timing issue
- ❌ Works for some imports, fails for others → Filter pattern incomplete

**What We Learn:**
- Does plugin work in test environment?
- Are there edge cases we didn't anticipate?
- Performance impact of plugin?

---

### Phase 4: User Module Resolution (3-4 hours)

**Goal:** Extend plugin to handle user module dependencies

**Problem:** User modules (e.g., `examples/standard/.forge2/config.yml` loading `@jdillon/forge-standard`) need to resolve packages from FORGE_NODE_MODULES.

**Step 4.1: Add package module rewriting**

Extend plugin to handle any scoped package:
```typescript
plugin({
  name: "forge-resolution-complete",
  setup(build) {
    // Rewrite @planet57/forge imports
    build.onResolve({ filter: /@planet57\/forge/ }, (args) => {
      // ... existing forge rewrite logic
    });

    // Rewrite other scoped packages to use FORGE_NODE_MODULES
    build.onResolve({ filter: /^@[^/]+\// }, (args) => {
      const nodeModules = process.env.FORGE_NODE_MODULES;
      if (!nodeModules) return undefined;

      // Don't rewrite if it's a relative import or already absolute
      if (args.path.startsWith('.') || args.path.startsWith('/')) {
        return undefined;
      }

      const absolutePath = `${nodeModules}/${args.path}`;

      // Only rewrite if the path exists in FORGE_NODE_MODULES
      // Otherwise let standard resolution handle it
      if (!existsSync(absolutePath)) {
        return undefined;
      }

      log.debug({ from: args.path, to: absolutePath }, 'Plugin rewrote package import');

      return {
        path: absolutePath,
        external: false,
      };
    });
  },
});
```

**Step 4.2: Test with examples/standard**

```bash
cd examples/standard
../../bin/forge hello --help
```

**Success Criteria:**
- ✅ Finds `@jdillon/forge-standard` in forge home
- ✅ Command loads and runs successfully
- ✅ No resolution errors

**Failure Scenarios:**
- ❌ Too broad, breaks other imports → Need better filtering
- ❌ File existence check fails → Path construction wrong
- ❌ Works in dev mode but not installed → Mode detection needed

**What We Learn:**
- Can plugin handle arbitrary package resolution?
- Do we need mode-aware logic?
- Performance impact of existence checks?

---

## Decision Points

### After Phase 1: Is it worth continuing?

**Continue if:**
- ✅ Plugin loads reliably
- ✅ `onResolve` callbacks fire correctly
- ✅ No critical bugs encountered

**Stop if:**
- ❌ Plugin doesn't load at all
- ❌ `onResolve` never fires (known bug)
- ❌ Bun crashes or behaves unpredictably

**Fallback:** Move to Option B (copy fixtures) from bun-resolution-problem.md

---

### After Phase 2: Does rewriting work?

**Continue if:**
- ✅ Rewrites work for direct imports
- ✅ No double-loading observed
- ✅ Path resolution logic is sound

**Stop if:**
- ❌ Rewrites break imports
- ❌ Still getting double-loading
- ❌ Self-reference happens after plugin

**Fallback:** Consider Option C (move fixtures permanently)

---

### After Phase 3: Does it work in tests?

**Continue if:**
- ✅ Test environment works reliably
- ✅ No flaky behavior
- ✅ Performance is acceptable

**Stop if:**
- ❌ Tests become flaky
- ❌ Plugin causes test failures
- ❌ Significant performance degradation

**Fallback:** Accept Option D (dev-mode testing only)

---

### After Phase 4: Should we productionize?

**Productionize if:**
- ✅ All tests pass consistently
- ✅ No known issues or workarounds
- ✅ Performance impact minimal

**Don't productionize if:**
- ❌ Requires workarounds or hacks
- ❌ Any known reliability issues
- ❌ Maintenance burden too high

---

## Known Risks & Mitigation

### Risk 1: Known Plugin Bugs (Issue #9862)

**Issue:** Runtime `onResolve` has issues with async imports

**Mitigation:**
- Test with both sync and async imports in Phase 1
- Document any workarounds needed
- Keep fallback options ready

**Impact:** Medium - may require workarounds or different approach

---

### Risk 2: Plugin Performance

**Issue:** Intercepting every import may slow down execution

**Mitigation:**
- Use specific filters (not `/.*/`)
- Benchmark test suite before/after
- Consider plugin only for specific test scenarios

**Impact:** Low - filters should minimize overhead

---

### Risk 3: Bun Version Compatibility

**Issue:** Plugin API may change between Bun versions

**Mitigation:**
- Document Bun version used (currently 1.3.1)
- Test on multiple Bun versions if possible
- Keep plugin code simple and standard

**Impact:** Medium - may need updates for new Bun versions

---

### Risk 4: Transitive Dependencies

**Issue:** Plugin may not apply to nested imports

**Mitigation:**
- Test with deep import chains in Phase 2
- Verify with logger singleton pattern
- Document limitations if found

**Impact:** High - could be a showstopper

---

### Risk 5: Mode Detection Complexity

**Issue:** Different execution modes may need different rewriting logic

**Mitigation:**
- Use FORGE_NODE_MODULES as single source of truth
- Bootstrap scripts set this consistently
- Plugin doesn't need mode detection

**Impact:** Low - architecture already handles this

---

## Success Criteria (Overall)

### Must Have
- ✅ Plugin loads reliably in test environment
- ✅ Eliminates double-loading of forge modules
- ✅ All existing tests pass
- ✅ User modules resolve dependencies correctly

### Should Have
- ✅ No significant performance impact (< 5% slowdown)
- ✅ Clear error messages if plugin fails
- ✅ Works across different Bun versions (1.x)

### Nice to Have
- ✅ Plugin works in dev mode too (unified approach)
- ✅ Documentation for future maintenance
- ✅ Diagnostic mode for debugging resolution

---

## Deliverables

### If Successful (Plugin Works)

1. **Plugin implementation** (`tests/lib/resolution-plugin.ts`)
2. **Configuration** (`bunfig.toml` with preload)
3. **Tests** demonstrating no double-loading
4. **Documentation** in `docs/testing.md` or similar
5. **Update** to `tmp/bun-resolution-problem.md` with "Solution: Plugin" section

### If Unsuccessful (Plugin Doesn't Work)

1. **Findings document** detailing what worked/didn't work
2. **Update** to `tmp/bun-resolution-problem.md` with plugin results
3. **Recommendation** for fallback option (B or D)
4. **Implementation plan** for chosen fallback

---

## Timeline Estimate

| Phase | Effort | Duration |
|-------|--------|----------|
| Phase 1: POC | 2-3 hours | Half day |
| Phase 2: Rewriting | 2-3 hours | Half day |
| Phase 3: Test Integration | 3-4 hours | Half day |
| Phase 4: User Modules | 3-4 hours | Half day |
| **Total** | **10-14 hours** | **2 days** |

**Note:** Includes time for debugging and iteration. Could be faster if everything works first try.

---

## Open Questions

1. **Plugin scope:** Should plugin apply globally or only in test environment?
   - Test-only: Simpler, less risk
   - Global: Unified approach, fewer execution modes

2. **Diagnostic logging:** How verbose should plugin logging be?
   - Development: Log every rewrite
   - Production: Log only errors
   - Configurable: Via FORGE_DEBUG flag

3. **Filter patterns:** How specific should `onResolve` filters be?
   - Broad (`/@/`): Catches everything, higher overhead
   - Narrow (`/@planet57\/forge/`): Safer, may miss edge cases

4. **Error handling:** What happens if rewritten path doesn't exist?
   - Fallback to standard resolution?
   - Throw error with helpful message?
   - Log warning and continue?

5. **Transitive imports:** If forge imports another package, does plugin apply?
   - Need to test this explicitly
   - May reveal limitations

---

## Next Steps

**Awaiting your decision:**

1. **Proceed with Phase 1?** Start POC experiment to validate basic plugin functionality
2. **Different approach?** If concerns about plugin reliability, discuss alternatives
3. **Modify plan?** Any adjustments to the experimental phases or success criteria

Once you approve, I can start with Phase 1 and report results at each decision point.
