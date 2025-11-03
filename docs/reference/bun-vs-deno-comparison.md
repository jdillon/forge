# Bun vs Deno: Comprehensive Comparison (2025)

**Last Updated:** January 2025
**Bun Version:** 1.3.x
**Deno Version:** 2.5.x

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Architecture & Philosophy](#architecture--philosophy)
3. [Package Management](#package-management)
4. [Module System & Imports](#module-system--imports)
5. [Configuration Files](#configuration-files)
6. [Core APIs](#core-apis)
7. [File System](#file-system)
8. [HTTP & Networking](#http--networking)
9. [Process & Shell Execution](#process--shell-execution)
10. [TypeScript Support](#typescript-support)
11. [Testing Framework](#testing-framework)
12. [Built-in Tools](#built-in-tools)
13. [Security Model](#security-model)
14. [Performance](#performance)
15. [Ecosystem Compatibility](#ecosystem-compatibility)
16. [Web Standards Support](#web-standards-support)
17. [Developer Experience](#developer-experience)
18. [Complete API Reference](#complete-api-reference)
19. [Migration Considerations](#migration-considerations)
20. [Decision Matrix](#decision-matrix)

---

## Executive Summary

### Bun
**Philosophy:** Drop-in Node.js replacement with maximum performance and all-in-one tooling
**Strengths:** Speed, npm compatibility, built-in shell, bundler, databases
**Best For:** Performance-critical apps, Node.js migration, rapid development

### Deno
**Philosophy:** Secure-by-default, web-standards-first runtime with modern tooling
**Strengths:** Security, module control, web APIs, stability
**Best For:** Security-critical apps, greenfield projects, controlled environments

---

## Architecture & Philosophy

### Bun

**Core Technology:**
- Written in **Zig** (systems programming language)
- Uses **JavaScriptCore** (WebKit's JS engine)
- Zero-copy architecture for performance
- Optimized for compatibility with Node.js

**Design Philosophy:**
- **Speed first** - Fastest startup, execution, and package management
- **All-in-one** - Bundle everything developers need (bundler, transpiler, test runner, package manager)
- **Drop-in replacement** - Maximum Node.js compatibility
- **Developer ergonomics** - Reduce friction, simplify common tasks
- **No breaking changes** - Stable API surface

**Key Architectural Decisions:**
- Native implementation of Node APIs in Zig
- Built-in bundler using custom transpiler
- Global install cache with hardlinks (like pnpm)
- Package self-reference enabled by default
- No sandboxing (trust-based like Node.js)

---

### Deno

**Core Technology:**
- Written in **Rust** (systems programming language)
- Uses **V8** (Chrome's JS engine)
- Tokio async runtime
- Built on web standards

**Design Philosophy:**
- **Security first** - Explicit permissions required
- **Standards-based** - Use web APIs where possible
- **Modern tooling** - Built-in formatter, linter, test runner
- **Explicit over implicit** - Clear module resolution
- **Backwards compatible** - Node/npm support without compromising design

**Key Architectural Decisions:**
- URL-based imports (ESM-only originally, now supports both)
- Permissions system for security sandboxing
- Import maps for centralized dependency management
- No node_modules by default (global cache)
- TypeScript-first design

---

## Package Management

### Bun

**Package Manager:** `bun install`, `bun add`, `bun remove`
**Speed:** 15-90% faster than npm (90% faster with hot cache)

#### Commands

```bash
# Initialize project
bun init

# Install dependencies
bun install                    # Install from package.json
bun install --production      # Skip devDependencies
bun install --frozen-lockfile # CI mode, don't update lockfile

# Add packages
bun add <package>              # Add to dependencies
bun add -d <package>           # Add to devDependencies
bun add -g <package>           # Global install
bun add <package>@<version>    # Specific version

# Remove packages
bun remove <package>

# Update packages
bun update <package>           # Update specific package
bun update                     # Update all packages

# Link packages
bun link                       # Create global link
bun link <package>             # Link to local package
```

#### Package Sources

```json
{
  "dependencies": {
    "lodash": "^4.17.21",                           // npm registry
    "mypackage": "github:user/repo",                // GitHub (HTTPS)
    "private": "git+ssh://git@github.com/user/repo.git", // GitHub SSH ✅
    "gitlab": "gitlab:user/repo",                    // GitLab ✅
    "local": "file:../local-package",               // Local file
    "tarball": "https://example.com/pkg.tgz"        // Tarball URL
  }
}
```

**Git Protocol Support:**
- ✅ `github:user/repo` - HTTPS (public repos)
- ✅ `git+ssh://git@github.com/user/repo.git` - SSH (private repos with keys)
- ✅ `git+https://github.com/user/repo.git` - Explicit HTTPS
- ✅ `gitlab:user/repo` - GitLab support

#### Installation Behavior

**File:** `package.json` (standard Node.js format)
**Lockfile:** `bun.lockb` (binary format, faster to parse)
**Install Location:** `node_modules/` (standard location)
**Cache:** `~/.bun/install/cache/` (global cache with hardlinks)
**Linker Modes:**
- `hoisted` (default): Flattens dependencies like npm
- `isolated`: Strict isolation like pnpm

#### Configuration (`bunfig.toml`)

```toml
[install]
# Registry
registry = "https://registry.npmjs.org/"

# Scoped registries
[install.scopes]
"@myorg" = { url = "https://registry.mycompany.com", token = "$NPM_TOKEN" }

# Linker
linker = "hoisted"  # or "isolated"

# Cache
cache = "~/.bun/install/cache"

# Auto-install behavior
auto = "install"  # "install", "fallback", "disable", "force"

# Install options
exact = true      # Use exact versions (--save-exact)
dev = true        # Install devDependencies
optional = true   # Install optionalDependencies
peer = true       # Install peerDependencies

# Global settings
globalDir = "~/.bun/install/global"
globalBinDir = "~/.bun/bin"
```

#### Workspaces

```json
// package.json
{
  "workspaces": ["packages/*", "apps/*"]
}
```

- Full monorepo support
- Workspace protocol: `"@myorg/pkg": "workspace:*"`
- Shared dependencies hoisted to root

#### npm Compatibility

- ✅ Reads package.json and package-lock.json
- ✅ Supports npm lifecycle scripts (preinstall, postinstall, etc.)
- ✅ Compatible with .npmrc for auth and registry config
- ✅ Handles peerDependencies correctly
- ✅ Respects bundledDependencies
- ⚠️ Some postinstall scripts may fail (native module builds)

---

### Deno

**Package Manager:** `deno add`, `deno install`, `deno remove`
**Speed:** 15% faster than npm (cold cache), 90% faster (hot cache)

#### Commands

```bash
# Initialize project
deno init

# Install dependencies (from deno.json or package.json)
deno install                   # Install all dependencies
deno install --frozen          # CI mode, don't update lockfile

# Add packages
deno add <package>             # Add JSR package
deno add npm:<package>         # Add npm package
deno add jsr:@std/assert       # Explicit JSR
deno add npm:chalk@5.0.0       # npm with version

# Remove packages
deno remove <package>

# Cache remote dependencies
deno cache main.ts             # Download and cache imports
deno cache --reload main.ts    # Force re-download

# Vendor dependencies (optional)
deno vendor main.ts            # Copy deps to vendor/
```

#### Package Sources

```json
// deno.json
{
  "imports": {
    // JSR packages (Deno's registry)
    "@std/assert": "jsr:@std/assert@^1.0.0",

    // npm packages
    "chalk": "npm:chalk@^5.3.0",
    "express": "npm:express@^4.18.0",

    // HTTP URLs (direct GitHub)
    "oak": "https://deno.land/x/oak@v12.6.1/mod.ts",
    "mylib": "https://raw.githubusercontent.com/user/repo/v1.0.0/mod.ts",

    // Local files
    "utils": "./src/utils/index.ts",

    // Path mapping
    "@/": "./src/",
    "~/": "./",

    // Version pinning
    "lodash": "npm:lodash@=4.17.21"
  }
}
```

**Git Protocol Support:**
- ✅ `https://raw.githubusercontent.com/user/repo/tag/file.ts` - HTTPS URLs
- ✅ Private repos via `DENO_AUTH_TOKENS` (bearer tokens)
- ❌ `git+ssh://` - **NOT SUPPORTED**
- ❌ `git+https://` - **NOT SUPPORTED**
- ❌ `github:user/repo` shorthand - **NOT SUPPORTED**

**Private Repository Access:**
```bash
# Set GitHub personal access token
export DENO_AUTH_TOKENS=ghp_abc123@raw.githubusercontent.com

# Then import works
import { lib } from "https://raw.githubusercontent.com/user/private-repo/main/mod.ts";
```

**⚠️ Major Limitation:** Deno does not support SSH keys for git authentication like npm/Bun. You must use HTTPS URLs with personal access tokens.

#### Installation Behavior

**File:** `deno.json` (Deno config) OR `package.json` (Node compat)
**Lockfile:** `deno.lock` (JSON format, human-readable)
**Install Location:**
- Default: Global cache (no node_modules)
- With package.json: `node_modules/` created
**Cache:**
- `$DENO_DIR/deps/` (default: `~/.cache/deno/deps/`)
- Can be customized with `DENO_DIR` env var
**Linking:** Hard links from cache to reduce disk usage

#### Configuration (`deno.json`)

```json
{
  // Import map
  "imports": {
    "std/": "https://deno.land/std@0.217.0/",
    "@/": "./src/"
  },

  // Scoped imports (per-directory overrides)
  "scopes": {
    "./tests/": {
      "@/config": "./tests/fixtures/config.ts"
    }
  },

  // Node modules directory
  "nodeModulesDir": "auto",  // "auto", true, false

  // Lock file
  "lock": true,  // or "./custom-lock.json"

  // Vendor directory
  "vendor": true,

  // npm registry
  "npmRegistry": "https://registry.npmjs.org"
}
```

#### Workspaces

```json
// deno.json
{
  "workspace": ["./packages/a", "./packages/b"],
  "imports": {
    "@myorg/pkg-a": "jsr:@myorg/pkg-a@^1.0.0"
  }
}
```

- Monorepo support added in Deno 2.0
- Can mix Deno-first and Node-first packages
- Shared import maps across workspace

#### npm Compatibility

- ✅ npm: prefix for importing any npm package
- ✅ Reads package.json for Node compat
- ✅ Supports npm lifecycle scripts
- ✅ Compatible with .npmrc for private registries
- ✅ Handles most npm packages (2M+ available)
- ⚠️ Some packages with native modules need shimming
- ⚠️ No support for package.json "exports" with conditions (yet)

#### JSR (JavaScript Registry)

- **Deno's native registry** at jsr.io
- TypeScript-first (auto-generates docs from types)
- Fast, modern, designed for ESM
- Scoring system for quality
- Free hosting and bandwidth

---

## Module System & Imports

### Bun

**Module Format:** CommonJS and ES Modules (both fully supported)

#### Import Syntax

```typescript
// ES Modules (preferred)
import { readFile } from 'fs/promises';
import chalk from 'chalk';
import type { User } from './types';

// CommonJS (fully supported)
const fs = require('fs');
const chalk = require('chalk');

// Dynamic imports
const module = await import('./dynamic.js');

// Import attributes (JSON, text, etc.)
import config from './config.json' with { type: 'json' };
import styles from './styles.css' with { type: 'css' };

// Bun-specific
import logo from './logo.svg';  // Auto-converts to data URL
import shader from './shader.wgsl';  // WGSL shaders as string
```

#### Module Resolution

**Algorithm:** Node.js-compatible with enhancements

**Resolution Order:**
1. **Package self-reference** (if inside package directory)
2. Local `node_modules/` (current directory)
3. Walk up directory tree checking `node_modules/` at each level
4. Global `node_modules/`
5. `NODE_PATH` (fallback)
6. Bun's built-in modules

**Special Features:**
- **Package self-reference**: Files inside a package can import using the package name
- **Automatic index resolution**: `import './dir'` → finds `index.ts`/`index.js`
- **Extension resolution**: Tries `.ts`, `.tsx`, `.js`, `.jsx`, `.mjs`, `.cjs`
- **Package exports**: Respects `exports` field in package.json
- **Conditional exports**: Supports `import`, `require`, `node`, `default` conditions

#### Path Mapping (tsconfig.json)

```json
{
  "compilerOptions": {
    "paths": {
      "@/*": ["./src/*"],
      "~/*": ["./*"],
      "@components/*": ["./src/components/*"]
    }
  }
}
```

- ✅ Bun respects tsconfig paths at runtime (no build needed)
- ⚠️ Package exports take precedence over paths (as of April 2025)

#### Module Caching

- Modules cached after first load (standard Node.js behavior)
- `Bun.reload()` to clear module cache
- Hot module reloading in development mode

---

### Deno

**Module Format:** ES Modules only (CommonJS via Node compat)

#### Import Syntax

```typescript
// URL imports (original Deno style)
import { serve } from "https://deno.land/std@0.217.0/http/server.ts";

// Bare specifiers (via import map)
import { assert } from "@std/assert";
import chalk from "chalk";  // npm package via import map

// npm: specifier (direct npm imports)
import express from "npm:express@^4.18.0";
import { S3Client } from "npm:@aws-sdk/client-s3";

// jsr: specifier (JSR registry)
import { format } from "jsr:@std/datetime";

// Local imports (relative)
import { User } from "./types.ts";
import config from "../config.json" with { type: "json" };

// Dynamic imports
const module = await import("./dynamic.ts");

// Import maps for aliasing
import utils from "@/utils";  // Defined in deno.json imports
```

#### Module Resolution

**Algorithm:** URL-based with import map support

**Resolution Order (with import map):**
1. Check import map `imports` field
2. Check import map `scopes` field (directory-specific overrides)
3. Resolve as URL (absolute or relative)
4. Check global cache
5. Download if not cached (HTTP/HTTPS URLs)

**Resolution Order (without import map):**
1. Resolve as URL (absolute or relative)
2. Check global cache
3. Download if not cached

**Special Features:**
- **URL imports**: Can import directly from URLs (no install needed)
- **Import maps**: Centralized dependency management
- **Scoped imports**: Per-directory import overrides
- **Subpath imports**: Map packages to specific exports
- **Version locking**: Lock file ensures exact versions
- **No self-reference issues**: URLs prevent ambiguity

#### Import Maps (deno.json)

```json
{
  "imports": {
    // Bare specifiers
    "std/": "https://deno.land/std@0.217.0/",

    // npm packages
    "chalk": "npm:chalk@5.3.0",

    // Path aliases
    "@/": "./src/",

    // Specific modules
    "utils": "./src/utils/index.ts"
  },

  // Scoped overrides (per-directory)
  "scopes": {
    "./tests/": {
      // In tests/, this import resolves differently
      "@/config": "./tests/fixtures/config.ts"
    },
    "./scripts/": {
      "chalk": "npm:chalk@4.0.0"  // Different version in scripts
    }
  }
}
```

**Key Benefits:**
- ✅ Full control over module resolution
- ✅ No self-reference ambiguity
- ✅ Can override per directory
- ✅ Mix npm, JSR, URLs, and local files
- ✅ Version pinning at config level

#### Module Caching

- Remote modules cached in `$DENO_DIR/deps/`
- Cache is content-addressed (immutable)
- Lock file ensures cache integrity
- `deno cache --reload` to force re-download
- No runtime re-downloading (unless --reload)

---

## Configuration Files

### Bun

#### package.json

```json
{
  "name": "my-app",
  "version": "1.0.0",
  "type": "module",  // or "commonjs"

  // Dependencies
  "dependencies": {
    "express": "^4.18.0"
  },
  "devDependencies": {
    "@types/node": "^20.0.0"
  },
  "peerDependencies": {
    "react": "^18.0.0"
  },
  "optionalDependencies": {
    "fsevents": "^2.3.0"
  },

  // Package metadata
  "main": "./index.js",
  "module": "./index.mjs",
  "types": "./index.d.ts",
  "exports": {
    ".": {
      "import": "./index.mjs",
      "require": "./index.js",
      "types": "./index.d.ts"
    },
    "./utils": "./utils/index.js"
  },

  // Scripts
  "scripts": {
    "start": "bun run index.ts",
    "dev": "bun --watch index.ts",
    "build": "bun build --compile index.ts",
    "test": "bun test"
  },

  // Bun-specific
  "bun": {
    "preload": ["./setup.ts"]
  },

  // Workspaces
  "workspaces": ["packages/*"]
}
```

#### bunfig.toml

```toml
# Runtime configuration
[runtime]
smol = false                    # Reduce memory usage
logLevel = "warn"              # "debug" | "warn" | "error"

# JSX configuration
jsx = "react"
jsxFactory = "h"
jsxFragment = "Fragment"
jsxImportSource = "react"

# Define globals
[define]
"process.env.NODE_ENV" = "'production'"

# Loader configuration
[loader]
".png" = "file"
".svg" = "dataurl"

# Install configuration
[install]
registry = "https://registry.npmjs.org/"
linker = "hoisted"             # "hoisted" | "isolated"
exact = false
dev = true
optional = true
peer = true
cache = "~/.bun/install/cache"
globalDir = "~/.bun/install/global"
globalBinDir = "~/.bun/bin"

# Scoped registries
[install.scopes]
"@myorg" = { url = "https://registry.example.com/", token = "$NPM_TOKEN" }

# Test configuration
[test]
root = "."
preload = ["./test-setup.ts"]
coverage = false
coverageThreshold = { line = 80, function = 80, statement = 80 }
coverageDir = "./coverage"
smol = false

# Run configuration (scripts)
[run]
shell = "bun"                  # "bun" | "system"
```

#### tsconfig.json

```json
{
  "compilerOptions": {
    // Bun reads and respects these at runtime
    "target": "ESNext",
    "module": "ESNext",
    "moduleResolution": "bundler",  // or "node"
    "types": ["bun-types"],

    // Path mapping (works at runtime!)
    "paths": {
      "@/*": ["./src/*"],
      "~/*": ["./*"]
    },

    // JSX
    "jsx": "react-jsx",
    "jsxImportSource": "react",

    // Other
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "resolveJsonModule": true
  }
}
```

---

### Deno

#### deno.json

```json
{
  // Import map
  "imports": {
    "std/": "https://deno.land/std@0.217.0/",
    "@/": "./src/",
    "chalk": "npm:chalk@5.3.0"
  },

  // Scoped imports
  "scopes": {
    "./tests/": {
      "@/": "./tests/fixtures/"
    }
  },

  // TypeScript compiler options
  "compilerOptions": {
    "strict": true,
    "lib": ["deno.window", "deno.unstable"],
    "jsx": "react-jsx",
    "jsxImportSource": "react"
  },

  // Lint configuration
  "lint": {
    "include": ["src/"],
    "exclude": ["build/", "vendor/"],
    "rules": {
      "tags": ["recommended"],
      "include": ["ban-untagged-todo"],
      "exclude": ["no-unused-vars"]
    }
  },

  // Format configuration
  "fmt": {
    "useTabs": false,
    "lineWidth": 100,
    "indentWidth": 2,
    "singleQuote": true,
    "include": ["src/"],
    "exclude": ["build/"]
  },

  // Test configuration
  "test": {
    "include": ["src/**/*_test.ts"],
    "exclude": ["src/fixtures/"]
  },

  // Task runner (like npm scripts)
  "tasks": {
    "start": "deno run --allow-net main.ts",
    "dev": "deno run --watch --allow-net main.ts",
    "test": "deno test --allow-read",
    "build": "deno compile --output=app main.ts"
  },

  // Workspace configuration
  "workspace": ["./packages/a", "./packages/b"],

  // Node modules
  "nodeModulesDir": "auto",  // true | false | "auto"

  // Lock file
  "lock": true,  // or "./custom-lock.json" or false

  // Vendor directory (optional)
  "vendor": false,

  // Unstable features
  "unstable": ["kv", "cron", "temporal"],

  // Permissions (can be set in config for convenience)
  "permissions": {
    "read": ["./data"],
    "write": ["./logs"],
    "net": ["api.example.com"],
    "env": ["HOME", "PATH"]
  },

  // npm registry
  "npmRegistry": "https://registry.npmjs.org",

  // Exclude from type checking
  "exclude": ["build/", "vendor/", "node_modules/"]
}
```

#### deno.lock

```json
{
  "version": "3",
  "remote": {
    "https://deno.land/std@0.217.0/assert/mod.ts": "hash...",
    "https://deno.land/std@0.217.0/http/server.ts": "hash..."
  },
  "npm": {
    "chalk@5.3.0": {
      "integrity": "sha512-...",
      "dependencies": {}
    }
  }
}
```

#### package.json (Node compat mode)

```json
{
  "name": "my-deno-app",
  "version": "1.0.0",
  "type": "module",

  // Can mix with deno.json
  "dependencies": {
    "express": "^4.18.0"
  },

  // Deno respects these scripts
  "scripts": {
    "start": "deno run --allow-net main.ts"
  }
}
```

**How Deno uses package.json:**
- If `package.json` exists, Deno creates `node_modules/`
- npm dependencies added with `deno add npm:pkg` go to package.json
- JSR dependencies go to deno.json
- Both files can coexist

---

## Core APIs

### Bun

#### Global Objects

```typescript
// Bun namespace (Bun-specific APIs)
Bun.version                    // "1.3.0"
Bun.revision                   // Git commit hash
Bun.env                        // Process environment (same as process.env)
Bun.main                       // Entry point file path
Bun.argv                       // Command-line arguments
Bun.sleep(ms)                  // Async sleep
Bun.sleepSync(ms)             // Sync sleep
Bun.which(bin)                 // Find binary in PATH (like Unix which)
Bun.peek(promise)              // Check promise status without awaiting
Bun.openInEditor(file, opts)   // Open file in editor
Bun.deepEquals(a, b)           // Deep equality check (fast)
Bun.escapeHTML(str)            // Escape HTML entities
Bun.fileURLToPath(url)         // Convert file:// URL to path
Bun.pathToFileURL(path)        // Convert path to file:// URL
Bun.gzipSync(data)             // Sync gzip compression
Bun.gunzipSync(data)           // Sync gzip decompression
Bun.deflateSync(data)          // Sync deflate compression
Bun.inflateSync(data)          // Sync inflate decompression

// Standard globals
console                        // Console logging
process                        // Process info (Node.js compatible)
Buffer                         // Binary data (Node.js Buffer)
global                         // Global object
setTimeout, setInterval        // Timers
fetch                          // HTTP client (Web standard)
WebSocket                      // WebSocket client
crypto                         // Web Crypto API
```

#### Main Bun APIs

```typescript
// File I/O
Bun.file(path)                 // Create lazy file reference
Bun.write(dest, data)          // Write file
await Bun.write("out.txt", "hello");
await Bun.write(Bun.stdout, "hello");

// File operations
const file = Bun.file("input.txt");
await file.exists()            // Check if exists
await file.text()              // Read as text
await file.json()              // Read as JSON
await file.arrayBuffer()       // Read as ArrayBuffer
file.stream()                  // Read as stream
file.size                      // File size
file.type                      // MIME type

// Spawn processes
Bun.spawn(cmd, opts)           // Spawn subprocess
Bun.spawnSync(cmd, opts)       // Sync spawn

// Shell (cross-platform)
import { $ } from "bun";
await $`ls -la`;
await $`git status`;
const output = await $`echo hello`.text();

// Hash functions
Bun.hash(data)                 // Fast hash (CityHash)
Bun.hash.wyhash(data, seed)    // Wyhash
Bun.hash.crc32(data)           // CRC32
Bun.hash.adler32(data)         // Adler32

// Password hashing
await Bun.password.hash(pwd)   // Argon2 hash
await Bun.password.verify(pwd, hash)  // Verify

// SQLite
import { Database } from "bun:sqlite";
const db = new Database(":memory:");
db.query("SELECT * FROM users WHERE id = ?").all(1);

// FFI (Foreign Function Interface)
import { dlopen, FFIType, suffix } from "bun:ffi";
const lib = dlopen(`./lib.${suffix}`, { add: { args: [FFIType.i32, FFIType.i32], returns: FFIType.i32 } });
```

---

### Deno

#### Global Objects

```typescript
// Deno namespace (Deno-specific APIs)
Deno.version                   // { deno: "2.5.0", v8: "...", typescript: "..." }
Deno.args                      // Command-line arguments
Deno.env.get(key)              // Environment variable
Deno.env.set(key, value)       // Set environment variable
Deno.env.toObject()            // All env vars as object
Deno.pid                       // Process ID
Deno.ppid                      // Parent process ID
Deno.noColor                   // Whether NO_COLOR is set
Deno.exit(code)                // Exit process
Deno.stdin                     // Standard input
Deno.stdout                    // Standard output
Deno.stderr                    // Standard error
Deno.mainModule                // Entry point URL
Deno.memoryUsage()             // Memory usage stats
Deno.inspect(value, opts)      // Format value for display

// Standard globals
console                        // Console logging
queueMicrotask                 // Queue microtask
setTimeout, setInterval        // Timers
fetch                          // HTTP client (Web standard)
WebSocket                      // WebSocket client
crypto                         // Web Crypto API
```

#### Main Deno APIs

```typescript
// File System
await Deno.readTextFile(path)           // Read text file
await Deno.readFile(path)               // Read binary file
await Deno.writeTextFile(path, data)    // Write text file
await Deno.writeFile(path, data)        // Write binary file
await Deno.readDir(path)                // Read directory
await Deno.mkdir(path)                  // Create directory
await Deno.remove(path)                 // Remove file/dir
await Deno.rename(old, new)             // Rename/move
await Deno.stat(path)                   // File info
await Deno.open(path, opts)             // Open file handle
await Deno.copy(src, dest)              // Copy streams

// Processes
const command = new Deno.Command("ls", {
  args: ["-la"],
  stdout: "piped",
  stderr: "piped"
});
const { code, stdout, stderr } = await command.output();

// Or spawn for streaming
const child = command.spawn();
await child.status;

// Permissions
await Deno.permissions.query({ name: "read", path: "./data" });
await Deno.permissions.request({ name: "net", host: "api.example.com" });
await Deno.permissions.revoke({ name: "read" });

// Network
const listener = Deno.listen({ port: 8000 });
for await (const conn of listener) {
  handleConnection(conn);
}

// HTTP Server
Deno.serve({ port: 8000 }, (req) => {
  return new Response("Hello World");
});

// KV (built-in key-value store)
const kv = await Deno.openKv();
await kv.set(["users", "123"], { name: "Alice" });
const entry = await kv.get(["users", "123"]);
await kv.delete(["users", "123"]);

// Cron (scheduled tasks)
Deno.cron("cleanup", "0 0 * * *", () => {
  // Runs daily at midnight
});

// FFI (Foreign Function Interface)
const lib = Deno.dlopen("./lib.so", {
  add: { parameters: ["i32", "i32"], result: "i32" }
});
lib.symbols.add(1, 2);
```

---

## File System

### Bun

#### File APIs

```typescript
import { exists, mkdir, readdir, unlink } from 'fs/promises';
import { existsSync } from 'fs';

// Bun.file - Recommended Bun way
const file = Bun.file("input.txt");

// Check existence
await file.exists()            // true/false
file.size                      // File size in bytes
file.type                      // MIME type

// Reading
await file.text()              // UTF-8 text
await file.json()              // Parse JSON
await file.arrayBuffer()       // Binary data
file.stream()                  // ReadableStream
await file.bytes()             // Uint8Array

// Writing (Bun.write)
await Bun.write("output.txt", "Hello");
await Bun.write("data.json", JSON.stringify(obj));
await Bun.write("binary.dat", new Uint8Array([1, 2, 3]));

// Append
const writer = Bun.file("log.txt").writer();
writer.write("Line 1\n");
writer.write("Line 2\n");
await writer.end();

// Copy
await Bun.write("dest.txt", Bun.file("src.txt"));

// Node.js APIs (also supported)
import fs from 'fs';
import { readFile, writeFile, mkdir, readdir } from 'fs/promises';

const content = await readFile('file.txt', 'utf-8');
await writeFile('file.txt', 'content');
await mkdir('newdir', { recursive: true });
const files = await readdir('dir');

// Glob (built-in)
import { Glob } from "bun";

const glob = new Glob("**/*.ts");
for await (const file of glob.scan(".")) {
  console.log(file);  // Yields matched file paths
}

// Can also get as array
const files = await Array.fromAsync(glob.scan("."));
```

#### Performance

- **Bun.file()** is heavily optimized with zero-copy operations
- **Bun.write()** is faster than fs.writeFile
- Automatic chunking for large files
- Native system calls for maximum speed

---

### Deno

#### File APIs

```typescript
// Reading
const text = await Deno.readTextFile("input.txt");
const data = await Deno.readFile("binary.dat");  // Uint8Array

// Writing
await Deno.writeTextFile("output.txt", "Hello");
await Deno.writeFile("binary.dat", new Uint8Array([1, 2, 3]));

// Appending
await Deno.writeTextFile("log.txt", "Line\n", { append: true });

// File info
const info = await Deno.stat("file.txt");
console.log(info.size, info.isFile, info.mtime);

// Check existence
try {
  await Deno.stat("file.txt");
  // exists
} catch {
  // doesn't exist
}

// Copy file
await Deno.copyFile("src.txt", "dest.txt");

// Move/rename
await Deno.rename("old.txt", "new.txt");

// Remove
await Deno.remove("file.txt");
await Deno.remove("dir", { recursive: true });

// Directory operations
await Deno.mkdir("newdir", { recursive: true });
for await (const entry of Deno.readDir("dir")) {
  console.log(entry.name, entry.isFile);
}

// File handles (advanced)
const file = await Deno.open("file.txt", { read: true, write: true });
const buffer = new Uint8Array(1024);
await file.read(buffer);
await file.write(new TextEncoder().encode("data"));
file.close();

// Temp files
const tempDir = await Deno.makeTempDir();
const tempFile = await Deno.makeTempFile();

// Watch files
const watcher = Deno.watchFs("./src");
for await (const event of watcher) {
  console.log(event.kind, event.paths);
}

// Glob (std library)
import { expandGlob } from "jsr:@std/fs";

for await (const file of expandGlob("**/*.ts")) {
  console.log(file.path);
}
```

#### Permissions Required

```bash
deno run --allow-read=. --allow-write=./output script.ts
```

- `--allow-read` - Read access
- `--allow-write` - Write access
- `--allow-read=./data` - Specific directory only

---

## HTTP & Networking

### Bun

#### HTTP Server (Bun.serve)

```typescript
// Basic server
Bun.serve({
  port: 3000,
  fetch(req) {
    return new Response("Hello World");
  }
});

// Full options
Bun.serve({
  port: 3000,
  hostname: "0.0.0.0",

  fetch(req, server) {
    const url = new URL(req.url);

    if (url.pathname === "/") {
      return new Response("Home");
    }

    if (url.pathname === "/json") {
      return Response.json({ hello: "world" });
    }

    if (url.pathname === "/ws" && server.upgrade(req)) {
      return;  // WebSocket upgraded
    }

    return new Response("Not Found", { status: 404 });
  },

  // WebSocket handlers
  websocket: {
    open(ws) {
      console.log("WebSocket opened");
    },
    message(ws, message) {
      ws.send(`Echo: ${message}`);
    },
    close(ws, code, reason) {
      console.log("WebSocket closed");
    },
    drain(ws) {
      // Backpressure handled
    }
  },

  // Error handler
  error(error) {
    return new Response("Server Error", { status: 500 });
  },

  // TLS
  tls: {
    cert: Bun.file("cert.pem"),
    key: Bun.file("key.pem")
  },

  // Advanced
  maxRequestBodySize: 1024 * 1024 * 10,  // 10MB
  development: process.env.NODE_ENV !== "production"
});

// Performance features
// - Automatic HTTP/1.1 and HTTP/2 support
// - Async request/response streaming
// - WebSocket compression
// - Backpressure handling
// - Keep-alive connections
```

#### HTTP Client (fetch)

```typescript
// Basic fetch (Web standard)
const response = await fetch("https://api.example.com/data");
const json = await response.json();

// With options
const response = await fetch("https://api.example.com/users", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "Authorization": "Bearer token"
  },
  body: JSON.stringify({ name: "Alice" })
});

// Bun extensions
fetch("https://example.com", {
  // Proxy
  proxy: "http://proxy.example.com:8080",

  // TLS
  tls: {
    rejectUnauthorized: false
  },

  // Timeout
  signal: AbortSignal.timeout(5000),

  // Verbose logging
  verbose: true
});

// Streaming uploads
const file = Bun.file("large-file.bin");
await fetch("https://upload.example.com", {
  method: "POST",
  body: file.stream()
});

// Streaming downloads
const response = await fetch("https://example.com/large-file.bin");
await Bun.write("downloaded.bin", response.body);
```

#### WebSocket Client

```typescript
const ws = new WebSocket("ws://localhost:3000");

ws.addEventListener("open", () => {
  ws.send("Hello");
});

ws.addEventListener("message", (event) => {
  console.log("Received:", event.data);
});

ws.addEventListener("close", () => {
  console.log("Connection closed");
});
```

---

### Deno

#### HTTP Server (Deno.serve)

```typescript
// Basic server
Deno.serve({ port: 3000 }, (req) => {
  return new Response("Hello World");
});

// Full options
Deno.serve({
  port: 3000,
  hostname: "0.0.0.0",

  handler(req, info) {
    const url = new URL(req.url);

    if (url.pathname === "/") {
      return new Response("Home");
    }

    if (url.pathname === "/json") {
      return Response.json({ hello: "world" });
    }

    if (url.pathname === "/ws") {
      const { socket, response } = Deno.upgradeWebSocket(req);

      socket.onopen = () => console.log("WebSocket opened");
      socket.onmessage = (e) => socket.send(`Echo: ${e.data}`);
      socket.onclose = () => console.log("WebSocket closed");

      return response;
    }

    return new Response("Not Found", { status: 404 });
  },

  // Error handler
  onError(error) {
    return new Response("Server Error", { status: 500 });
  },

  // TLS
  cert: Deno.readTextFileSync("cert.pem"),
  key: Deno.readTextFileSync("key.pem"),

  // HTTP/2
  alpnProtocols: ["h2", "http/1.1"]
});

// Alternative: Oak framework (like Express)
import { Application } from "jsr:@oak/oak";

const app = new Application();

app.use((ctx) => {
  ctx.response.body = "Hello World";
});

await app.listen({ port: 3000 });
```

#### HTTP Client (fetch)

```typescript
// Basic fetch (Web standard)
const response = await fetch("https://api.example.com/data");
const json = await response.json();

// With options
const response = await fetch("https://api.example.com/users", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "Authorization": "Bearer token"
  },
  body: JSON.stringify({ name: "Alice" })
});

// Timeout
const controller = new AbortController();
setTimeout(() => controller.abort(), 5000);

const response = await fetch("https://example.com", {
  signal: controller.signal
});

// Streaming uploads
const file = await Deno.open("large-file.bin");
await fetch("https://upload.example.com", {
  method: "POST",
  body: file.readable
});

// Streaming downloads
const response = await fetch("https://example.com/large-file.bin");
const file = await Deno.create("downloaded.bin");
await response.body.pipeTo(file.writable);
```

#### WebSocket Client

```typescript
const ws = new WebSocket("ws://localhost:3000");

ws.onopen = () => {
  ws.send("Hello");
};

ws.onmessage = (event) => {
  console.log("Received:", event.data);
};

ws.onclose = () => {
  console.log("Connection closed");
};
```

---

## Process & Shell Execution

### Bun

#### Bun Shell (Built-in)

```typescript
import { $ } from "bun";

// Basic commands
await $`ls -la`;
await $`git status`;

// Capture output
const output = await $`echo hello`.text();
const json = await $`cat data.json`.json();
const buffer = await $`cat file.bin`.arrayBuffer();

// Piping
await $`cat file.txt | grep pattern | wc -l`;
await $`ls | sort | head -n 10`;

// Redirection
await $`echo hello > output.txt`;
await $`cat input.txt | grep error > errors.txt 2>&1`;

// Environment variables
await $`export VAR=value && echo $VAR`;

// Conditional execution
await $`make && make test && make install`;
await $`command || echo "Failed"`;

// Background jobs
$`long-running-task &`;

// Command substitution
await $`echo Current dir: $(pwd)`;
const rev = await $`git rev-parse HEAD`.text();

// Escaping (automatic by default)
const userInput = "file; rm -rf /";  // Dangerous
await $`cat ${userInput}`;  // Safe - treated as single argument

// Disable escaping (if needed)
await $`${$`echo "raw command"`}`;

// Error handling
try {
  await $`false`;  // Command that fails
} catch (error) {
  console.log(error.exitCode);  // 1
  console.log(error.stderr);    // Error output
}

// Check exit code without throwing
const { exitCode } = await $`command`.nothrow();

// Built-in commands (cross-platform)
await $`cd /tmp && pwd`;        // cd
await $`ls -la`;                 // ls
await $`rm -rf temp/`;           // rm
await $`echo "Hello World"`;     // echo
await $`pwd`;                    // pwd
await $`cat file.txt`;           // cat
await $`touch newfile.txt`;      // touch
await $`mkdir -p dir/subdir`;    // mkdir
await $`mv old.txt new.txt`;     // mv
await $`which node`;             // which
```

**Built-in Commands:**
- cd, ls, rm, echo, pwd, cat, touch, mkdir, mv, which, exit, true, false, yes, seq, dirname, basename

**Cross-platform:** Works identically on Windows, macOS, Linux

#### Bun.spawn (Lower-level)

```typescript
// Basic spawn
const proc = Bun.spawn(["ls", "-la"], {
  cwd: "/tmp",
  env: { ...process.env, CUSTOM: "value" },
  stdout: "pipe",
  stderr: "pipe"
});

// Wait for completion
await proc.exited;
console.log(proc.exitCode);

// Read output
const text = await new Response(proc.stdout).text();
const error = await new Response(proc.stderr).text();

// Streaming
for await (const chunk of proc.stdout) {
  process.stdout.write(chunk);
}

// Kill process
proc.kill();

// Sync version
const result = Bun.spawnSync(["ls", "-la"], {
  stdout: "pipe"
});
console.log(result.stdout.toString());
```

---

### Deno

#### Deno.Command (Built-in)

```typescript
// Basic command
const command = new Deno.Command("ls", {
  args: ["-la"],
  cwd: "/tmp",
  env: { CUSTOM: "value" },
  stdout: "piped",
  stderr: "piped"
});

// Execute and wait
const { code, stdout, stderr } = await command.output();
const text = new TextDecoder().decode(stdout);
console.log("Exit code:", code);

// Spawn for streaming
const child = command.spawn();

// Stream output
for await (const chunk of child.stdout) {
  await Deno.stdout.write(chunk);
}

// Wait for completion
const status = await child.status;
console.log("Exit code:", status.code);

// Kill process
child.kill();

// Stdin piping
const cmd = new Deno.Command("cat", { stdin: "piped", stdout: "piped" });
const child = cmd.spawn();
const writer = child.stdin.getWriter();
await writer.write(new TextEncoder().encode("hello\n"));
await writer.close();

// Success status
const status = await child.status;
console.log(status.success);  // true if exit code === 0
```

#### dax (Third-party Shell Library)

```typescript
import $ from "jsr:@david/dax";

// Similar to Bun shell
await $`ls -la`;
await $`git status`;

// Capture output
const output = await $`echo hello`.text();

// Piping
await $`cat file.txt | grep pattern | wc -l`;

// Redirection
await $`echo hello > output.txt`;

// Command substitution
const rev = await $`git rev-parse HEAD`.text();

// Error handling
try {
  await $`false`;
} catch (error) {
  console.log(error.code);
}

// Cross-platform commands
await $`cat file.txt`;  // Works on Windows too
```

**Note:** dax provides similar DX to Bun shell but requires installation

#### deno task (Task Runner)

```json
// deno.json
{
  "tasks": {
    "dev": "deno run --watch --allow-net main.ts",
    "build": "deno compile --output=app main.ts",
    "deploy": "echo $(git rev-parse HEAD) && ./deploy.sh"
  }
}
```

```bash
# Run tasks
deno task dev
deno task build

# Command substitution in tasks
deno task --eval "echo $(pwd)"
```

---

## TypeScript Support

### Bun

**Features:**
- ✅ Native TypeScript execution (no transpile step visible)
- ✅ JSX/TSX support out of the box
- ✅ Reads tsconfig.json at runtime
- ✅ Path mapping works at runtime
- ✅ Respects `compilerOptions`
- ✅ Type checking optional (--check flag)

**Configuration:**

```json
// tsconfig.json
{
  "compilerOptions": {
    "target": "ESNext",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "types": ["bun-types"],
    "strict": true,
    "jsx": "react-jsx",
    "jsxImportSource": "react",
    "paths": {
      "@/*": ["./src/*"]
    }
  }
}
```

**Type Checking:**

```bash
bun run script.ts              # No type checking (fast)
bun --check script.ts          # Type check before running
bun --watch script.ts          # Watch mode
tsc --noEmit                   # Separate type checking
```

**JSX:**

```typescript
// Works without any configuration
const el = <div>Hello</div>;

// Custom JSX
/** @jsxImportSource preact */
const el = <div>Hello</div>;
```

**Types:**

```bash
bun add -d @types/bun          # Bun types
bun add -d @types/node         # Node.js types
```

**Declaration Files:**
- Generates .d.ts files with `bun build --emit-dts`
- Respects `declaration` in tsconfig.json

---

### Deno

**Features:**
- ✅ Native TypeScript execution
- ✅ JSX/TSX support out of the box
- ✅ Built-in type checker (uses official TypeScript)
- ✅ Reads tsconfig.json automatically
- ✅ No @types/* packages needed (built-in types)
- ✅ Type checking by default (can disable)

**Configuration:**

```json
// deno.json
{
  "compilerOptions": {
    "strict": true,
    "lib": ["deno.window", "deno.unstable"],
    "jsx": "react-jsx",
    "jsxImportSource": "react"
  }
}
```

**Type Checking:**

```bash
deno run script.ts             # Type checks by default
deno run --no-check script.ts  # Skip type checking (faster)
deno check script.ts           # Type check only (no run)
deno cache --reload script.ts  # Re-cache with type check
```

**JSX:**

```typescript
// Configured in deno.json
const el = <div>Hello</div>;

// Or with pragma
/** @jsxImportSource preact */
const el = <div>Hello</div>;
```

**Types:**

```typescript
// Built-in types (no installation needed)
import { assert } from "jsr:@std/assert";  // Auto-typed

// npm packages get types automatically if available
import chalk from "npm:chalk";  // Types included
```

**Type Inference:**
- Triple-slash directives supported
- Can augment global types
- Full IntelliSense in editors

---

## Testing Framework

### Bun

**Built-in Test Runner:** `bun test`

```typescript
import { test, expect, describe, beforeAll, afterAll, beforeEach, afterEach } from "bun:test";

// Basic test
test("addition", () => {
  expect(1 + 1).toBe(2);
});

// Async test
test("async operation", async () => {
  const result = await fetchData();
  expect(result).toBeDefined();
});

// Describe blocks
describe("Math operations", () => {
  test("addition", () => {
    expect(2 + 2).toBe(4);
  });

  test("multiplication", () => {
    expect(2 * 3).toBe(6);
  });
});

// Lifecycle hooks
beforeAll(() => {
  // Runs once before all tests
});

afterAll(() => {
  // Runs once after all tests
});

beforeEach(() => {
  // Runs before each test
});

afterEach(() => {
  // Runs after each test
});

// Skip tests
test.skip("not ready yet", () => {
  // Skipped
});

// Only run specific tests
test.only("focus on this", () => {
  // Only this runs
});

// Timeouts
test("slow operation", async () => {
  await slowFunction();
}, { timeout: 5000 });

// Matchers
expect(value).toBe(expected);
expect(value).toEqual(expected);
expect(value).toBeNull();
expect(value).toBeUndefined();
expect(value).toBeDefined();
expect(value).toBeTruthy();
expect(value).toBeFalsy();
expect(number).toBeGreaterThan(5);
expect(number).toBeLessThan(10);
expect(string).toContain("substring");
expect(array).toHaveLength(3);
expect(object).toHaveProperty("key");
expect(fn).toThrow();
expect(promise).resolves.toBe(value);
expect(promise).rejects.toThrow();

// Mocking
import { mock, spyOn } from "bun:test";

const mockFn = mock((a, b) => a + b);
mockFn(1, 2);
expect(mockFn).toHaveBeenCalled();
expect(mockFn).toHaveBeenCalledWith(1, 2);
expect(mockFn).toHaveBeenCalledTimes(1);

// Spy on object methods
const spy = spyOn(obj, "method");
obj.method();
expect(spy).toHaveBeenCalled();

// Snapshots
expect(data).toMatchSnapshot();
```

**Running Tests:**

```bash
bun test                       # Run all tests
bun test file.test.ts          # Run specific file
bun test --watch               # Watch mode
bun test --coverage            # Coverage report
bun test --timeout 30000       # Global timeout
```

**Configuration:**

```toml
# bunfig.toml
[test]
preload = ["./test-setup.ts"]
coverage = true
coverageDir = "./coverage"
coverageThreshold = { line = 80, function = 80 }
```

---

### Deno

**Built-in Test Runner:** `deno test`

```typescript
import { assertEquals, assertExists, assertThrows } from "jsr:@std/assert";

// Basic test
Deno.test("addition", () => {
  assertEquals(1 + 1, 2);
});

// Async test
Deno.test("async operation", async () => {
  const result = await fetchData();
  assertExists(result);
});

// Test with options
Deno.test({
  name: "slow operation",
  async fn() {
    await slowFunction();
  },
  timeout: 5000,
  ignore: false,
  permissions: {
    read: true,
    net: ["api.example.com"]
  }
});

// Grouped tests
Deno.test("Math operations", async (t) => {
  await t.step("addition", () => {
    assertEquals(2 + 2, 4);
  });

  await t.step("multiplication", () => {
    assertEquals(2 * 3, 6);
  });
});

// Skip tests
Deno.test({
  name: "not ready yet",
  ignore: true,
  fn() {
    // Skipped
  }
});

// Only run on specific platforms
Deno.test({
  name: "Windows-only test",
  ignore: Deno.build.os !== "windows",
  fn() {
    // ...
  }
});

// Assertions (from @std/assert)
assertEquals(actual, expected);
assertNotEquals(actual, expected);
assertStrictEquals(actual, expected);  // === comparison
assert(condition);
assertExists(value);
assertThrows(() => { throw new Error(); });
assertRejects(async () => { throw new Error(); });
assertArrayIncludes([1, 2, 3], [1, 2]);
assertMatch("hello world", /hello/);
assertObjectMatch({ a: 1, b: 2 }, { a: 1 });

// BDD style (from @std/testing)
import { describe, it, beforeAll, afterAll, beforeEach, afterEach } from "jsr:@std/testing/bdd";

describe("Math operations", () => {
  beforeAll(() => {
    // Setup
  });

  it("should add numbers", () => {
    assertEquals(1 + 1, 2);
  });
});

// Mocking (from @std/testing)
import { spy, stub, assertSpyCalls } from "jsr:@std/testing/mock";

const spyFn = spy();
spyFn(1, 2);
assertSpyCalls(spyFn, 1);

const stubFn = stub(obj, "method", () => "mocked");
obj.method();  // Returns "mocked"
stubFn.restore();

// Snapshots (from @std/testing)
import { assertSnapshot } from "jsr:@std/testing/snapshot";

Deno.test("snapshot test", async (t) => {
  await assertSnapshot(t, data);
});
```

**Running Tests:**

```bash
deno test                      # Run all tests
deno test file_test.ts         # Run specific file
deno test --watch              # Watch mode
deno test --coverage           # Coverage report
deno test --parallel           # Parallel execution
deno test --filter "pattern"   # Filter tests by name
deno test --permissions        # Show permissions tests need
```

**Configuration:**

```json
// deno.json
{
  "test": {
    "include": ["src/**/*_test.ts"],
    "exclude": ["src/fixtures/"]
  }
}
```

---

## Built-in Tools

### Bun

#### Package Manager
```bash
bun install                    # Install dependencies
bun add <package>              # Add package
bun remove <package>           # Remove package
bun update                     # Update packages
bun link                       # Link packages
```

#### Bundler
```bash
bun build ./index.ts --outdir ./dist
bun build --compile            # Compile to executable
bun build --minify             # Minify output
bun build --sourcemap          # Generate sourcemaps
bun build --target browser     # Target browser
bun build --target node        # Target Node.js
```

#### Test Runner
```bash
bun test                       # Run tests
bun test --watch               # Watch mode
bun test --coverage            # Coverage
```

#### Development Server
```bash
bun --watch server.ts          # Watch and reload
bun --hot server.ts            # Hot reload
```

#### REPL
```bash
bun repl                       # Interactive shell
bun                            # Also starts REPL
```

#### Database CLI (Bun 1.3+)
```bash
# SQLite
bun:sqlite                     # Built-in

# MySQL/MariaDB (Bun.SQL)
import { Database } from "bun:sql";
const db = Database.connect("mysql://localhost/db");

# Redis (built-in)
import { Redis } from "bun:redis";
const redis = new Redis();
```

#### Upgrade
```bash
bun upgrade                    # Upgrade Bun itself
bun upgrade --canary           # Upgrade to canary
```

---

### Deno

#### Package Manager
```bash
deno add <package>             # Add package
deno remove <package>          # Remove package
deno install                   # Install dependencies
deno cache <file>              # Cache dependencies
```

#### Bundler
```bash
deno bundle main.ts bundle.js  # DEPRECATED (use esbuild instead)
```

#### Compiler
```bash
deno compile main.ts           # Compile to executable
deno compile --output app main.ts
deno compile --target x86_64-pc-windows-msvc main.ts
```

#### Test Runner
```bash
deno test                      # Run tests
deno test --watch              # Watch mode
deno test --coverage           # Coverage
deno test --parallel           # Parallel
```

#### Formatter
```bash
deno fmt                       # Format all files
deno fmt --check               # Check formatting
deno fmt file.ts               # Format specific file
```

#### Linter
```bash
deno lint                      # Lint all files
deno lint --fix                # Auto-fix issues
deno lint file.ts              # Lint specific file
```

#### Documentation Generator
```bash
deno doc main.ts               # Show docs
deno doc --html main.ts        # Generate HTML docs
deno doc --json main.ts        # Generate JSON docs
```

#### Benchmarking
```bash
deno bench                     # Run benchmarks
```

#### Task Runner
```bash
deno task dev                  # Run task from deno.json
deno task --eval "echo hello"  # Evaluate shell command
```

#### REPL
```bash
deno repl                      # Interactive shell
deno                           # Also starts REPL
```

#### Upgrade
```bash
deno upgrade                   # Upgrade Deno itself
deno upgrade --canary          # Upgrade to canary
deno upgrade --version 2.0.0   # Specific version
```

#### Vendor
```bash
deno vendor main.ts            # Copy deps to vendor/
```

#### Info
```bash
deno info                      # Show Deno info
deno info main.ts              # Show file dependency tree
```

#### Coverage
```bash
deno coverage cov/             # Show coverage report
deno coverage --html cov/      # HTML report
```

---

## Security Model

### Bun

**Philosophy:** Trust-based (like Node.js)

**Permissions:** None - all operations allowed by default

**Security Features:**
- ❌ No permission system
- ❌ No sandboxing
- ⚠️ Runs with full system access
- ✅ HTML escaping helper: `Bun.escapeHTML()`
- ✅ Shell escaping: Template literals in `$` are escaped by default
- ✅ HTTPS certificate validation
- ✅ Web Crypto API for cryptographic operations

**Trust Model:**
- Assumes you trust the code you run
- Like Node.js - any script can do anything
- Security is developer responsibility

**Best Practices:**
- Validate user input
- Use parameterized queries
- Escape HTML output
- Review dependencies
- Use lock file for reproducibility

---

### Deno

**Philosophy:** Secure-by-default

**Permissions:** Explicit opt-in required

#### Permission Flags

```bash
# No permissions (default)
deno run script.ts

# File system
deno run --allow-read script.ts                    # Read all
deno run --allow-read=/data script.ts             # Read specific dir
deno run --allow-write script.ts                  # Write all
deno run --allow-write=/logs script.ts            # Write specific dir

# Network
deno run --allow-net script.ts                     # All network
deno run --allow-net=api.example.com script.ts    # Specific host
deno run --allow-net=:8000 script.ts              # Specific port

# Environment
deno run --allow-env script.ts                     # All env vars
deno run --allow-env=API_KEY script.ts            # Specific var

# Running subprocesses
deno run --allow-run script.ts                     # Run all commands
deno run --allow-run=git script.ts                # Run specific command

# FFI (native libraries)
deno run --allow-ffi script.ts

# High resolution time (for timing attacks prevention)
deno run --allow-hrtime script.ts

# All permissions (like Node.js)
deno run --allow-all script.ts
deno run -A script.ts                             # Shorthand
```

#### Permission Sets (Deno 2.5+)

```json
// deno.json
{
  "permissions": {
    "read": ["./data", "./config"],
    "write": ["./logs"],
    "net": ["api.example.com", ":8000"],
    "env": ["API_KEY", "DATABASE_URL"]
  }
}
```

```bash
# Use permissions from config
deno run --allow-permission-set script.ts
```

#### Runtime Permission APIs

```typescript
// Query permission status
const status = await Deno.permissions.query({
  name: "read",
  path: "./data"
});
console.log(status.state);  // "granted" | "denied" | "prompt"

// Request permission at runtime
const status = await Deno.permissions.request({
  name: "net",
  host: "api.example.com"
});

if (status.state === "granted") {
  await fetch("https://api.example.com/data");
}

// Revoke permission
await Deno.permissions.revoke({ name: "read" });
```

#### Permission Prompts

```bash
# Interactive mode (default in terminal)
deno run script.ts
# ⚠️  ┌ Deno requests read access to "/data".
#    ├ Requested by `Deno.readTextFile()` API.
#    ├ Learn more at: https://docs.deno.com/runtime/fundamentals/security
#    └ Allow? [y/n/A] (y = yes, allow; n = no, deny; A = allow all read permissions)
```

#### Security Benefits

- ✅ **Zero-trust by default** - Nothing works without explicit permission
- ✅ **Granular control** - Specific files, hosts, commands
- ✅ **Runtime prompts** - User can approve/deny at runtime
- ✅ **Audit trail** - Know exactly what permissions are used
- ✅ **Defense in depth** - Even if code is malicious, permissions limit damage
- ✅ **Configuration-based** - Permissions in deno.json for CI/production

---

## Performance

### Benchmarks (2025 Data)

#### Startup Time

| Runtime | Cold Start | Hot Start |
|---------|-----------|-----------|
| **Bun** | ~20ms | ~5ms |
| **Deno** | ~50ms | ~15ms |
| **Node.js** | ~100ms | ~30ms |

**Winner:** Bun (fastest startup)

#### HTTP Requests per Second

| Runtime | RPS | vs Bun |
|---------|-----|---------|
| **Bun** | 52,000 | 100% |
| **Deno** | 44,500 | 85% |
| **Node.js** | 34,000 | 65% |

**Winner:** Bun (17% faster than Deno)

#### Package Installation

| Operation | Bun | Deno | npm |
|-----------|-----|------|-----|
| Cold cache | 5s | 5.75s | 25s |
| Hot cache | 0.5s | 0.5s | 5s |

**Winner:** Tie (both 90% faster than npm with hot cache)

#### File I/O

| Operation | Bun | Deno | Node.js |
|-----------|-----|------|---------|
| Read 10MB | 12ms | 15ms | 20ms |
| Write 10MB | 15ms | 18ms | 25ms |

**Winner:** Bun (fastest I/O)

#### Summary

- **Fastest overall:** Bun
- **Close second:** Deno (within 15-20% of Bun)
- **Both much faster than Node.js**

### Performance Features

#### Bun
- Zero-copy architecture
- Native implementations in Zig
- JavaScriptCore engine (optimized for startup)
- Hardlinks for package management
- HTTP/2 and WebSocket optimizations

#### Deno
- Rust native implementations
- V8 engine (optimized for long-running)
- Tokio async runtime
- Zero-copy TypeScript transpilation
- Streaming everywhere

---

## Ecosystem Compatibility

### Bun

#### npm Ecosystem

**Compatibility:** ~90% of npm packages work

**What Works:**
- ✅ Pure JavaScript packages
- ✅ TypeScript packages
- ✅ Most native modules (via napi)
- ✅ Lifecycle scripts (postinstall, etc.)
- ✅ Workspaces
- ✅ .npmrc configuration
- ✅ Private registries
- ✅ package-lock.json

**Known Issues:**
- ⚠️ Some native modules need recompilation
- ⚠️ C++ addons may not work
- ⚠️ Complex postinstall scripts may fail
- ⚠️ Some Node.js APIs not fully implemented

**Popular Packages Tested:**
- ✅ Express, Fastify, Koa
- ✅ React, Vue, Svelte
- ✅ Next.js, Nuxt, SvelteKit (experimental)
- ✅ Prisma, Drizzle, TypeORM
- ✅ Jest, Vitest (via bun test)
- ✅ ESLint, Prettier
- ✅ TypeScript, Babel
- ✅ Webpack, Rollup, esbuild

#### Node.js APIs

**Compatibility:** High (~95%)

**Implemented:**
- ✅ fs (file system)
- ✅ path
- ✅ http/https
- ✅ net (TCP/UDP)
- ✅ crypto
- ✅ stream
- ✅ events
- ✅ util
- ✅ child_process
- ✅ os
- ✅ Buffer
- ⚠️ cluster (partial)
- ⚠️ worker_threads (partial)
- ⚠️ vm (limited)

---

### Deno

#### npm Ecosystem

**Compatibility:** Full support via `npm:` specifier

**What Works:**
- ✅ 2M+ npm packages available
- ✅ Pure JavaScript packages
- ✅ TypeScript packages
- ✅ Most native modules
- ✅ package.json support
- ✅ .npmrc configuration
- ✅ Private registries
- ✅ Workspaces (Deno 2.0+)

**Known Issues:**
- ⚠️ Some native modules need shimming
- ⚠️ package.json "exports" with conditions not fully supported
- ⚠️ Some Node.js-specific APIs may not work
- ⚠️ Peer dependencies resolution edge cases

**Popular Packages Tested:**
- ✅ Express, Fastify, Koa, Oak (Deno-native)
- ✅ React, Preact
- ✅ TypeScript, Babel
- ✅ Prisma (with special setup)
- ✅ Most pure JS libraries

#### Node.js APIs

**Compatibility:** Good (~90% via node: imports)

**Implemented:**
- ✅ fs (via node:fs)
- ✅ path
- ✅ http/https
- ✅ net
- ✅ crypto
- ✅ stream
- ✅ events
- ✅ util
- ✅ child_process
- ✅ os
- ✅ Buffer
- ⚠️ cluster (not available)
- ⚠️ worker_threads (Deno has Web Workers instead)
- ⚠️ vm (limited)

#### Deno-First Ecosystem

**JSR (jsr.io):**
- Deno's native registry
- TypeScript-first
- Auto-generated documentation
- Fast and modern
- Growing ecosystem

**Popular JSR Packages:**
- @std/* (standard library)
- @oak/oak (web framework)
- @david/dax (shell scripting)
- Hundreds more

---

## Web Standards Support

### Bun

**Standards Implemented:**

- ✅ **Fetch API** - HTTP client (with Bun extensions)
- ✅ **WebSocket API** - WebSocket client/server
- ✅ **Web Crypto API** - Cryptographic operations
- ✅ **Web Streams API** - ReadableStream, WritableStream, TransformStream
- ✅ **URL API** - URL parsing
- ✅ **TextEncoder/TextDecoder** - Text encoding
- ✅ **Blob/File** - Binary data
- ✅ **FormData** - Form data handling
- ✅ **Headers** - HTTP headers
- ✅ **Request/Response** - HTTP request/response
- ✅ **AbortController/AbortSignal** - Cancellation
- ⚠️ **Web Workers** - Partial support
- ⚠️ **Service Workers** - Not supported
- ❌ **Broadcast Channel** - Not available
- ❌ **IndexedDB** - Not available

**Custom Extensions:**
- File system via Bun.file()
- Process spawning via Bun.spawn()
- Shell via $ from "bun"
- SQLite via bun:sqlite
- Password hashing via Bun.password

---

### Deno

**Standards Implemented:**

- ✅ **Fetch API** - HTTP client (full standard)
- ✅ **WebSocket API** - WebSocket client/server
- ✅ **Web Crypto API** - Cryptographic operations
- ✅ **Web Streams API** - Full implementation
- ✅ **URL API** - URL parsing
- ✅ **TextEncoder/TextDecoder** - Text encoding
- ✅ **Blob/File** - Binary data
- ✅ **FormData** - Form data handling
- ✅ **Headers** - HTTP headers
- ✅ **Request/Response** - HTTP request/response
- ✅ **AbortController/AbortSignal** - Cancellation
- ✅ **Web Workers** - Full support
- ✅ **Broadcast Channel** - Cross-context messaging
- ✅ **Web Storage API** - localStorage (coming)
- ⚠️ **Service Workers** - Planned
- ⚠️ **IndexedDB** - Not available (use KV instead)

**Additional Standards:**
- ✅ Import Maps (web standard)
- ✅ Import Assertions/Attributes
- ✅ Top-level await
- ✅ WebAssembly
- ✅ WebGPU (experimental)

**Deno-Specific:**
- File system via Deno.* APIs
- Process spawning via Deno.Command
- Permissions via Deno.permissions
- KV store via Deno.openKv()

---

## Developer Experience

### Bun

**Strengths:**
- ✅ **Drop-in Node.js replacement** - Minimal migration effort
- ✅ **All-in-one** - Everything included (bundler, test, transpiler)
- ✅ **Fast** - Instant startup, fast installs
- ✅ **Shell scripting** - Built-in $ syntax
- ✅ **Zero config** - Works out of the box
- ✅ **package.json familiar** - Standard Node.js format
- ✅ **npm compatible** - Huge ecosystem available
- ✅ **Watch mode** - Built-in file watching

**Pain Points:**
- ⚠️ **Young ecosystem** - Some features still experimental
- ⚠️ **Breaking changes** - Occasionally in updates
- ⚠️ **Module resolution** - Self-reference issues
- ⚠️ **Documentation gaps** - Some APIs under-documented
- ⚠️ **No permissions** - Security relies on trust
- ⚠️ **Debugging** - Less mature tooling than Node.js

**Best For:**
- Performance-critical applications
- Node.js migrations
- Rapid prototyping
- Shell scripting
- Developers who value speed

---

### Deno

**Strengths:**
- ✅ **Secure by default** - Permission system
- ✅ **Complete toolchain** - Formatter, linter, test, docs, all built-in
- ✅ **TypeScript native** - First-class TS support
- ✅ **Web standards** - Familiar browser APIs
- ✅ **Import maps** - Full control over resolution
- ✅ **Excellent docs** - Comprehensive documentation
- ✅ **Stable** - Well-tested, mature
- ✅ **Modern** - Built for today's needs

**Pain Points:**
- ⚠️ **URL imports** - Can be verbose without import map
- ⚠️ **Permissions verbose** - Many flags needed
- ⚠️ **npm compat gaps** - Some packages don't work
- ⚠️ **Smaller ecosystem** - Fewer Deno-native packages
- ⚠️ **Slower startup** - Than Bun (but faster than Node)
- ⚠️ **Shell scripting** - Requires dax library

**Best For:**
- Security-critical applications
- Greenfield projects
- TypeScript-heavy projects
- Teams that value standards
- Developers who want control

---

## Complete API Reference

### Bun APIs (bun.sh/reference)

```typescript
// Core
Bun.version
Bun.revision
Bun.env
Bun.main
Bun.argv
Bun.sleep(ms)
Bun.sleepSync(ms)
Bun.which(bin)
Bun.peek(promise)
Bun.openInEditor(file, opts)
Bun.deepEquals(a, b)
Bun.escapeHTML(str)
Bun.fileURLToPath(url)
Bun.pathToFileURL(path)

// File I/O
Bun.file(path)
Bun.write(dest, data)

// Hashing
Bun.hash(data)
Bun.hash.wyhash(data, seed)
Bun.hash.crc32(data)
Bun.hash.adler32(data)

// Password
Bun.password.hash(pwd, opts)
Bun.password.verify(pwd, hash)

// Compression
Bun.gzipSync(data)
Bun.gunzipSync(data)
Bun.deflateSync(data)
Bun.inflateSync(data)

// HTTP Server
Bun.serve(opts)

// Process
Bun.spawn(cmd, opts)
Bun.spawnSync(cmd, opts)

// Shell
import { $ } from "bun";

// SQLite
import { Database } from "bun:sqlite";

// FFI
import { dlopen, FFIType } from "bun:ffi";

// Test
import { test, expect, describe, mock, spyOn } from "bun:test";
```

---

### Deno APIs (docs.deno.com/api)

```typescript
// Core
Deno.version
Deno.args
Deno.env
Deno.pid
Deno.ppid
Deno.noColor
Deno.exit(code)
Deno.stdin
Deno.stdout
Deno.stderr
Deno.mainModule
Deno.memoryUsage()
Deno.inspect(value, opts)

// File System
Deno.readTextFile(path)
Deno.readFile(path)
Deno.writeTextFile(path, data)
Deno.writeFile(path, data)
Deno.readDir(path)
Deno.mkdir(path, opts)
Deno.remove(path, opts)
Deno.rename(old, new)
Deno.stat(path)
Deno.lstat(path)
Deno.open(path, opts)
Deno.create(path)
Deno.makeTempDir(opts)
Deno.makeTempFile(opts)
Deno.copyFile(from, to)
Deno.watchFs(path)

// Process
Deno.Command(cmd, opts)
Deno.run(opts)  // DEPRECATED

// Permissions
Deno.permissions.query(desc)
Deno.permissions.request(desc)
Deno.permissions.revoke(desc)

// Network
Deno.listen(opts)
Deno.connect(opts)
Deno.serve(opts, handler)
Deno.upgradeWebSocket(req)

// KV Store
Deno.openKv(path)

// Cron
Deno.cron(name, schedule, handler)

// FFI
Deno.dlopen(path, symbols)

// Testing
import { assertEquals, assert } from "jsr:@std/assert";
import { describe, it, beforeAll, afterAll } from "jsr:@std/testing/bdd";
import { spy, stub } from "jsr:@std/testing/mock";
```

---

## Migration Considerations

### Node.js → Bun

**Effort:** Low to Medium

**Steps:**
1. Install Bun: `curl -fsSL https://bun.sh/install | bash`
2. Replace `node` with `bun` in scripts
3. Replace `npm` with `bun` for package management
4. Run `bun install` to create bun.lockb
5. Test thoroughly

**What to Change:**
- Scripts: `node script.js` → `bun script.js`
- Package manager: `npm install` → `bun install`
- Lockfile: Delete package-lock.json, use bun.lockb

**What Stays Same:**
- ✅ package.json (no changes needed)
- ✅ tsconfig.json (works as-is)
- ✅ Most code (especially pure JS/TS)
- ✅ Dependencies (npm ecosystem)

**Potential Issues:**
- Native modules may need rebuild
- Some Node APIs might be missing
- Performance characteristics differ

---

### Node.js → Deno

**Effort:** Medium to High

**Steps:**
1. Install Deno: `curl -fsSL https://deno.land/install.sh | sh`
2. Create deno.json with import map
3. Add `npm:` prefix to npm imports
4. Update file paths to include .ts extension
5. Add permission flags to scripts
6. Replace Node APIs with Deno equivalents

**What to Change:**
- Imports: `import express from "express"` → `import express from "npm:express"`
- File extensions: Include .ts in imports
- Node APIs: `import fs from "fs"` → `import fs from "node:fs"` or Deno APIs
- Scripts: Add permission flags
- Environment: `process.env` → `Deno.env`

**What to Consider:**
- Permission model (explicit flags)
- Import map for bare specifiers
- Some npm packages may not work
- Different testing framework

**Gradual Migration:**
1. Start with package.json (Node compat mode)
2. Gradually move to deno.json
3. Replace Node APIs with Deno APIs over time

---

### Bun → Deno

**Effort:** Medium to High

**Key Differences:**
- Shell: `$ from "bun"` → `import $ from "jsr:@david/dax"`
- File I/O: `Bun.file()` → `Deno.readTextFile()`
- Config: bunfig.toml → deno.json
- Security: Add permission flags

**Critical: Git Dependencies**
```yaml
# Bun (current)
dependencies:
  - git+ssh://git@github.com/user/private-repo.git

# Deno (requires change)
{
  "imports": {
    "mylib": "https://raw.githubusercontent.com/user/private-repo/v1.0.0/mod.ts"
  }
}
```

**Additional Setup for Private Repos:**
- Generate GitHub personal access token
- Set `DENO_AUTH_TOKENS=token@raw.githubusercontent.com`
- Cannot use SSH keys
- Cannot use deploy keys
- Token rotation management needed

**This may be a blocker** if you have many private git dependencies.

---

## Decision Matrix

### Choose Bun If:

✅ **Performance is critical**
- Fastest startup time
- Highest throughput for HTTP/WebSocket
- Fast package management

✅ **Shell scripting is important**
- Built-in $ syntax without dependencies
- Cross-platform shell commands
- Clean integration

✅ **Private git repos with SSH keys**
- Full git+ssh:// support
- Works with your existing SSH config
- No token management needed
- Per-repo deploy keys supported

✅ **Node.js compatibility matters**
- Migrating from Node.js
- Need npm ecosystem
- Want drop-in replacement

✅ **All-in-one tooling appeals**
- Want bundler, test runner, transpiler built-in
- Prefer zero configuration
- Like batteries-included approach

✅ **Rapid development is priority**
- Hot reload built-in
- Fast iteration cycles
- Zero friction

---

### Choose Deno If:

✅ **Security is paramount**
- Need permission system
- Building security-critical apps
- Want sandboxed execution

✅ **Control over modules is needed**
- Import maps for full control
- Scoped resolution
- No self-reference issues

✅ **Web standards matter**
- Want browser-compatible APIs
- Value standards compliance
- Future-proof code

✅ **Complete toolchain is valued**
- Want formatter, linter, docs, test all built-in
- Prefer opinionated tools
- Like consistent ecosystem

✅ **TypeScript is primary language**
- TS-first design
- Excellent type support
- No @types/* packages needed

✅ **Stability is critical**
- More mature and tested
- Fewer breaking changes
- Better documentation

⚠️ **BUT consider Bun instead if:**
- You rely on SSH keys for private git repos
- You need git+ssh:// protocol support
- Token management overhead is unacceptable

---

## Quick Comparison Table

| Feature | Bun | Deno |
|---------|-----|------|
| **Performance** | ⭐⭐⭐⭐⭐ Fastest | ⭐⭐⭐⭐ Very Fast |
| **Security** | ⭐⭐ Trust-based | ⭐⭐⭐⭐⭐ Permission system |
| **npm Compatibility** | ⭐⭐⭐⭐⭐ ~90% | ⭐⭐⭐⭐ Full via npm: |
| **Git SSH Support** | ⭐⭐⭐⭐⭐ Full | ⭐ HTTPS only |
| **Shell Scripting** | ⭐⭐⭐⭐⭐ Built-in | ⭐⭐⭐ Via dax |
| **Module Control** | ⭐⭐ Limited | ⭐⭐⭐⭐⭐ Import maps |
| **TypeScript** | ⭐⭐⭐⭐ Native | ⭐⭐⭐⭐⭐ First-class |
| **Tooling** | ⭐⭐⭐⭐ Built-in | ⭐⭐⭐⭐⭐ Comprehensive |
| **Maturity** | ⭐⭐⭐ Young | ⭐⭐⭐⭐ Mature |
| **Documentation** | ⭐⭐⭐ Good | ⭐⭐⭐⭐⭐ Excellent |
| **Ecosystem** | ⭐⭐⭐⭐⭐ npm | ⭐⭐⭐ Growing |
| **Web Standards** | ⭐⭐⭐⭐ Most | ⭐⭐⭐⭐⭐ Full |
| **Node.js Compat** | ⭐⭐⭐⭐⭐ High | ⭐⭐⭐⭐ Good |

---

## Summary

**Bun:**
- **Best for:** Speed, Node.js compatibility, shell scripting, rapid development, private git repos
- **Core strength:** Performance and all-in-one tooling
- **Main limitation:** Less control over module resolution, no security model

**Deno:**
- **Best for:** Security, module control, web standards, stability, public repos
- **Core strength:** Permission system and import maps for resolution control
- **Main limitation:** No SSH git support (HTTPS + tokens only), requires dax for shell, slower than Bun

**Both Are Great For:**
- TypeScript development
- Modern web applications
- CLI tools
- Backend services
- Replacing Node.js

**The Choice Depends On:**
- Performance vs Security priorities
- Need for module resolution control
- Importance of built-in shell syntax
- Tolerance for ecosystem maturity
- Team preferences and experience

---

**Final Word:** Both runtimes are excellent modern alternatives to Node.js. Bun optimizes for speed and compatibility. Deno optimizes for security and control. Choose based on your priorities and constraints.

## For Forge Specifically

**Your Key Challenges:**
1. **Module resolution control** - Need to control where imports resolve (test fixtures, forge home, etc.)
2. **Private git repos** - Currently using `git+ssh://` for forge-standard
3. **Shell scripting** - Love Bun's built-in `$` syntax

**Deno Solves:**
- ✅ Module resolution (import maps with scopes)
- ⚠️ Shell scripting (dax is nearly identical, one import line)

**Deno Creates New Problem:**
- ❌ Git SSH support (must use HTTPS + tokens)

**Bun Keeps Working:**
- ✅ Git SSH support (just works)
- ✅ Shell scripting (built-in)
- ❌ Module resolution (still problematic)

**The Trade-off:**
- **Deno:** Solve module problems, manage tokens, add one import
- **Bun:** Keep git/shell easy, work around resolution with plugins

**Critical Question:** How often do you use private git repos?
- **Frequently:** Bun's SSH support may outweigh Deno's benefits
- **Rarely/Never:** Deno's import maps are probably worth it

The experiments outlined in `RESEARCH-deno-evaluation.md` will give you real-world data to make this decision. Pay special attention to:
1. Testing import maps with scopes (Phase 3 POC)
2. Setting up forge-standard with HTTPS + token
3. Comparing token management vs SSH key workflow

**Good night, and happy reading! 🚀**
