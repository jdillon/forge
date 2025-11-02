# JavaScript Runtime Module Resolution Comparison

**Last Updated:** 2025-11-01
**Compared Runtimes:** Bun 1.x, Node.js 25.x, Deno 2.x

## Executive Summary

This document provides a comprehensive comparison of how Bun, Node.js, and Deno handle module resolution, configuration, and dependency management. Use this guide to understand the trade-offs when choosing a runtime or when building tools that need to work across multiple runtimes.

### Quick Decision Matrix

| Requirement | Best Choice | Why |
|------------|-------------|-----|
| Maximum compatibility | **Node.js** | Industry standard, widest ecosystem |
| Performance & DX | **Bun** | Fastest, TypeScript native, Node.js compatible |
| Security & Modern | **Deno** | Permissions-based security, URL imports, no node_modules |
| TypeScript projects | **Bun** or **Deno** | Native TS support, no compilation step |
| Legacy projects | **Node.js** or **Bun** | Bun offers Node.js compatibility with better performance |
| New greenfield projects | **Deno** | Modern design, secure by default, clean dependency management |

---

## Module Resolution Algorithms

### Node.js: The Industry Standard

**Algorithm:** Classic node_modules directory traversal

**Key characteristics:**
- Walks up directory tree looking for `node_modules/`
- Falls back to global folders (`$HOME/.node_modules`, `$PREFIX/lib/node`)
- Supports both CommonJS and ES modules
- Different resolution for `require()` vs `import`

**Search path example** for `/home/user/project/src/app.js` requiring `lodash`:
```
/home/user/project/src/node_modules/lodash
/home/user/project/node_modules/lodash
/home/user/node_modules/lodash
/home/node_modules/lodash
/node_modules/lodash
$HOME/.node_modules/lodash
$PREFIX/lib/node/lodash
```

**File resolution for `require('./module')`:**
1. `./module.js`
2. `./module.json`
3. `./module.node`
4. `./module/package.json` → read `main` field
5. `./module/index.js`
6. `./module/index.json`
7. `./module/index.node`

### Bun: Node.js Compatible with Extensions

**Algorithm:** Implements Node.js algorithm + TypeScript path mapping

**Key characteristics:**
- **100% Node.js compatible** - same search algorithm
- Native TypeScript support - searches for `.ts`/`.tsx` first
- Respects `tsconfig.json` paths (unlike Node.js)
- Uses global cache with hardlinks for efficiency
- Supports `bun` condition in package.json exports

**File resolution priority:**
1. `.tsx`
2. `.jsx`
3. `.ts`
4. `.mjs`
5. `.js`
6. `.cjs`
7. `.json`
8. `index.<ext>` in same order

**Cache strategy:**
- Global cache: `~/.bun/install/cache/`
- Uses hardlinks to project `node_modules/`
- All projects share single instance of each package version
- Reduces disk usage and improves install speed

### Deno: The Modern Approach

**Algorithm:** URL-based, no node_modules

**Key characteristics:**
- **No directory traversal** - uses import maps
- Mandatory file extensions
- Direct HTTPS imports supported
- Multiple registries (JSR, npm, URLs)
- Global cache only (no project-local dependencies)

**Resolution sources:**
1. **Import maps** in `deno.json` - maps bare specifiers to URLs/paths
2. **Relative/absolute paths** - must include file extension
3. **HTTPS URLs** - downloaded and cached automatically
4. **JSR packages** - `jsr:@scope/package`
5. **npm packages** - `npm:package-name`

**Cache location:**
- macOS: `~/Library/Caches/deno`
- Linux: `~/.cache/deno`
- Windows: `%LOCALAPPDATA%\deno`

---

## Configuration Methods

### Environment Variables

| Variable | Node.js | Bun | Deno | Purpose |
|----------|---------|-----|------|---------|
| `NODE_PATH` | ✅ Legacy | ✅ Supported | ❌ | Additional module search paths |
| `NODE_OPTIONS` | ✅ | ✅ | ❌ | Runtime options |
| `BUN_INSTALL` | ❌ | ✅ | ❌ | Bun installation directory |
| `BUN_INSTALL_CACHE_DIR` | ❌ | ✅ | ❌ | Package cache location |
| `BUN_INSTALL_GLOBAL_DIR` | ❌ | ✅ | ❌ | Global packages directory |
| `DENO_DIR` | ❌ | ❌ | ✅ | Deno cache directory |
| `DENO_AUTH_TOKENS` | ❌ | ❌ | ✅ | Registry authentication |
| `NO_COLOR` | ✅ | ✅ | ✅ | Disable colored output |

### Configuration Files

| Feature | Node.js | Bun | Deno |
|---------|---------|-----|------|
| **Primary config** | `package.json` | `package.json` + `bunfig.toml` | `deno.json` |
| **TypeScript paths** | ❌ Needs ts-node | ✅ Native | ✅ Via import maps |
| **Import maps** | ❌ | ❌ | ✅ Native |
| **Lock files** | `package-lock.json` | `bun.lockb` (binary) | `deno.lock` |
| **Global config** | `~/.npmrc` | `~/.bunfig.toml` | N/A |

### package.json / deno.json Comparison

**Node.js package.json:**
```json
{
  "type": "module",
  "main": "./dist/index.js",
  "exports": {
    ".": {
      "import": "./dist/esm/index.js",
      "require": "./dist/cjs/index.js"
    }
  },
  "dependencies": {
    "express": "^4.18.0"
  },
  "devDependencies": {
    "typescript": "^5.0.0"
  }
}
```

**Bun package.json (extends Node.js):**
```json
{
  "type": "module",
  "main": "./dist/index.js",
  "exports": {
    ".": {
      "bun": "./src/index.ts",        // Bun-specific (TypeScript)
      "import": "./dist/esm/index.js",
      "require": "./dist/cjs/index.js"
    }
  },
  "dependencies": {
    "express": "^4.18.0"
  }
}
```

**Deno deno.json:**
```json
{
  "imports": {
    "express": "npm:express@^4.18.0",
    "std/": "https://deno.land/std@0.208.0/",
    "@/": "./src/"
  },
  "tasks": {
    "dev": "deno run --watch main.ts"
  },
  "compilerOptions": {
    "strict": true
  }
}
```

**Key differences:**
- Deno uses `imports` (import maps) instead of `dependencies`
- Deno doesn't separate dev/prod dependencies (unused code not loaded)
- Bun adds `bun` condition for TypeScript entry points

---

## Global vs Local Modules

### Node.js

**Local (preferred):**
```
/home/user/project/node_modules/
```

**Global (legacy, discouraged):**
```
/usr/local/lib/node_modules/
$HOME/.node_modules/
$HOME/.node_libraries/
$PREFIX/lib/node/
```

**Install:**
```bash
npm install express          # Local
npm install -g typescript    # Global
```

### Bun

**Local:**
```
/home/user/project/node_modules/  # Hardlinked from cache
```

**Global:**
```
~/.bun/install/global/node_modules/
```

**Cache (all projects share):**
```
~/.bun/install/cache/
```

**Install:**
```bash
bun install express          # Local (hardlinked)
bun add --global typescript  # Global
```

### Deno

**No local modules** - everything is cached globally:
```
macOS:   ~/Library/Caches/deno/
Linux:   ~/.cache/deno/
Windows: %LOCALAPPDATA%\deno
```

**Cache structure:**
```
$DENO_DIR/
├── deps/       # Remote URLs
├── npm/        # npm packages
└── gen/        # Compiled code
```

**"Install":**
```bash
# Just cache dependencies
deno cache main.ts

# Add to deno.json
deno add @std/path
deno add npm:express
```

---

## Module Resolution APIs

### Programmatic Resolution

**Node.js:**
```javascript
// Resolve module path
const path = require.resolve('lodash');
// /home/user/project/node_modules/lodash/lodash.js

// Get search paths
const paths = require.resolve.paths('lodash');
// ['/home/user/project/node_modules', '/home/user/node_modules', ...]

// Custom search paths
const custom = require.resolve('my-module', {
  paths: ['/custom/path']
});

// Module paths
console.log(module.paths);
// Array of node_modules directories that would be searched
```

**Bun:**
```typescript
// Synchronous resolution
const path = Bun.resolveSync("lodash", "/path/to/project");
// /path/to/project/node_modules/lodash/index.ts

// Async resolution
const path = await Bun.resolve("./module.ts", import.meta.dir);

// Resolve from CWD
const cwdPath = Bun.resolveSync("express", process.cwd());

// Resolve from current file
const localPath = Bun.resolveSync("./utils", import.meta.dir);
```

**Deno:**
```typescript
// Resolve with import maps
const resolved = import.meta.resolve('std/path');
// https://deno.land/std@0.208.0/path/mod.ts

// Resolve relative
const path = import.meta.resolve('./utils.ts');
// file:///home/user/project/utils.ts

// Dynamic import
const module = await import(import.meta.resolve('./dynamic.ts'));
```

### Plugin Systems

**Node.js:**
- No built-in plugin system for resolution
- Tools like webpack/rollup provide custom resolvers

**Bun:**
```typescript
import type { BunPlugin } from "bun";

const plugin: BunPlugin = {
  name: "custom-resolver",
  setup(build) {
    build.onResolve({ filter: /^custom:/ }, (args) => ({
      path: args.path.replace("custom:", "/real/path/"),
      namespace: "custom"
    }));
  }
};

Bun.plugin(plugin);
```

**Deno:**
- No plugin system for resolution
- Use import maps for path customization

---

## File Extensions & Module Types

### Extension Handling

| Feature | Node.js | Bun | Deno |
|---------|---------|-----|------|
| **Implicit extensions** | ✅ CommonJS only | ✅ Always | ❌ Never |
| **Extension search order** | `.js`, `.json`, `.node` | `.tsx`, `.ts`, `.js`, `.json` | N/A (explicit) |
| **TypeScript support** | ❌ Needs tools | ✅ Native | ✅ Native |
| **index.js auto-load** | ✅ | ✅ | ❌ |

**Examples:**

```javascript
// Node.js CommonJS
require('./module')        // ✅ Finds module.js
require('./module.js')     // ✅ Explicit

// Node.js ESM
import { x } from './module'     // ❌ Error
import { x } from './module.js'  // ✅ Required

// Bun (both work)
import { x } from './module'     // ✅ Finds module.ts/js
import { x } from './module.ts'  // ✅ Explicit

// Deno (explicit required)
import { x } from './module'     // ❌ Error
import { x } from './module.ts'  // ✅ Required
```

### Module Type Detection

**Node.js:**
- `.mjs` → Always ES module
- `.cjs` → Always CommonJS
- `.js` → Depends on nearest `package.json` `type` field
  - `"type": "module"` → ESM
  - `"type": "commonjs"` or missing → CommonJS

**Bun:**
- Same as Node.js for compatibility
- Additionally recognizes `.ts`, `.tsx`, `.jsx` natively

**Deno:**
- `.ts`, `.tsx`, `.js`, `.jsx` → Always ES modules
- No CommonJS support

---

## Path Mapping & Aliases

### TypeScript Path Mapping

**Node.js:**
```json
// tsconfig.json
{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@/*": ["src/*"]
    }
  }
}
```

```typescript
// ❌ Doesn't work in Node.js runtime
import { utils } from '@/utils';

// Requires ts-node, tsx, or compilation
```

**Bun:**
```json
// tsconfig.json (same as Node.js)
{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@/*": ["src/*"]
    }
  }
}
```

```typescript
// ✅ Works natively in Bun
import { utils } from '@/utils';
```

**Deno:**
```json
// deno.json (import maps)
{
  "imports": {
    "@/": "./src/"
  }
}
```

```typescript
// ✅ Works with import maps
import { utils } from '@/utils.ts';
```

**Winner:** Bun for TypeScript path compatibility, Deno for explicit configuration

---

## Package Management

### Installation Speed

**Benchmarks** (installing React app dependencies):
- **Bun:** ~0.5s (fastest)
- **pnpm:** ~2.0s
- **Yarn:** ~3.5s
- **npm:** ~12s (slowest)

### Lockfile Formats

| Runtime | Lockfile | Format | Readable |
|---------|----------|--------|----------|
| Node.js (npm) | `package-lock.json` | JSON | ✅ |
| Node.js (yarn) | `yarn.lock` | Custom | ✅ |
| Node.js (pnpm) | `pnpm-lock.yaml` | YAML | ✅ |
| Bun | `bun.lockb` | Binary | ❌ |
| Deno | `deno.lock` | JSON | ✅ |

### Disk Space Usage

**node_modules size** (typical React app):
```
npm:    ~200MB in node_modules + duplicates across projects
pnpm:   ~100MB (hardlinks, shared store)
Bun:    ~50MB (hardlinks, global cache)
Deno:   ~0MB (no node_modules, global cache only)
```

### Dependency Sources

| Source | Node.js | Bun | Deno |
|--------|---------|-----|------|
| **npm registry** | ✅ Default | ✅ Default | ✅ `npm:` prefix |
| **Git repos** | ✅ | ✅ | ✅ HTTPS |
| **Tarball URLs** | ✅ | ✅ | ✅ |
| **HTTPS URLs** | ❌ | ❌ | ✅ Native |
| **JSR** | ❌ | ❌ | ✅ Native |
| **Local paths** | ✅ `file:` | ✅ `file:` | ✅ Relative |

---

## Caching Strategies

### Node.js (npm)

**Package cache:**
```
~/.npm/_cacache/
```

**Module runtime cache:**
```javascript
// In-memory cache, accessible via:
require.cache
```

**Behavior:**
- Packages downloaded to cache, then copied to `node_modules/`
- Each project has full copy (no sharing)
- Runtime cache is per-process

### Bun

**Package cache:**
```
~/.bun/install/cache/
```

**Linking strategy:**
```
~/.bun/install/cache/lodash@4.17.21/  (master copy)
  ↓ hardlink
/project/node_modules/lodash/  (instant, no disk duplication)
```

**Transpilation cache:**
```
$BUN_RUNTIME_TRANSPILER_CACHE_PATH/
```

**Benefits:**
- Zero-copy installs (hardlinks)
- All projects share single instance
- Massive disk space savings
- Faster installs

**Linker options:**
```bash
bun install                 # Default: hardlinks
bun install --linker=isolated  # pnpm-style isolation
```

### Deno

**Global cache only:**
```
macOS:   ~/Library/Caches/deno/
Linux:   ~/.cache/deno/
Windows: %LOCALAPPDATA%\deno
```

**Structure:**
```
$DENO_DIR/
├── deps/
│   └── https/           # URL imports
├── npm/                 # npm packages
├── gen/                 # Compiled JS
└── registries/jsr/      # JSR packages
```

**Behavior:**
- All dependencies cached globally
- No project-local copies
- Shared across all projects
- Can be locked with `deno.lock`

**Cache management:**
```bash
deno cache main.ts           # Download and cache
deno cache --reload main.ts  # Force refresh
deno info                    # Show cache location
```

---

## Security Model

### Node.js

**Security:** None built-in

```bash
node app.js  # Full system access by default
```

**Implications:**
- Packages can access filesystem, network, environment variables freely
- Supply chain attacks are high risk
- Must trust all dependencies

**Mitigations:**
- Use `npm audit`
- Lock dependencies with `package-lock.json`
- Use tools like Snyk, Dependabot

### Bun

**Security:** Same as Node.js (for compatibility)

```bash
bun run app.ts  # Full system access
```

**Note:** Bun prioritizes Node.js compatibility over security sandboxing.

### Deno

**Security:** Permission-based (default deny)

```bash
# ❌ No permissions - will fail if app needs them
deno run app.ts

# ✅ Explicit permissions
deno run --allow-read --allow-write --allow-net app.ts

# Allow specific domains
deno run --allow-net=api.example.com app.ts

# Allow specific directories
deno run --allow-read=/tmp app.ts
```

**Permissions:**
- `--allow-read[=<path>]` - Filesystem read
- `--allow-write[=<path>]` - Filesystem write
- `--allow-net[=<domain>]` - Network access
- `--allow-env[=<var>]` - Environment variables
- `--allow-run[=<cmd>]` - Subprocess execution
- `--allow-all` - All permissions (not recommended)

**Benefits:**
- Untrusted code sandboxed by default
- Clear visibility into what dependencies can access
- Reduced supply chain attack surface

---

## Performance Comparison

### Module Resolution Speed

**Benchmarks** (resolving 1000 modules):
- **Bun:** ~5ms (native code, optimized)
- **Node.js:** ~15ms (baseline)
- **Deno:** ~10ms (Rust-based)

### Startup Time

**Cold start** (simple app):
- **Bun:** ~20ms
- **Deno:** ~30ms
- **Node.js:** ~50ms

**With large dependency tree:**
- **Bun:** ~100ms
- **Deno:** ~150ms
- **Node.js:** ~300ms

### Memory Usage

**Idle runtime:**
- **Bun:** ~30MB
- **Deno:** ~40MB
- **Node.js:** ~50MB

**With dependencies:**
- **Bun:** ~60MB
- **Deno:** ~70MB
- **Node.js:** ~100MB

---

## Ecosystem Compatibility

### Package Availability

| Ecosystem | Node.js | Bun | Deno |
|-----------|---------|-----|------|
| **npm packages** | ✅ 100% | ✅ ~95% | ⚠️ ~70% |
| **Native addons** | ✅ Full | ⚠️ Limited | ❌ Not supported |
| **TypeScript packages** | ⚠️ Needs tools | ✅ Native | ✅ Native |
| **Deno packages** | ❌ | ❌ | ✅ |
| **JSR packages** | ❌ | ❌ | ✅ |

### Node.js API Compatibility

| API | Node.js | Bun | Deno |
|-----|---------|-----|------|
| `fs` | ✅ | ✅ | ✅ `node:fs` |
| `path` | ✅ | ✅ | ✅ `node:path` |
| `http` | ✅ | ✅ | ✅ `node:http` |
| `crypto` | ✅ | ✅ | ✅ `node:crypto` |
| `child_process` | ✅ | ✅ | ⚠️ Limited |

**Bun:** Near 100% Node.js API compatibility
**Deno:** Good compatibility via `node:` imports

---

## Use Case Recommendations

### When to Use Node.js

✅ **Use Node.js when:**
- Maximum ecosystem compatibility required
- Using native Node.js addons
- Working with legacy codebases
- Team familiarity with npm/yarn
- Enterprise support needed
- Long-term stability critical

❌ **Avoid Node.js when:**
- Performance is critical
- TypeScript-first development
- Want faster iteration/installs
- Building new greenfield projects

### When to Use Bun

✅ **Use Bun when:**
- Performance is priority
- TypeScript/JSX projects
- Want Node.js compatibility + speed
- Fast development iteration needed
- Disk space is concern (global cache)
- Using tsconfig.json paths

❌ **Avoid Bun when:**
- Need maximum stability (Bun still maturing)
- Using many native addons
- Enterprise/conservative environment
- Need LTS support

### When to Use Deno

✅ **Use Deno when:**
- Security is critical
- Building new projects from scratch
- Want modern development experience
- TypeScript-first development
- Prefer URL imports and import maps
- No legacy Node.js dependencies

❌ **Avoid Deno when:**
- Heavy npm dependency requirements
- Need Node.js API compatibility
- Using native addons
- Team unfamiliar with Deno paradigms
- Working with existing Node.js codebase

---

## Migration Paths

### Node.js → Bun

**Effort:** Low (90% compatible)

**Steps:**
1. Install Bun: `curl -fsSL https://bun.sh/install | bash`
2. Replace `node` with `bun`: `bun run app.js`
3. Replace `npm install` with `bun install`
4. Test thoroughly (check native addons)

**Benefits:**
- Faster execution
- Faster installs
- Native TypeScript
- Minimal code changes

**Risks:**
- Native addon incompatibility
- Edge case differences
- Less mature ecosystem

### Node.js → Deno

**Effort:** High (requires code changes)

**Steps:**
1. Install Deno: `curl -fsSL https://deno.land/install.sh | sh`
2. Create `deno.json` with import maps
3. Update imports to use file extensions
4. Replace npm packages with JSR or `npm:` prefix
5. Add permissions to run commands
6. Rewrite package.json scripts as deno tasks

**Benefits:**
- Modern, secure runtime
- No node_modules
- Better TypeScript experience
- Built-in tooling (fmt, lint, test)

**Risks:**
- Significant refactoring required
- npm package compatibility issues
- Team learning curve

### Bun → Node.js

**Effort:** Very Low

**Steps:**
1. Replace `bun` with `node`
2. Use `npm` instead of `bun install`
3. Remove Bun-specific features (if any)

**Why migrate back:**
- Bun compatibility issues
- Need enterprise LTS support
- Native addon requirements

---

## Summary Table

| Feature | Node.js | Bun | Deno |
|---------|---------|-----|------|
| **Module algorithm** | node_modules tree | node_modules tree | Import maps + cache |
| **TypeScript** | Needs tools | ✅ Native | ✅ Native |
| **Path mapping** | Needs tools | ✅ Native | ✅ Import maps |
| **File extensions** | Optional (CJS) | Optional | ✅ Required |
| **npm packages** | ✅ Native | ✅ Native | `npm:` prefix |
| **URL imports** | ❌ | ❌ | ✅ Native |
| **Install speed** | Slow | ✅ Fastest | Medium |
| **Disk usage** | High | Low (cache) | ✅ Lowest (no node_modules) |
| **Security** | None | None | ✅ Permissions |
| **Compatibility** | ✅ 100% | ~95% Node.js | ~70% npm |
| **Maturity** | ✅ Very mature | Maturing | Mature |
| **Performance** | Baseline | ✅ Fastest | Fast |

---

## Conclusion

**Choose based on your priorities:**

1. **Ecosystem & Stability** → Node.js
2. **Performance & DX** → Bun
3. **Security & Modern** → Deno

All three runtimes are production-ready, but serve different use cases. Node.js remains the safe, compatible choice. Bun offers a faster, more pleasant development experience with minimal migration cost. Deno represents a clean-slate redesign prioritizing security and modern standards.

For most projects, **Bun** offers the best balance of performance, developer experience, and ecosystem compatibility. For security-critical or greenfield projects, **Deno** is worth serious consideration. **Node.js** remains the most battle-tested and widely supported option.

---

## References

### Bun
- [Module Resolution](https://bun.sh/docs/runtime/modules)
- [Bun.resolve API](https://bun.sh/docs/api/utils)
- [Environment Variables](https://bun.sh/docs/runtime/env)

### Node.js
- [CommonJS Modules](https://nodejs.org/api/modules.html)
- [ES Modules](https://nodejs.org/api/esm.html)
- [Package Entry Points](https://nodejs.org/api/packages.html)

### Deno
- [Import Maps](https://docs.deno.com/runtime/manual/basics/import_maps/)
- [Module System](https://docs.deno.com/runtime/manual/basics/modules/)
- [Configuration](https://docs.deno.com/runtime/fundamentals/configuration/)
