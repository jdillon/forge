# Bun tsconfig.json Paths - FINDINGS

**Date:** 2025-11-03
**Result:** ✅ **Bun tsconfig paths work perfectly for git clone cache approach**

---

## Executive Summary

**Bun natively supports `tsconfig.json` paths**, which provides the same module resolution control as Deno's import maps. This means:

✅ **We can stay with Bun** (no migration needed)
✅ **Use git clone cache** (SSH git support)
✅ **Control module resolution** (via tsconfig paths)

**This is the best of all worlds.**

---

## Test Results

### Test Setup

```
cache/forge/logger.ts          ← Should be used (from git clone)
local-source/logger.ts         ← Should NOT be used (local source)
```

### tsconfig.json Configuration

```json
{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@planet57/forge/*": ["./cache/forge/*"]
    }
  }
}
```

### Results

```
✅ SUCCESS: tsconfig paths redirected import to cache!
✅ Singleton preserved - same instance on re-import
```

**Import statement:**
```typescript
import { log } from '@planet57/forge/logger';
```

**Resolved to:** `cache/forge/logger.ts` (via tsconfig paths)
**NOT resolved to:** `local-source/logger.ts`

---

## How This Works

### 1. Bun's Native Support

From Bun documentation:
> "Bun's runtime respects path mappings defined in compilerOptions.paths in your tsconfig.json. No other runtime does this."

This is a **unique Bun feature** - Node.js doesn't support tsconfig paths at runtime.

### 2. For Forge

**User config** (`.forge2/config.yml`):
```yaml
dependencies:
  - git+ssh://git@github.com/jdillon/forge-standard.git
```

**Forge install process:**
1. Clone repo to `~/.local/share/forge/repos/github.com/jdillon/forge-standard/`
2. Generate `tsconfig.json` with paths:
   ```json
   {
     "compilerOptions": {
       "baseUrl": ".",
       "paths": {
         "@jdillon/forge-standard/*": [
           "~/.local/share/forge/repos/github.com/jdillon/forge-standard/*"
         ]
       }
     }
   }
   ```

**User code:**
```typescript
import { hello } from '@jdillon/forge-standard/commands/hello';
```

**Bun resolves via tsconfig paths to cached git clone!**

---

## Comparison: Deno vs Bun

| Feature | Deno (import maps) | Bun (tsconfig paths) |
|---------|-------------------|----------------------|
| **Configuration** | `deno.json` | `tsconfig.json` |
| **Format** | `"imports": { ... }` | `"paths": { ... }` |
| **Wildcard support** | ✅ Yes | ✅ Yes |
| **Runtime support** | ✅ Native | ✅ Native (unique to Bun) |
| **Standard** | Import Maps spec | TypeScript |
| **Migration needed** | 3-4 days | ❌ None |

**Both work equally well for git clone cache approach!**

---

## Advantages of Staying with Bun

### ✅ No Migration
- Keep existing codebase
- No API changes needed
- No testing overhead
- Continue current development

### ✅ Familiar Configuration
- tsconfig.json already used for TypeScript
- Developers already understand paths
- IDE support excellent
- Standard TypeScript feature

### ✅ Keep All Bun Benefits
- Built-in shell (`$` without import)
- Fast startup time
- Bun.write, Bun.file, etc.
- Fast test runner

### ✅ Git Clone Cache Works
- SSH git support (no tokens!)
- Offline support
- Full git features
- Proven pattern (Cargo, Go)

---

## Implementation Plan

### Phase 1: Git Clone to Cache (1-2 days)
Same as Deno design:
- Parse git URLs from dependencies
- Clone to `~/.local/share/forge/repos/`
- Track in cache-state.json

### Phase 2: Generate tsconfig.json (1 day)
Instead of import maps, generate tsconfig paths:

```typescript
async function generateTsconfigPaths(dependencies: GitDependency[]) {
  const paths: Record<string, string[]> = {};

  for (const dep of dependencies) {
    const { packageName, cachePath } = dep;
    // e.g., "@jdillon/forge-standard/*": ["~/.local/.../forge-standard/*"]
    paths[`${packageName}/*`] = [`${cachePath}/*`];
  }

  const tsconfig = {
    compilerOptions: {
      baseUrl: ".",
      paths,
    },
    // Extend project's existing tsconfig if it exists
    extends: "./tsconfig.base.json"
  };

  await Bun.write('.forge2/tsconfig.json', JSON.stringify(tsconfig, null, 2));
}
```

### Phase 3: Cache Management (1 day)
Same as Deno design:
- `forge cache status`
- `forge cache clean`
- `forge cache update`

### Total: 3-4 days (vs 5-6 for Deno migration)

---

## Edge Cases

### Multiple tsconfig.json Files

If user already has `tsconfig.json`:

**Option A: Extend** (recommended)
```json
// .forge2/tsconfig.json (generated)
{
  "extends": "../tsconfig.json",
  "compilerOptions": {
    "paths": {
      "@jdillon/forge-standard/*": ["..."]
    }
  }
}
```

**Option B: Merge**
Read existing tsconfig, merge paths, write back.

### Test Environment

Tests need to use the generated tsconfig:
```bash
# Ensure test environment uses correct tsconfig
cd .forge2 && bun test
```

Or configure bunfig.toml for test environment.

---

## Final Recommendation

**Stay with Bun + Git Clone Cache + tsconfig paths**

**Why:**
- ✅ Solves module resolution (tsconfig paths)
- ✅ Keeps SSH git support (no HTTPS tokens)
- ✅ No migration overhead (stay with Bun)
- ✅ Proven approach (git clone cache like Cargo)
- ✅ 3-4 days implementation vs 5-6 for Deno
- ✅ Keep all existing Bun benefits

**Trade-offs:**
- tsconfig.json is TypeScript-specific (but we're already using TS)
- Requires Bun runtime (but we're already committed to Bun)

**Next steps:**
1. Implement Phase 1: Git clone to cache
2. Generate tsconfig.json with paths from dependencies
3. Test with real forge-standard repo
4. Add cache management commands

---

## Comparison: All Solutions

| Solution | Module Resolution | Git Workflow | Migration | Status |
|----------|------------------|--------------|-----------|---------|
| **Bun plugins** | ❌ Can't intercept | ✅ SSH | None | ❌ Not viable |
| **Deno import maps** | ✅ Native | ✅ Clone cache | 5-6 days | ✅ Viable |
| **Bun tsconfig paths** | ✅ Native | ✅ Clone cache | None | ✅ **BEST** |
| **Fallback options** | ⚠️ Workarounds | ✅ SSH | None | ⚠️ Acceptable |

---

## Conclusion

**Bun's tsconfig.json paths support is the perfect solution.**

We get:
- Module resolution control (like Deno's import maps)
- SSH git support (via git clone cache)
- No migration overhead (stay with Bun)
- Familiar configuration (tsconfig.json)

This combines the best aspects of all approaches we evaluated.
