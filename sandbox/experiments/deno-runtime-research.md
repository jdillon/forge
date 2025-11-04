# Deno Runtime Research for Forge

**Date:** 2025-11-04
**Context:** Evaluating Deno as runtime replacement for Bun to solve tsconfig-override bug
**Scope:** Runtime only - keep Bun for build/test tooling

---

## Executive Summary

Deno solves our module resolution control problem through **import maps**, which provide explicit, deterministic control over module resolution without requiring tsconfig paths. Import maps can be configured via:
- `deno.json` config file (primary method)
- `--import-map` CLI flag
- `--config` CLI flag

**Key Finding:** Deno eliminates `node_modules` entirely by default, using a global cache at `$DENO_DIR` (default: OS-specific). This fundamentally changes how we think about module installation.

---

## Core Questions Answered

### Q1: Do we still need package.json?

**No.** Deno uses `deno.json` instead.

**Example:**
```json
{
  "imports": {
    "@std/assert": "jsr:@std/assert@^1.0.0",
    "chalk": "npm:chalk@5",
    "local-module/": "./src/"
  },
  "tasks": {
    "dev": "deno run --allow-all main.ts"
  }
}
```

**Migration impact:**
- Move dependencies from `package.json` to `deno.json` imports
- Tasks/scripts move to `tasks` field
- Can install packages: `deno install jsr:@std/testing npm:express`
- Adds to `deno.json` automatically

### Q2: Is there a node_modules directory?

**No, by default.** Deno uses a global cache.

**Three modes available:**

**Mode A: No node_modules (default)**
```bash
deno run main.ts
```
- Modules cached globally at `$DENO_DIR/npm/` and `$DENO_DIR/deps/`
- No local directory pollution
- Shared across projects

**Mode B: Auto node_modules (opt-in)**
```json
{
  "nodeModulesDir": "auto"
}
```
- Creates local `node_modules/` automatically
- For tools that expect node_modules (bundlers, etc)
- Still managed by Deno

**Mode C: Manual node_modules (opt-in)**
```bash
deno install  # creates node_modules
deno run --node-modules-dir=manual main.ts
```
```json
{
  "nodeModulesDir": "manual"
}
```
- User manages node_modules explicitly
- Similar to npm workflow

**For Forge:** We likely want **Mode A (no node_modules)** since we're not using bundlers and Deno handles everything.

### Q3: Can we be explicit about locations?

**Yes, completely explicit via import maps.**

**Example for Forge:**
```json
{
  "imports": {
    "forge-core/": "file:///Users/jason/.local/share/forge/core/",
    "@planet57/forge-standard": "file:///Users/jason/.local/share/forge/repos/forge-standard/mod.ts",
    "cowsay": "npm:cowsay@^1.6.0"
  }
}
```

**Path resolution:**
- Absolute paths: `file:///absolute/path/`
- Relative paths: `./relative/path/` (relative to deno.json location)
- npm packages: `npm:package@version`
- JSR packages: `jsr:@scope/package@version`
- HTTPS URLs: `https://deno.land/x/oak/mod.ts`

**Key benefit:** Import maps give us EXACT control over where modules resolve from.

### Q4: What controls does Deno provide?

**Three layers of control:**

#### 1. CLI Flags (Runtime)
```bash
# Specify config file
deno run --config=/path/to/deno.json main.ts

# Specify import map directly
deno run --import-map=/path/to/import-map.json main.ts

# Control cache location
DENO_DIR=/custom/cache/dir deno run main.ts

# Reload specific modules
deno run --reload=npm:chalk,jsr:@std/assert main.ts

# Use cached only (offline)
deno run --cached-only main.ts

# Control node_modules
deno run --node-modules-dir=auto main.ts
```

#### 2. Environment Variables
```bash
# Cache location (like forge-home concept)
export DENO_DIR="/Users/jason/.local/share/forge/deno-cache"

# Authentication for private packages
export DENO_AUTH_TOKENS="github.com=ghp_TOKEN123"

# Disable prompts
export DENO_NO_PROMPT=true

# Parallel execution control
export DENO_JOBS=4

# V8 flags
export DENO_V8_FLAGS="--max-old-space-size=4096"
```

#### 3. Configuration File (deno.json)
```json
{
  "imports": {
    "module-alias": "path/to/module"
  },
  "tasks": {
    "dev": "deno run --allow-all main.ts"
  },
  "compilerOptions": {
    "jsx": "react-jsx",
    "jsxImportSource": "react"
  },
  "lock": {
    "path": "./deno.lock",
    "frozen": true
  },
  "nodeModulesDir": "none",  // or "auto" or "manual"
  "vendor": false,  // if true, vendors deps locally
  "unstable": ["temporal"]  // enable unstable features
}
```

---

## Import Maps Deep Dive

### How Import Maps Solve Our Problem

**Current Bun Problem:**
- Need tsconfig paths to control resolution
- Can't use --tsconfig-override (bug)
- Can't control which tsconfig Bun finds

**Deno Solution:**
Import maps are THE module resolution mechanism. No tsconfig needed.

**Example:**
```json
{
  "imports": {
    "@planet57/forge/": "./node_modules/@planet57/forge/",
    "@planet57/forge-local/": "./src/"
  }
}
```

### Import Map Configuration Priority

1. **deno.json `imports` field** (most common)
   ```json
   {
     "imports": {
       "alias": "path"
     }
   }
   ```

2. **Separate import-map.json + deno.json reference**
   ```json
   {
     "importMap": "./import-map.json"
   }
   ```

3. **--import-map CLI flag**
   ```bash
   deno run --import-map=./custom-map.json main.ts
   ```

4. **--config CLI flag (specifies deno.json location)**
   ```bash
   deno run --config=/path/to/deno.json main.ts
   ```

**For Forge:** We'd use either:
- **Option A:** Single `deno.json` at `~/.local/share/forge/deno.json` with imports
- **Option B:** `--config` flag pointing to forge-home's deno.json

### Import Map Capabilities

**1. Bare specifier remapping:**
```json
{
  "imports": {
    "cowsay": "npm:cowsay@1.6.0",
    "@std/assert": "jsr:@std/assert@1.0.0"
  }
}
```
```typescript
import { say } from "cowsay";  // resolves to npm:cowsay@1.6.0
```

**2. Path mappings (like tsconfig paths):**
```json
{
  "imports": {
    "@/": "./src/",
    "utils/": "./lib/utils/"
  }
}
```
```typescript
import { helper } from "@/helpers";  // resolves to ./src/helpers
```

**3. Scoped overrides:**
```json
{
  "imports": {
    "example/": "https://deno.land/x/example/"
  },
  "scopes": {
    "https://deno.land/x/example/": {
      "https://deno.land/x/dep@1.0.0/": "./patched-dep/"
    }
  }
}
```

**4. Directory mappings:**
```json
{
  "imports": {
    "forge-modules/": "file:///Users/jason/.local/share/forge/modules/"
  }
}
```
```typescript
import { something } from "forge-modules/package/mod.ts";
// resolves to file:///Users/jason/.local/share/forge/modules/package/mod.ts
```

---

## Cache Behavior vs node_modules

### Deno Cache Architecture

**Default cache location:**
- macOS: `~/Library/Caches/deno/`
- Linux: `~/.cache/deno/`
- Windows: `%LOCALAPPDATA%\deno\`

**Override with:**
```bash
export DENO_DIR="/custom/location"
```

**Cache structure:**
```
$DENO_DIR/
├── deps/           # Remote HTTPS modules
├── npm/            # npm package cache
│   ├── registry.npmjs.org/
│   └── ...
├── gen/            # Generated JavaScript from TypeScript
├── deno_dir.json   # Metadata
└── ...
```

### Key Differences from node_modules

| Aspect | node_modules | Deno Cache |
|--------|--------------|------------|
| Location | Local per project | Global (or custom via DENO_DIR) |
| Visibility | Directory in project | Hidden system cache |
| Management | npm/yarn/pnpm/bun | Deno automatic |
| Sharing | None (duplicated) | Shared across projects |
| Control | package.json + lock | deno.json imports + deno.lock |

### For Forge: Leverage DENO_DIR

**Strategy:**
```bash
# In bin/forge wrapper
export DENO_DIR="${XDG_DATA_HOME:-$HOME/.local/share}/forge/deno-cache"
deno run --config="${DENO_DIR}/../deno.json" "$@"
```

**Benefits:**
- All Forge deps in one place (`~/.local/share/forge/`)
- No project pollution
- Easy to clean: `rm -rf ~/.local/share/forge/deno-cache`
- Explicit control via DENO_DIR

---

## Configuration Control Strategies

### Strategy A: Config File Only (Recommended)

**Structure:**
```
~/.local/share/forge/
├── deno.json          # Import maps, config
├── deno.lock          # Lockfile
└── lib/
    └── cli.ts
```

**bin/forge wrapper:**
```bash
#!/usr/bin/env bash
forge_home="${XDG_DATA_HOME:-$HOME/.local/share}/forge"

# No env vars needed - use global Deno cache (versioned, safe)
exec deno run \
  --config="${forge_home}/deno.json" \
  --allow-all \
  "${forge_home}/lib/cli.ts" \
  "$@"
```

**deno.json:**
```json
{
  "imports": {
    "forge-core/": "./lib/",
    "@planet57/forge-standard": "npm:@planet57/forge-standard@1.0.0",
    "cowsay": "npm:cowsay@1.6.0"
  },
  "lock": "./deno.lock",
  "nodeModulesDir": "none"
}
```

**Benefits:**
- ✅ Single source of truth (deno.json)
- ✅ No --tsconfig-override needed
- ✅ No env vars needed
- ✅ Uses standard Deno cache (versioned, content-addressed)
- ✅ Deduplication with user's other Deno projects
- ✅ Works for both dev and installed modes

**Note:** Global cache is safe - multiple versions coexist peacefully (unlike node_modules).
Can add `DENO_DIR` isolation later if needed (only config not in deno.json).

### Strategy B: CLI Flags Only

**bin/forge wrapper:**
```bash
#!/usr/bin/env bash
exec deno run \
  --import-map="${forge_home}/import-map.json" \
  --allow-all \
  "${forge_home}/cli.ts" \
  "$@"
```

**Benefits:**
- ✅ No config file required
- ✅ Explicit CLI control

**Drawbacks:**
- ❌ Can't specify other deno.json options (tasks, compilerOptions)
- ❌ More flags to manage

### Strategy C: User CWD + Config Path

**Allow user to have their own deno.json, but override with --config:**
```bash
#!/usr/bin/env bash
# User stays in their project dir (CWD)
# But Forge uses its own config
exec deno run \
  --config="${forge_home}/deno.json" \
  --allow-all \
  "${forge_home}/cli.ts" \
  "$@"
```

**Benefits:**
- ✅ User CWD preserved
- ✅ Forge config isolated
- ✅ No conflict with user's deno.json

**This solves the exact problem we had with Bun!**

---

## Comparison: Deno vs Bun for Forge Runtime

| Aspect | Bun (Current) | Deno (Proposed) |
|--------|---------------|-----------------|
| **Module Resolution Control** | tsconfig paths + --tsconfig-override (BROKEN) | Import maps + --config (WORKS) |
| **Config Priority** | Natural tsconfig discovery (can't override) | Explicit --config flag (full control) |
| **Dependency Cache** | node_modules (local or global) | DENO_DIR (global or custom) |
| **Cache Location Control** | Limited (BUN_INSTALL) | Full (DENO_DIR env var) |
| **Package Management** | package.json + bun.lock | deno.json + deno.lock |
| **npm Packages** | Native support | npm: specifier |
| **TypeScript** | Native, fast | Native, standard |
| **Shell Scripting** | Built-in `$` | Import dax (one line) |
| **Permissions** | Open by default | Explicit --allow-* flags |
| **Stability** | Fast-moving, bugs | Mature, stable |

---

## Migration Impact Assessment

### What Changes

**1. Dependency Declaration**
```javascript
// Before (package.json)
{
  "dependencies": {
    "cowsay": "^1.6.0",
    "yaml": "^2.3.0"
  }
}

// After (deno.json)
{
  "imports": {
    "cowsay": "npm:cowsay@^1.6.0",
    "yaml": "jsr:@std/yaml@^1.0.0"  // or npm:yaml
  }
}
```

**2. Import Statements**
```typescript
// Before
import { say } from 'cowsay';

// After (if using bare specifier in imports)
import { say } from 'cowsay';  // SAME!

// Or direct specifier
import { say } from 'npm:cowsay@1.6.0';
```

**3. Wrapper Scripts**
```bash
# Before (bin/forge)
#!/usr/bin/env bun
bun --tsconfig-override="${forge_home}/tsconfig.json" run "${forge_home}/cli.ts" "$@"

# After (bin/forge)
#!/usr/bin/env bash
export DENO_DIR="${forge_home}/deno-cache"
deno run --config="${forge_home}/deno.json" --allow-all "${forge_home}/cli.ts" "$@"
```

### What Stays the Same

- ✅ TypeScript source code (mostly)
- ✅ Import paths (via import maps)
- ✅ Test structure (Deno has built-in test runner)
- ✅ Build tooling (keep Bun for development)
- ✅ Git workflow (no HTTPS token issue with cache approach)

---

## Recommended Approach for Forge

### Cache Strategy Decision

**Use global Deno cache (default behavior)** - no DENO_DIR override needed.

**Rationale:**
- Deno's cache is versioned and content-addressed (like Cargo, Go modules)
- Multiple versions coexist safely - no conflicts
- Deduplication saves disk space
- Follows Deno conventions
- Simpler wrapper script (no env vars)

**Future isolation option (if needed):**
If we later need complete isolation, add one env var:
```bash
export DENO_DIR="${forge_home}/cache"
```
This is the ONLY config that cannot be in deno.json - everything else uses config file.

### Phase 1: POC (1-2 days)

**Goal:** Prove Deno works as Forge runtime

**Tasks:**
1. Create `sandbox/experiments/deno-forge-runtime/`
2. Copy minimal Forge code (cli.ts, one command)
3. Create deno.json with import maps
4. Write bin/forge-deno wrapper (no env vars!)
5. Test: Can we control module resolution?

**Success criteria:**
- ✅ Forge command executes
- ✅ Import maps work for module aliases
- ✅ Can specify forge-home location via --config only
- ✅ Global cache works without conflicts

### Phase 2: Full Migration (3-4 days)

**If POC succeeds:**

1. **Update package management** (1 day)
   - Create forge-home deno.json
   - Migrate dependencies from package.json
   - Test npm package loading

2. **Update bin/forge wrapper** (1 day)
   - Set DENO_DIR
   - Add --config flag
   - Add necessary --allow-* permissions
   - Test dev mode vs installed mode

3. **Update lib/ code** (1-2 days)
   - Add dax import where `$` is used
   - Minimal API changes (Bun APIs → Deno APIs)
   - Update imports if needed

4. **Testing** (1 day)
   - Run existing tests with Deno test runner
   - Verify module resolution
   - Verify git dependencies work

### Phase 3: Documentation (1 day)

- Document deno.json structure
- Update install instructions
- Note any breaking changes

**Total: 5-7 days**

---

## Decision Matrix

### Choose Deno Runtime if:

✅ **Module resolution control is critical** (YES for us - it is)
✅ **Stable, mature runtime preferred**
✅ **Explicit configuration valued**
✅ **1 week migration acceptable**

### Stay with Bun if:

✅ **Bun fixes --tsconfig-override bug** (unknown timeline)
✅ **Migration effort too high**
✅ **Bun-specific features critical** (none identified)

---

## Open Questions

1. **Performance:** Is Deno startup time acceptable for CLI?
   - Previous research: ~100-150ms vs Bun's ~30ms
   - For CLI usage: Likely acceptable

2. **Permission flags:** What specific --allow-* flags does Forge need?
   - --allow-read (always)
   - --allow-write (always)
   - --allow-net (for git, downloads)
   - --allow-env (for environment vars)
   - --allow-run (for shell commands)
   - Or just: --allow-all

3. **Deno vs Bun for build tooling:**
   - Keep Bun for tests? (faster)
   - Or migrate tests to Deno too?

4. **Install process:** Does user install Deno separately or bundle it?
   - Recommend: User installs Deno (like they install Bun)
   - Alternative: Bundle Deno binary (complex)

---

## Next Steps

1. **Discuss trade-offs with Jason**
   - Is 1 week migration acceptable?
   - Performance concerns?
   - User install requirements?

2. **Run POC** (Phase 1 above)
   - Quick 1-2 day prototype
   - Validate approach works

3. **Make go/no-go decision**
   - Based on POC results
   - Based on timeline constraints

4. **If go:** Execute Phase 2 migration

---

## References

- Previous Deno research: `sandbox/experiments/deno-prototype/`
- Bun bug documentation: `tmp/bun-tsconfig-override-failure.md`
- Import maps spec: https://github.com/WICG/import-maps
- Deno docs: https://docs.deno.com/

---

## Conclusion

**Deno provides EXACTLY what we need:**
- ✅ Module resolution control via import maps
- ✅ Config file location control via --config flag
- ✅ Cache location control via DENO_DIR
- ✅ No tsconfig.json required
- ✅ No node_modules required (unless we want it)
- ✅ Mature, stable, well-documented

**The Bun --tsconfig-override bug blocks us completely. Deno is the clear path forward.**

**Recommendation:** Proceed with Phase 1 POC to validate approach, then commit to migration if successful.
