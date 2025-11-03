# Bun Module Resolution & Configuration

**Last Updated:** 2025-11-01
**Runtime Version:** Bun 1.x
**Sources Verified:** Official Bun docs, GitHub repository, Context7 library docs

> **Verification Note:** All configuration options have been cross-referenced with:
> - [Bun official documentation](https://bun.sh/docs)
> - [oven-sh/bun GitHub repository](https://github.com/oven-sh/bun)
> - Context7 documentation snapshots
>
> Known discrepancies and issues are noted with references to GitHub issues.

## Overview

Bun implements the Node.js module resolution algorithm for maximum compatibility while adding performance optimizations and TypeScript-first features. It's designed as a drop-in replacement for Node.js with minimal configuration changes.

**Official Documentation:**
- [Bun Runtime - Modules](https://bun.sh/docs/runtime/modules)
- [Bun Install Configuration](https://github.com/oven-sh/bun/blob/main/docs/cli/bun-install.md)
- [Bun Runtime Configuration](https://github.com/oven-sh/bun/blob/main/docs/runtime/bunfig.md)

---

## Module Resolution Algorithm

Bun follows Node.js module resolution with these steps:

### 1. Resolution Order

When you import a module, Bun checks:

1. **Core modules** - Built-in Bun/Node.js modules
2. **Absolute paths** - Paths starting with `/`
3. **Relative paths** - Paths starting with `./`, `../`
4. **tsconfig.json paths** - Path mappings (Bun extension)
5. **node_modules** - Walks up directory tree
6. **package.json exports** - Respects export conditions

### 2. File Extension Resolution

Bun searches for files in this order:
- `.tsx`
- `.jsx`
- `.ts`
- `.mjs`
- `.js`
- `.cjs`
- `.json`
- `index.<ext>` files in the above order

**TypeScript Support:** Bun natively transpiles TypeScript without requiring separate tools.

### 3. Package.json Resolution

When importing a package, Bun reads `package.json` in this order:

```json
{
  "exports": {
    ".": {
      "bun": "./dist/bun.js",      // Bun-specific entry (if present)
      "import": "./dist/esm.js",   // ES modules
      "require": "./dist/cjs.js"   // CommonJS
    }
  },
  "module": "./dist/esm.js",       // ESM fallback
  "main": "./dist/cjs.js"          // Final fallback
}
```

**Priority:** `exports` > `module` > `main`

---

## node_modules Search Path

### Local Resolution

For a file at `/home/user/project/src/app.ts` requiring `lodash`:

```
/home/user/project/src/node_modules/lodash
/home/user/project/node_modules/lodash
/home/user/node_modules/lodash
/home/node_modules/lodash
/node_modules/lodash
```

Bun walks up the directory tree until it finds the module or reaches the filesystem root.

### Global Modules

Bun stores globally installed packages at:
- **Default:** `~/.bun/install/global/node_modules`
- **Custom:** Set via `BUN_INSTALL_GLOBAL_DIR` environment variable

---

## Configuration Locations

### Environment Variables

#### Installation & Paths

- **`BUN_INSTALL`** - Bun's installation directory (default: `~/.bun`)
- **`BUN_INSTALL_BIN`** - Global binaries directory (default: `~/.bun/bin`)
- **`BUN_INSTALL_CACHE_DIR`** - Package cache location (default: `~/.bun/install/cache`)
- **`BUN_INSTALL_GLOBAL_DIR`** - Global packages directory
- **`NODE_PATH`** - Additional module resolution paths (colon-delimited on Unix, semicolon on Windows)

#### Runtime & Transpilation

- **`BUN_RUNTIME_TRANSPILER_CACHE_PATH`** - Transpiled file cache directory (for files >50KB)
  - Set to `""` or `"0"` to disable caching
- **`BUN_OPTIONS`** - Prepend CLI arguments to all Bun executions (e.g., `BUN_OPTIONS="--hot"`)

#### Package Management

- **`BUN_CONFIG_REGISTRY`** - NPM registry URL (default: `https://registry.npmjs.org`)
- **`BUN_CONFIG_TOKEN`** - Auth token for registry
- **`BUN_CONFIG_MAX_HTTP_REQUESTS`** - Concurrent HTTP requests limit (default: 256)
- **`BUN_CONFIG_LINK_NATIVE_BINS`** - Control native binary linking
- **`BUN_CONFIG_YARN_LOCKFILE`** - Save Yarn v1-style `yarn.lock`
- **`BUN_CONFIG_SKIP_SAVE_LOCKFILE`** - Don't save lockfile
- **`BUN_CONFIG_SKIP_LOAD_LOCKFILE`** - Don't load lockfile
- **`BUN_CONFIG_SKIP_INSTALL_PACKAGES`** - Don't install packages

**Reference:** [Bun Install CLI docs](https://github.com/oven-sh/bun/blob/main/docs/cli/bun-install.md)

#### Debugging

- **`BUN_CONFIG_VERBOSE_FETCH`** - Log network requests
  - `curl` = log as curl commands
  - `1` or `true` = log request/response
- **`BUN_DEBUG_<scope>`** - Enable debug logging for specific scopes
- **`BUN_DEBUG_QUIET_LOGS`** - Set to `1` to disable all debug logs except enabled scopes
- **`BUN_DEBUG`** - Set to file path to dump debug logs (e.g., `BUN_DEBUG=output.log`)

### bunfig.toml

Project or global configuration file for Bun settings.

**Locations searched** (in order):
1. `$XDG_CONFIG_HOME/.bunfig.toml` (if XDG_CONFIG_HOME is set)
2. `$HOME/.bunfig.toml` - User home directory
3. Project directory `bunfig.toml` (takes precedence for project-specific settings)

**Reference:** [Bun docs - bunfig.toml](https://github.com/oven-sh/bun/blob/main/docs/cli/bun-install.md)

**Example configuration:**

```toml
[install]
# Install behavior
production = false      # Don't skip devDependencies (default: false)
optional = true        # Install optionalDependencies (default: true)
dev = true            # Install devDependencies (default: true)
peer = true           # Install peerDependencies (default: true)
exact = false         # Use exact versions vs caret ranges (default: false)

# Global installation (when using bun install -g)
globalDir = "~/.bun/install/global"      # Where global packages are installed
globalBinDir = "~/.bun/bin"              # Where global bins are linked

# Cache configuration
[install.cache]
dir = "~/.bun/install/cache"    # Cache directory location
disable = false                  # Don't disable global cache (default: false)
disableManifest = false         # Don't always fetch latest (default: false)

# Lockfile configuration
[install.lockfile]
save = true                     # Generate lockfile (default: true)
print = "yarn"                  # Also generate yarn.lock format (optional)

# Registry configuration
[install]
registry = "https://registry.npmjs.org"
# Or with authentication:
# registry = { url = "https://registry.npmjs.org", token = "$npm_token" }

# Linker strategy (Bun 1.2.19+)
linker = "hoisted"             # Or "isolated" for pnpm-style
```

**Important notes:**
- Environment variables **override** `bunfig.toml` settings
- Some settings like `globalDir` have [known issues on Windows](https://github.com/oven-sh/bun/issues/12886)
- Reference the [official TypeScript interface](https://github.com/oven-sh/bun/blob/main/docs/cli/bun-install.md#bunfigtoml) for complete schema

### tsconfig.json / jsconfig.json

Bun natively supports TypeScript path mapping, unlike Node.js.

**Example:**

```json
{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@/*": ["src/*"],
      "@components/*": ["src/components/*"],
      "@utils/*": ["src/utils/*"]
    }
  }
}
```

**Usage:**

```typescript
// Instead of:
import { Button } from '../../../components/Button';

// You can use:
import { Button } from '@components/Button';
```

**Non-TypeScript Projects:** Create `jsconfig.json` with the same structure.

---

## Module Cache System

### Cache Location

Bun uses a global cache with hardlinks for efficiency:

- **Cache Directory:** `~/.bun/install/cache/` (customizable via `BUN_INSTALL_CACHE_DIR`)
- **Strategy:** All projects hardlink to a single instance of each package version
- **Benefits:**
  - Reduced disk space usage
  - Faster installation
  - Shared cache across projects

**Reference:** [Bun - Global Cache](https://github.com/oven-sh/bun/blob/main/docs/install/cache.md)

### Transpilation Cache

- **Location:** Set via `BUN_RUNTIME_TRANSPILER_CACHE_PATH`
- **Threshold:** Only files >50KB are cached
- **Disable:** Set to `""` or `"0"`

### Linker Options

Bun v1.2.19+ supports different linking strategies:

```bash
# Default: hardlinks to global cache
bun install

# Isolated node_modules (pnpm-style)
bun install --linker=isolated
```

**Reference:** [Bun - Isolated Installs](https://github.com/oven-sh/bun/blob/main/docs/install/isolated.md)

---

## Dynamic Module Resolution API

### Bun.resolve() / Bun.resolveSync()

Resolve module specifiers using Bun's internal resolution algorithm.

**Signature:**

```typescript
Bun.resolveSync(specifier: string, root: string): string
Bun.resolve(specifier: string, root: string): Promise<string>
```

**Parameters:**
- `specifier` - Module path or package name to resolve
- `root` - Base directory for resolution

**Examples:**

```typescript
// Resolve relative path
const path = Bun.resolveSync("./foo.ts", "/path/to/project");
// Returns: "/path/to/project/foo.ts"

// Resolve package from node_modules
const zodPath = Bun.resolveSync("zod", "/path/to/project");
// Returns: "/path/to/project/node_modules/zod/index.ts"

// Resolve from current working directory
const cwd = Bun.resolveSync("lodash", process.cwd());

// Resolve from current file's directory
const local = Bun.resolveSync("./utils", import.meta.dir);
```

**Error Handling:**

```typescript
try {
  const path = Bun.resolveSync("nonexistent", ".");
} catch (error) {
  console.error("Module not found:", error);
}
```

### Plugin-Based Resolution

Bun supports custom module resolution via plugins:

```typescript
import type { BunPlugin } from "bun";

const myPlugin: BunPlugin = {
  name: "custom-resolver",
  setup(build) {
    // Filter which modules to handle
    build.onResolve({ filter: /^custom:/ }, (args) => {
      return {
        path: args.path.replace("custom:", "/path/to/"),
        namespace: "custom"
      };
    });
  }
};

// Use in runtime
Bun.plugin(myPlugin);

// Or in bundler
await Bun.build({
  entrypoints: ["./index.ts"],
  plugins: [myPlugin]
});
```

---

## Package Export Conditions

Bun respects package.json `exports` with custom conditions:

### Default Conditions

Bun automatically uses these conditions in order:
1. `bun` - Bun-specific entry point
2. `import` - ES modules
3. `require` - CommonJS
4. `node` - Node.js compatibility
5. `default` - Fallback

### Custom Conditions

Use the `--conditions` flag to specify custom conditions:

```bash
# Development build with custom condition
bun run --conditions=development app.ts

# Multiple conditions
bun run --conditions=custom,development app.ts
```

**In package.json:**

```json
{
  "exports": {
    ".": {
      "development": "./src/index.ts",
      "production": "./dist/index.js",
      "bun": "./bun/index.ts",
      "import": "./esm/index.js",
      "require": "./cjs/index.js"
    }
  }
}
```

---

## Key Differences from Node.js

### Advantages

1. **Native TypeScript Support**
   - No need for `ts-node` or compilation step
   - Direct `.ts` / `.tsx` file execution

2. **Path Mapping Support**
   - `tsconfig.json` paths work natively
   - No additional tooling required

3. **Performance**
   - Faster module resolution
   - Optimized cache with hardlinks
   - Native transpilation

4. **Package Conditions**
   - `bun` condition for Bun-specific code
   - More flexible export conditions

### Compatibility

- **100% Node.js algorithm compatibility** - All Node.js projects work
- **ESM and CommonJS** - Both module systems supported
- **package.json fields** - Respects all standard fields
- **node_modules structure** - Identical to npm/pnpm

### Extensions

- **Custom linkers** - `--linker=isolated` for pnpm-style layouts
- **Faster installation** - Up to 25x faster than npm
- **Built-in bundler** - No need for webpack/rollup

---

## Best Practices

### 1. Use Path Mapping

Instead of complex relative imports:

```typescript
// ❌ Hard to maintain
import { db } from '../../../lib/database';

// ✅ Clear and maintainable
import { db } from '@/lib/database';
```

**Setup tsconfig.json:**

```json
{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@/*": ["src/*"]
    }
  }
}
```

### 2. Leverage Bun Conditions

Optimize packages for Bun runtime:

```json
{
  "exports": {
    ".": {
      "bun": "./src/index.ts",     // Direct TS for Bun
      "import": "./dist/index.js",  // Compiled for Node
      "require": "./dist/index.cjs"
    }
  }
}
```

### 3. Use Global Cache

Don't disable the cache unless necessary - it significantly improves performance.

### 4. Prefer bun install

Use Bun's package manager for faster installations:

```bash
# Instead of npm install
bun install

# For pnpm-style isolation
bun install --linker=isolated
```

---

## Troubleshooting

### Module Not Found

1. **Check resolution:**
   ```typescript
   console.log(Bun.resolveSync("package-name", process.cwd()));
   ```

2. **Verify node_modules:**
   ```bash
   ls -la node_modules/package-name
   ```

3. **Check path mapping:**
   ```json
   // Ensure tsconfig.json is correct
   {
     "compilerOptions": {
       "baseUrl": ".",
       "paths": {
         "@/*": ["src/*"]
       }
     }
   }
   ```

### Cache Issues

Clear Bun's cache:

```bash
# Clear install cache
rm -rf ~/.bun/install/cache

# Clear transpiler cache
rm -rf $BUN_RUNTIME_TRANSPILER_CACHE_PATH
```

### Debug Resolution

Enable verbose logging:

```bash
# See all resolution attempts
BUN_DEBUG_EventLoop=1 bun run app.ts

# Log network requests
BUN_CONFIG_VERBOSE_FETCH=1 bun install
```

---

## References

### Official Documentation
- [Bun Runtime - Modules](https://bun.sh/docs/runtime/modules) - Module resolution algorithm
- [Bun Install CLI](https://github.com/oven-sh/bun/blob/main/docs/cli/bun-install.md) - Complete install configuration
- [bunfig.toml Reference](https://github.com/oven-sh/bun/blob/main/docs/runtime/bunfig.md) - All configuration options
- [Environment Variables](https://github.com/oven-sh/bun/blob/main/docs/runtime/env.md) - Runtime environment configuration
- [Global Cache](https://github.com/oven-sh/bun/blob/main/docs/install/cache.md) - Cache system details
- [Isolated Installs](https://github.com/oven-sh/bun/blob/main/docs/install/isolated.md) - pnpm-style linking

### GitHub Repository
- [oven-sh/bun](https://github.com/oven-sh/bun) - Official Bun repository
- [TypeScript Configuration Interface](https://github.com/oven-sh/bun/blob/main/docs/cli/bun-install.md#bunfigtoml) - Schema for bunfig.toml

### Known Issues
- [globalDir not respected on Windows #12886](https://github.com/oven-sh/bun/issues/12886)
- [bunfig.toml not respected #5636](https://github.com/oven-sh/bun/issues/5636)
