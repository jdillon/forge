# Deno Module Resolution & Configuration

**Last Updated:** 2025-11-01
**Deno Version:** 2.x (LTS: 1.x)

## Overview

Deno takes a radically different approach to module resolution compared to Node.js. It uses browser-compatible ES modules, requires explicit file extensions, and supports multiple module sources (URLs, npm, JSR) without a `node_modules` directory.

---

## Module Resolution Algorithm

### Core Principles

1. **ES Modules Only** - No CommonJS support
2. **Explicit Extensions** - File extensions are mandatory
3. **URL-based Imports** - Direct HTTPS imports supported
4. **No node_modules** - Dependencies cached globally
5. **Import Maps** - Centralized dependency management

### Module Types Supported

#### 1. Relative/Absolute File Imports

```typescript
// ✅ Explicit extension required
import { helper } from './utils/helper.ts';
import { config } from '../config.ts';
import { data } from '/absolute/path/data.ts';

// ❌ Error - extension required
import { helper } from './utils/helper';
```

**Key Difference from Node.js:** Extensions are **mandatory** - cannot be omitted.

#### 2. HTTPS URL Imports

```typescript
// Direct import from URL
import { serve } from 'https://deno.land/std@0.208.0/http/server.ts';
import { assertEquals } from 'https://deno.land/std@0.208.0/assert/mod.ts';

// No installation required - downloaded and cached automatically
```

#### 3. JSR (JavaScript Registry)

```typescript
// JSR packages
import { Case } from 'jsr:@luca/cases@^1.0.0';

// Add with CLI
// deno add @luca/cases
```

JSR is Deno's modern package registry for TypeScript-first modules.

#### 4. npm Packages

```typescript
// npm compatibility
import cowsay from 'npm:cowsay@^1.6.0';
import express from 'npm:express@^4.18.0';

// Add with CLI
// deno add npm:cowsay
```

Deno can use npm packages directly without `node_modules`.

---

## Import Maps Configuration

Import maps centralize dependency management and provide aliases.

### deno.json Configuration

**Location:** Project root `deno.json` or `deno.jsonc`

**Basic structure:**

```json
{
  "imports": {
    "@luca/cases": "jsr:@luca/cases@^1.0.0",
    "cowsay": "npm:cowsay@^1.6.0",
    "std/": "https://deno.land/std@0.208.0/",
    "@/": "./src/",
    "~/": "./lib/"
  },
  "scopes": {
    "https://deno.land/x/example/": {
      "https://deno.land/x/dependency/": "./local-fork/"
    }
  }
}
```

### imports Field

Maps bare specifiers to actual module locations.

**Example:**

```json
{
  "imports": {
    "lodash": "npm:lodash@^4.17.21",
    "react": "npm:react@^18.2.0",
    "std/path": "https://deno.land/std@0.208.0/path/mod.ts",
    "@/utils": "./src/utils/mod.ts"
  }
}
```

**Usage:**

```typescript
import _ from 'lodash';
import { join } from 'std/path';
import { helper } from '@/utils';
```

**Trailing slash handling:**

```json
{
  "imports": {
    // ✅ Deno.json - No trailing slash needed
    "std/": "https://deno.land/std@0.208.0/",

    // ⚠️ import_map.json (WHATWG standard) - Both required
    "std/": "https://deno.land/std@0.208.0/",
    "std": "https://deno.land/std@0.208.0/"
  }
}
```

**Key Point:** `deno.json` extends the Import Maps standard - you only need the entry **without** trailing slash.

### scopes Field

Override imports within specific scopes (useful for patching dependencies).

**Example:**

```json
{
  "scopes": {
    "https://deno.land/x/example/": {
      "https://deno.land/std@0.208.0/path/": "./patched/path/",
      "npm:problematic-package": "./local-fixes/package/"
    }
  }
}
```

**Use case:** When `https://deno.land/x/example/` imports `std/path`, it gets the patched version, but other imports get the original.

### deno add Command

Automatically adds dependencies to `deno.json`:

```bash
# Add JSR package
deno add @luca/cases
# Updates deno.json with: "@luca/cases": "jsr:@luca/cases@^1.0.0"

# Add npm package
deno add npm:express
# Updates deno.json with: "express": "npm:express@^4.18.0"

# Add specific version
deno add jsr:@std/path@^1.0.0
```

---

## Module Caching System

### Cache Location

**Environment Variable:** `DENO_DIR`

**Default locations:**
- **macOS:** `$HOME/Library/Caches/deno`
- **Linux:** `$HOME/.cache/deno` (or `$XDG_CACHE_HOME/deno`)
- **Windows:** `%LOCALAPPDATA%\deno`

**Custom cache location:**

```bash
export DENO_DIR=/custom/cache/path
deno run app.ts
```

### Cache Structure

```
$DENO_DIR/
├── deps/           # Remote URL dependencies
│   ├── https/      # HTTPS imports
│   └── npm/        # npm packages
├── gen/            # Compiled JavaScript from TypeScript
├── npm/            # npm package metadata
└── registries/     # JSR and other registries
```

### Cache Management

**Download and cache dependencies:**

```bash
# Cache all dependencies in a file
deno cache main.ts

# Cache with import map
deno cache --import-map=deno.json main.ts

# Force reload (ignore cache)
deno run --reload main.ts

# Reload specific module
deno run --reload=https://deno.land/std main.ts
```

**View cache info:**

```bash
# Show cache location and module info
deno info

# Show info for specific module
deno info https://deno.land/std@0.208.0/path/mod.ts
```

**Clear cache:**

```bash
# Remove entire cache
rm -rf $DENO_DIR

# Or use deno cache --reload
deno cache --reload main.ts
```

---

## Configuration Files

### deno.json / deno.jsonc

**Location:** Project root

**Full configuration example:**

```json
{
  // Import maps
  "imports": {
    "@std/path": "jsr:@std/path@^1.0.0",
    "@/": "./src/"
  },

  // Scoped overrides
  "scopes": {
    "https://deno.land/x/example/": {
      "https://deno.land/std/": "./patched/std/"
    }
  },

  // Tasks (like npm scripts)
  "tasks": {
    "dev": "deno run --watch main.ts",
    "test": "deno test --allow-read"
  },

  // Compiler options
  "compilerOptions": {
    "strict": true,
    "lib": ["deno.window"]
  },

  // Linting
  "lint": {
    "rules": {
      "tags": ["recommended"]
    }
  },

  // Formatting
  "fmt": {
    "indentWidth": 2,
    "lineWidth": 100
  }
}
```

### import_map.json (Legacy)

External import map file following WHATWG standard.

```bash
deno run --import-map=import_map.json main.ts
```

**Note:** Using `imports` in `deno.json` is preferred over external files.

---

## Environment Variables

### DENO_DIR

Sets the cache directory location.

```bash
export DENO_DIR=/custom/cache/path
```

**Default:**
- macOS: `~/Library/Caches/deno`
- Linux: `~/.cache/deno`
- Windows: `%LOCALAPPDATA%\deno`

### NO_COLOR

Disable colored output.

```bash
export NO_COLOR=1
deno run app.ts
```

### DENO_CERT

Specify custom CA certificate for HTTPS.

```bash
export DENO_CERT=/path/to/cert.pem
```

### DENO_TLS_CA_STORE

Set TLS certificate store.

```bash
export DENO_TLS_CA_STORE=system  # or mozilla
```

### DENO_AUTH_TOKENS

Authentication tokens for private registries.

```bash
export DENO_AUTH_TOKENS=token1@deno.land;token2@example.com
```

---

## Module Resolution API

### import.meta

Provides module metadata.

```typescript
// Current module URL
console.log(import.meta.url);
// file:///home/user/project/main.ts

// Current module directory (Deno-specific)
console.log(import.meta.main);
// true if this is the entry point

// Resolve relative to current module
const configPath = new URL('./config.json', import.meta.url);
```

### import.meta.resolve()

Resolve module specifiers.

```typescript
// Resolve relative path
const resolved = import.meta.resolve('./utils.ts');
// file:///home/user/project/utils.ts

// Resolve with import map
const std = import.meta.resolve('std/path');
// https://deno.land/std@0.208.0/path/mod.ts

// Resolve npm package
const pkg = import.meta.resolve('npm:lodash');
// npm:lodash@^4.17.21
```

### Dynamic Imports

Load modules at runtime.

```typescript
// Load module dynamically
const module = await import('./dynamic.ts');

// With import map
const utility = await import('std/path');

// Conditional imports
const handler = await import(
  isDev ? './dev-handler.ts' : './prod-handler.ts'
);
```

---

## Dependency Management

### Lock Files

Ensure reproducible builds with lock files.

**Create lock file:**

```bash
# Generate deno.lock
deno cache --lock=deno.lock --lock-write main.ts
```

**Use lock file:**

```bash
# Verify dependencies match lock file
deno run --lock=deno.lock main.ts

# Auto-update lock file
deno run --lock=deno.lock --lock-write main.ts
```

**deno.lock format:**

```json
{
  "version": "3",
  "remote": {
    "https://deno.land/std@0.208.0/path/mod.ts": "abc123...",
    "https://deno.land/std@0.208.0/assert/mod.ts": "def456..."
  },
  "npm": {
    "lodash@4.17.21": {
      "integrity": "sha512-...",
      "dependencies": {}
    }
  }
}
```

### Version Pinning

**Best practices:**

```typescript
// ❌ Unpinned - risky
import { serve } from 'https://deno.land/std/http/server.ts';

// ✅ Pinned version
import { serve } from 'https://deno.land/std@0.208.0/http/server.ts';

// ✅ Use import map for centralized version management
import { serve } from 'std/http/server.ts';
```

**In deno.json:**

```json
{
  "imports": {
    "std/": "https://deno.land/std@0.208.0/"
  }
}
```

---

## Key Differences from Node.js

### No node_modules

**Node.js:**
```
project/
├── node_modules/     ← Thousands of files
├── package.json
└── app.js
```

**Deno:**
```
project/
├── deno.json         ← Just configuration
└── app.ts
```

Dependencies cached globally in `$DENO_DIR`.

### Mandatory File Extensions

**Node.js (CommonJS):**
```javascript
// ✅ Works - extension optional
const utils = require('./utils');
import { helper } from './helper';
```

**Deno:**
```typescript
// ❌ Error
import { utils } from './utils';

// ✅ Required
import { utils } from './utils.ts';
```

### URL Imports

**Node.js:**
```javascript
// ❌ Not possible
import express from 'https://unpkg.com/express';
```

**Deno:**
```typescript
// ✅ Native support
import { serve } from 'https://deno.land/std@0.208.0/http/server.ts';
```

### Import Maps vs package.json

**Node.js package.json:**
```json
{
  "dependencies": {
    "express": "^4.18.0",
    "lodash": "^4.17.21"
  },
  "devDependencies": {
    "typescript": "^5.0.0"
  }
}
```

**Deno deno.json:**
```json
{
  "imports": {
    "express": "npm:express@^4.18.0",
    "lodash": "npm:lodash@^4.17.21"
  }
}
```

**Note:** Deno doesn't distinguish dev dependencies - unused imports aren't loaded.

### Permission-Based Security

```bash
# Node.js - full access by default
node app.js

# Deno - explicit permissions required
deno run --allow-net --allow-read app.ts
```

---

## Best Practices

### 1. Use Import Maps

Centralize dependency management:

```json
{
  "imports": {
    "std/": "https://deno.land/std@0.208.0/",
    "@/": "./src/"
  }
}
```

### 2. Pin Versions

Always specify versions for HTTPS imports:

```typescript
// ✅ Good
import { serve } from 'https://deno.land/std@0.208.0/http/server.ts';

// ❌ Bad - version can change
import { serve } from 'https://deno.land/std/http/server.ts';
```

### 3. Use deno add

Let Deno manage your imports:

```bash
deno add @std/path
deno add npm:express
```

### 4. Commit Lock Files

Include `deno.lock` in version control for reproducible builds.

### 5. Use JSR Over npm When Possible

JSR packages are TypeScript-first and Deno-optimized:

```typescript
// ✅ Prefer JSR
import { Case } from 'jsr:@luca/cases';

// ⚠️ npm works but not optimal
import cowsay from 'npm:cowsay';
```

### 6. Organize with Path Aliases

```json
{
  "imports": {
    "@/": "./src/",
    "@utils/": "./src/utils/",
    "@components/": "./src/components/"
  }
}
```

```typescript
import { Button } from '@components/Button.ts';
import { helper } from '@utils/helper.ts';
```

---

## Troubleshooting

### Module Not Found

**Check import map:**

```bash
deno info main.ts
```

**Verify deno.json:**

```json
{
  "imports": {
    "alias": "actual/path/mod.ts"  // Ensure path is correct
  }
}
```

**Check file extension:**

```typescript
// ❌ Will fail
import { foo } from './module';

// ✅ Must include extension
import { foo } from './module.ts';
```

### Cache Issues

**Clear cache:**

```bash
# Remove entire cache
rm -rf $(deno info --json | jq -r .denoDir)

# Force reload
deno cache --reload main.ts
```

### HTTPS Import Fails

**Check network access:**

```bash
# Requires --allow-net for remote imports
deno run --allow-net main.ts
```

**Use custom certificate:**

```bash
export DENO_CERT=/path/to/cert.pem
deno run main.ts
```

### Import Map Not Working

**Ensure deno.json is in project root:**

```bash
ls -la deno.json
```

**Or specify explicitly:**

```bash
deno run --import-map=deno.json main.ts
```

### npm Package Not Loading

**Check Deno's npm compatibility:**

Not all npm packages work with Deno. Check:
1. Does it use Node.js-specific APIs?
2. Does it use CommonJS?
3. Check Deno compatibility on [deno.land/x](https://deno.land/x)

**Alternative:** Use `npm:` prefix or find JSR equivalent.

---

## References

- [Deno Manual - Import Maps](https://docs.deno.com/runtime/manual/basics/import_maps/)
- [Deno Manual - Modules](https://docs.deno.com/runtime/manual/basics/modules/)
- [deno.json Configuration](https://docs.deno.com/runtime/fundamentals/configuration/)
- [JSR Registry](https://jsr.io/)
- [Deno Standard Library](https://deno.land/std)
