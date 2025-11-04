# Phase 1 Plugin Findings - COMPLETE

**Date:** 2025-11-03
**Result:** ❌ **STOP - Runtime plugins do NOT work for module interception**
**Recommendation:** Move to fallback Option B or D from bun-resolution-problem.md

## Executive Summary

Bun's plugin system via `preload` **cannot intercept module imports**. Plugins only see the main entry file, making them unsuitable for controlling module resolution. This is a fundamental limitation, not a configuration issue.

## What We Tested

1. **Runtime plugins** - Loaded via `bunfig.toml` preload
2. **Transpiler plugins** - Using `onLoad` + `onResolve` hooks
3. **Multiple filter patterns** - `/.*/`, `/^@/`, `/^path$/`, `/@planet57\/forge/`
4. **Import types tested:**
   - Static imports (`import { x } from 'y'`)
   - Dynamic imports (`await import('y')`)
   - Built-in modules (`'path'`)
   - Local files (`'./helper'`)
   - Scoped packages (`'@planet57/forge'`)

## Detailed Results

### ✅ What Works

1. **Plugin loading** - Preload mechanism works reliably
2. **Main file resolution** - `onResolve` fires for entry point only
3. **Local file loading** - `onLoad` fires for successfully resolved local files
4. **Hook execution** - Both sync and async hooks execute correctly

### ❌ What Doesn't Work

1. **Module import interception** - `onResolve` never fires for imports within files
2. **Package resolution** - Cannot intercept `@scope/package` lookups
3. **Built-in module resolution** - Cannot intercept `'path'`, `'fs'`, etc.
4. **Failed imports** - No hook fires when resolution fails
5. **Redirection** - Returning custom paths from `onResolve` has no effect (hook never fires)

### Key Test Scenarios

#### Test 1: Built-in Module (path)
```typescript
import { resolve } from 'path';
```
**Expected:** `onResolve` fires for 'path'
**Actual:** No hook fired, module resolved normally

#### Test 2: Scoped Package (doesn't exist)
```typescript
await import('@planet57/forge/lib/logging');
```
**Expected:** `onResolve` fires, plugin can redirect
**Actual:** No hook fired, import fails immediately
**Plugin output:** Only main file seen, not the import

#### Test 3: Local File
```typescript
import { greet } from './helper';
```
**Expected:** `onResolve` fires for './helper'
**Actual:** `onLoad` fired for resolved file, but no `onResolve` for the import itself

#### Test 4: Filter Specificity
Tried multiple specific filters for `@planet57/forge`:
```typescript
build.onResolve({ filter: /@planet57\/forge/ }, ...)
```
**Result:** Filter never matched, hook never fired

## Architecture Understanding

### How Bun Plugins Actually Work

Based on testing, plugins via `preload` operate as follows:

1. **Entry Point Phase:**
   - Bun resolves the main entry file (test.ts)
   - `onResolve` fires once for this file
   - Returns resolved path to plugin

2. **Loading Phase:**
   - Bun loads each resolved file
   - `onLoad` fires with file path
   - Plugin can transform content

3. **Import Resolution Phase (THE PROBLEM):**
   - Bun parses imports within each file
   - **Plugins are NOT consulted for these imports**
   - Resolution happens internally
   - By the time plugin sees anything, resolution is complete

### Why This Doesn't Help Us

Our problem requires intercepting imports **before** resolution:
```typescript
// Inside test fixture:
import { log } from '@planet57/forge/lib/logging';
```

We need to rewrite this to:
```typescript
import { log } from '/path/to/node_modules/@planet57/forge/lib/logging';
```

But plugins never see the `@planet57/forge/lib/logging` string - resolution happens before the plugin can intercept.

## Conclusion

**Plugin approach is not viable.** This is not a bug we can work around - it's how Bun's plugin architecture works.

The `preload` plugin API is designed for:
- Transforming file contents (onLoad)
- Resolving virtual/generated files (onResolve for main entry)
- Build-time operations

It is NOT designed for:
- Runtime module resolution interception
- Redirecting npm package lookups
- Controlling Node.js-style resolution

## Recommendation

**STOP pursuing plugin approach.** Move to fallback options:

### Option B: Copy Fixtures Outside Project
From `bun-resolution-problem.md`:
- Copy test fixtures to `tests/fixtures/` (outside project root)
- No package.json in that directory
- No self-reference possible
- Clean separation of test code from source

**Trade-offs:**
- ✅ Simple, reliable
- ✅ No magic, easy to understand
- ❌ Fixtures outside project (feels wrong)
- ❌ Must maintain duplicate structure

### Option D: Dev-Mode Testing Only
From `bun-resolution-problem.md`:
- Run tests in dev mode only
- Use existing dev-home infrastructure
- Accept that installed package testing happens differently

**Trade-offs:**
- ✅ Leverages existing working infrastructure
- ✅ No new complexity
- ❌ Can't test actual installed behavior
- ❌ Dev mode might not catch real issues

### Alternative: Explore Deno
As discussed in stash, Deno's import maps provide explicit control over module resolution. However, this requires:
- Migration from Bun (1-2 weeks)
- HTTPS + tokens instead of SSH keys
- Import dax for shell scripting

## Time Investment

- **Phase 1 (this):** ~2 hours
- **Saved by stopping now:** 8-12 hours (Phases 2-4)
- **Next step:** 2-3 hours to implement Option B or D

## Files Created

- `tmp/experiments/test-plugin/plugin.ts` - Runtime plugin attempt
- `tmp/experiments/test-plugin/transpiler-plugin.ts` - Transpiler plugin attempt
- `tmp/experiments/test-plugin/bunfig.toml` - Plugin configuration
- `tmp/experiments/test-plugin/test.ts` - Various test scenarios
- `tmp/experiments/test-plugin/helper.ts` - Local file for testing
- `tmp/experiments/test-plugin/FINDINGS.md` - This document

## References

- Bun Plugin API: https://bun.sh/docs/bundler/plugins
- Original plan: `tmp/plugin-viability-plan.md`
- Problem analysis: `tmp/bun-resolution-problem.md`
- Deno comparison: `docs/reference/bun-vs-deno-comparison.md`
