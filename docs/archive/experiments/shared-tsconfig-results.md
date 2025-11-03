# Shared tsconfig.json Test Results

**Date:** 2025-11-01
**Question:** Can we use a shared `~/.local/share/forge/tsconfig.json` with Bun's override mechanism?

---

## TL;DR

✅ **YES!** Using `bun run --tsconfig-override="$FORGE_HOME/tsconfig.json"` works!

But it has a harmless warning and requires passing a flag. **NODE_PATH remains simpler.**

---

## Discovery: `--tsconfig-override` Flag

Found in `bun run --help`:
```
--tsconfig-override=<val>  Specify custom tsconfig.json. Default <d>$cwd<r>/tsconfig.json
```

This allows using a **shared tsconfig.json** in forge home instead of per-project files!

---

## Test Results

### Setup

**Shared tsconfig.json location:** `~/.local/share/forge/tsconfig.json`

**Content:**
```json
{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "*": [
        "/Users/jason/.local/share/forge/node_modules/*",
        "./node_modules/*",
        "*"
      ]
    },
    "module": "ESNext",
    "target": "ESNext",
    "moduleResolution": "bundler",
    "esModuleInterop": true,
    "skipLibCheck": true
  }
}
```

### Command

```bash
bun run --tsconfig-override="$FORGE_HOME/tsconfig.json" .forge2/moo2.ts
```

### Result

✅ **SUCCESS** - Module imports work!

⚠️ **Warning shown:**
```
Internal error: directory mismatch for directory "/Users/jason/.local/share/forge/tsconfig.json", fd 3.
You don't need to do anything, but this indicates a bug.
```

The warning is harmless - imports work correctly. This appears to be a Bun internal issue when tsconfig is outside the project directory.

---

## Comparison: Both Solutions Work

### Solution 1: NODE_PATH ⭐ (Recommended)

**Implementation:**
```bash
export NODE_PATH="$FORGE_HOME/node_modules"
bun run .forge2/moo2.ts
```

**Pros:**
- ✅ Simplest - just one environment variable
- ✅ No CLI flags needed
- ✅ No warnings
- ✅ Industry standard (Node.js, Bun, etc.)
- ✅ Clean output

**Cons:**
- ⚠️ Environment-based (less visible than config file)

### Solution 2: Shared tsconfig.json + --tsconfig-override

**Implementation:**
```bash
# One-time: Create shared tsconfig in forge home
cat > ~/.local/share/forge/tsconfig.json << EOF
{ ... }
EOF

# Every run: Pass flag
bun run --tsconfig-override="$FORGE_HOME/tsconfig.json" .forge2/moo2.ts
```

**Pros:**
- ✅ Explicit configuration file
- ✅ One shared file (not per-project)
- ✅ Better IDE support (potentially)
- ✅ Visible configuration

**Cons:**
- ⚠️ Requires passing `--tsconfig-override` on every `bun run`
- ⚠️ Shows harmless but noisy Bun warning
- ⚠️ More complex wrapper implementation
- ⚠️ CLI flag needed for every execution

---

## Implementation Comparison

### NODE_PATH in Wrapper

```bash
#!/usr/bin/env bash
# bin/forge-bootstrap

export FORGE_HOME="${XDG_DATA_HOME:-$HOME/.local/share}/forge"
export NODE_PATH="$FORGE_HOME/node_modules"

exec bun run "$FORGE_BIN_DIR/cli.ts" "$@"
```

**Lines of code:** 3
**Complexity:** Low
**Maintenance:** None

### --tsconfig-override in Wrapper

```bash
#!/usr/bin/env bash
# bin/forge-bootstrap

export FORGE_HOME="${XDG_DATA_HOME:-$HOME/.local/share}/forge"
TSCONFIG="$FORGE_HOME/tsconfig.json"

# Ensure tsconfig exists
if [[ ! -f "$TSCONFIG" ]]; then
  # Create it or error
fi

exec bun run --tsconfig-override="$TSCONFIG" "$FORGE_BIN_DIR/cli.ts" "$@"
```

**Lines of code:** 8+
**Complexity:** Medium
**Maintenance:** Must ensure tsconfig exists, handle CLI flag

---

## Updated Recommendation

### Primary: NODE_PATH

Use NODE_PATH because:
1. **Simplest** - One line, no files, no flags
2. **Clean** - No warnings, clean output
3. **Standard** - Industry-standard approach
4. **Reliable** - Works everywhere

### Alternative: --tsconfig-override

Consider if you specifically need:
- Explicit config file for documentation
- IDE integration that relies on tsconfig.json
- Visible configuration over environment variables

**Trade-off:** Accept the Bun warning and extra complexity.

### Not Recommended: Per-project tsconfig.json

We specifically wanted to avoid adding files to `.forge2/` directory.

### Last Resort: Symlinks

Only if both above solutions fail (which they don't).

---

## Decision Matrix

| Criteria | NODE_PATH | Shared tsconfig | Per-project tsconfig | Symlink |
|----------|-----------|-----------------|----------------------|---------|
| **Simplicity** | ⭐⭐⭐ | ⭐⭐ | ⭐ | ⭐⭐ |
| **No per-project files** | ⭐⭐⭐ | ⭐⭐⭐ | ❌ | ❌ |
| **No warnings** | ⭐⭐⭐ | ⭐ | ⭐⭐⭐ | ⭐⭐⭐ |
| **Visibility** | ⭐ | ⭐⭐⭐ | ⭐⭐⭐ | ⭐ |
| **Maintenance** | ⭐⭐⭐ | ⭐⭐ | ⭐ | ⭐ |
| **IDE support** | ⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐ |

---

## Final Answer to Your Question

> Can we use a shared tsconfig.json and tell bun to use that location?

**Yes!** Using `bun run --tsconfig-override="$FORGE_HOME/tsconfig.json"` works.

**Should we?** Probably not - NODE_PATH is simpler and cleaner.

**When would we?** If explicit configuration and IDE support outweigh the complexity and warnings.

---

## Test Scripts

All test scripts available:
- `tmp/test-shared-tsconfig.sh` - Comprehensive shared tsconfig tests
- `tmp/test-tsconfig-override-simple.sh` - Focused test of working solution
- `tmp/test-final-comparison.sh` - Side-by-side comparison
- `tmp/test-experiments.sh` - Original comprehensive test suite

**Shared tsconfig created at:** `~/.local/share/forge/tsconfig.json`
(Left in place for inspection - can be deleted)

---

## Recommendation

**Go with NODE_PATH** for simplicity and clean output.

Keep the shared tsconfig approach documented as an alternative for users who need it.

The fact that both work gives us flexibility!
