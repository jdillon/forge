# Module Resolution Experiment Results

**Date:** 2025-11-01
**Objective:** Find a way to import packages from `~/.local/share/forge/node_modules` without using symlinks

---

## 🎯 Executive Summary

**Two solutions work without symlinks:**

1. ✅ **NODE_PATH environment variable** - Simple, battle-tested
2. ✅ **tsconfig.json with paths** - More explicit, TypeScript-friendly

**Recommended approach:** NODE_PATH (simpler, no extra config files)

---

## Experimental Results

### ✅ Test 1: NODE_PATH Environment Variable

**Command:**
```bash
NODE_PATH="$FORGE_HOME/node_modules" bun run .forge2/moo2.ts
```

**Result:** ✅ **SUCCESS**

**Why it works:**
- Bun supports NODE_PATH per official docs (bun-module-resolution.md:110)
- Adds additional module resolution paths
- Standard Node.js/Bun feature, widely supported
- No configuration files needed

**Implementation:**
- Set in wrapper script before executing `bun run`
- Can include multiple paths (colon-separated on Unix)

---

### ✅ Test 2: Multiple NODE_PATH Entries

**Command:**
```bash
NODE_PATH="./node_modules:$FORGE_HOME/node_modules" bun run .forge2/moo2.ts
```

**Result:** ✅ **SUCCESS**

**Why it works:**
- NODE_PATH supports multiple directories
- Priority: first path searched first
- Allows project-local node_modules to override forge home

---

### ❌ Test 3: BUN_INSTALL_GLOBAL_DIR

**Command:**
```bash
BUN_INSTALL_GLOBAL_DIR="$FORGE_HOME" bun run .forge2/moo2.ts
```

**Result:** ❌ **FAILED**

**Why it doesn't work:**
- Only affects `bun install -g` behavior
- Not used for module resolution at runtime
- Confirmed by experiment

---

### ✅ Test 4: tsconfig.json with paths

**Setup:**
```json
{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "*": [
        "/Users/jason/.local/share/forge/node_modules/*",
        "../node_modules/*",
        "*"
      ]
    }
  }
}
```

**Result:** ✅ **SUCCESS**

**Why it works:**
- Bun natively supports TypeScript path mapping (unlike Node.js)
- Provides explicit path resolution
- More visible configuration

**Trade-offs:**
- Requires creating tsconfig.json in .forge2/
- Absolute paths needed (can't use $HOME)
- Must be maintained per project

---

### ❌ Test 5: Local bunfig.toml

**Setup:**
```toml
[install]
globalDir = "/Users/jason/.local/share/forge"
```

**Result:** ❌ **FAILED**

**Why it doesn't work:**
- globalDir only affects install location, not resolution
- Similar issue to BUN_INSTALL_GLOBAL_DIR

---

### ℹ️ Test 6: Bun.resolveSync Diagnostic

**Key findings:**

Without NODE_PATH:
```
✗ Failed to resolve cowsay from project
✓ Resolved from forge home directly
```

With NODE_PATH:
```
✓ Resolved cowsay from project (via NODE_PATH)
✓ Resolved from forge home directly
```

**Conclusion:** NODE_PATH successfully extends Bun's module resolution.

---

### ✅ Test 7: Symlink (Baseline)

**Command:**
```bash
ln -sf "$FORGE_HOME/node_modules" .forge2/node_modules
bun run .forge2/moo2.ts
```

**Result:** ✅ **SUCCESS** (as expected)

**Trade-offs:**
- Creates .forge2/node_modules symlink
- Needs gitignore entry
- More filesystem operations
- Standard approach, but not needed given alternatives

---

## Recommendation: Use NODE_PATH

### Proposed Implementation

**In `bin/forge-bootstrap` wrapper:**

```bash
#!/usr/bin/env bash
# ... existing setup ...

export FORGE_HOME="${XDG_DATA_HOME:-$HOME/.local/share}/forge"
export NODE_PATH="$FORGE_HOME/node_modules"

# If project has local node_modules, prepend it
if [[ -d ".forge2/node_modules" ]]; then
  export NODE_PATH=".forge2/node_modules:$NODE_PATH"
fi

exec bun run "$@"
```

### Advantages

1. **Simple** - One environment variable, no config files
2. **Standard** - NODE_PATH is a well-established pattern
3. **Clean** - No symlinks, no gitignore entries
4. **Flexible** - Easy to add multiple paths if needed
5. **Portable** - Works on all platforms
6. **Battle-tested** - Used by Node.js ecosystem for decades

### Disadvantages

1. **Environment variable** - Must be set before execution
2. **Less explicit** - Not visible in project files (but documented)

---

## Alternative: tsconfig.json Approach

If we prefer explicit configuration over environment variables:

### Implementation

**Auto-generate `.forge2/tsconfig.json`:**

```json
{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "*": [
        "~/.local/share/forge/node_modules/*",
        "./node_modules/*",
        "*"
      ]
    },
    "module": "ESNext",
    "target": "ESNext",
    "moduleResolution": "bundler"
  }
}
```

**Note:** Need to expand `~` to actual home directory (Bun requires absolute paths).

### Advantages

1. **Explicit** - Configuration visible in project
2. **TypeScript-native** - Familiar pattern
3. **No env vars** - Doesn't rely on environment

### Disadvantages

1. **More complex** - Requires generating/maintaining config file
2. **Absolute paths** - Must use full path to forge home
3. **Per-project** - Needs to be created for each project
4. **Duplication** - Same config in every .forge2/

---

## Decision Matrix

| Criteria | NODE_PATH | tsconfig.json | Symlink |
|----------|-----------|---------------|---------|
| **Simplicity** | ✅ Best | ⚠️ Medium | ⚠️ Medium |
| **Explicitness** | ⚠️ Hidden | ✅ Visible | ⚠️ Hidden |
| **Maintenance** | ✅ None | ⚠️ Per-project | ⚠️ Per-project |
| **Portability** | ✅ All platforms | ✅ All platforms | ⚠️ Symlink support |
| **Cleanup** | ✅ None needed | ⚠️ File to remove | ⚠️ Symlink to remove |
| **Standards** | ✅ Industry standard | ✅ TypeScript standard | ⚠️ Workaround |

---

## Final Recommendation

**Use NODE_PATH for now** because:

1. It's the simplest working solution
2. No extra files to manage
3. Standard pattern across Node.js/Bun ecosystem
4. Easy to implement in wrapper script
5. Can always switch to tsconfig.json later if needed

**Implementation:**
- Set `NODE_PATH=$FORGE_HOME/node_modules` in `bin/forge-bootstrap`
- Document in architecture docs
- Add debug logging to show NODE_PATH value

**Fallback strategy:**
- If NODE_PATH causes issues, we have tsconfig.json as backup
- Symlink remains as last resort
