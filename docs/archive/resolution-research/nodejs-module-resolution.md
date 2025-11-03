# Node.js Module Resolution & Configuration

**Last Updated:** 2025-11-01
**Node.js Version:** v25.x (LTS: v22.x, v20.x)

## Overview

Node.js uses a well-established CommonJS module resolution algorithm that has become the de facto standard for JavaScript runtimes. ES modules (ESM) support was added later with a slightly different resolution strategy.

---

## Module Resolution Algorithm

### CommonJS (require)

When you call `require(X)` from module at path Y, Node.js follows this algorithm:

#### 1. Core Modules

```javascript
require('fs')      // ✅ Core module
require('path')    // ✅ Core module
require('node:fs') // ✅ Explicit core module (bypasses cache)
```

**Priority:** Core modules are checked first and can't be overridden (unless using `node:` prefix bypass).

#### 2. Absolute Paths

```javascript
require('/home/user/project/module.js')
```

Loads the file directly if it exists.

#### 3. Relative Paths

```javascript
require('./module')
require('../utils/helper')
require('/absolute/path/module')
```

**Resolution order for `require('./module')`:**

1. `./module.js`
2. `./module.json`
3. `./module.node` (native addon)
4. `./module/package.json` → check `main` field
5. `./module/index.js`
6. `./module/index.json`
7. `./module/index.node`

#### 4. Package Imports (# prefix)

```javascript
require('#utils/helper')
```

Resolves using `imports` field in current package's `package.json`.

#### 5. Package Self-Reference

Allows a package to import itself using its own name.

#### 6. node_modules Lookup

For bare specifiers like `require('lodash')`:

**Search path for `/home/user/project/src/app.js`:**

```
/home/user/project/src/node_modules/lodash
/home/user/project/node_modules/lodash
/home/user/node_modules/lodash
/home/node_modules/lodash
/node_modules/lodash
```

Node.js walks up the directory tree until it finds the module or reaches the root.

### ES Modules (import)

ES modules have a stricter resolution algorithm:

#### Key Differences from CommonJS

1. **File extensions required:**
   ```javascript
   // ❌ Error in ESM
   import { foo } from './module';

   // ✅ Correct
   import { foo } from './module.js';
   ```

2. **No automatic index.js resolution:**
   ```javascript
   // ❌ Must specify full path
   import { foo } from './components';

   // ✅ Correct
   import { foo } from './components/index.js';
   ```

3. **package.json exports field:**
   ```json
   {
     "exports": {
       ".": "./dist/index.js",
       "./utils": "./dist/utils.js"
     }
   }
   ```

4. **Conditional exports:**
   ```json
   {
     "exports": {
       ".": {
         "import": "./dist/esm/index.js",
         "require": "./dist/cjs/index.js"
       }
     }
   }
   ```

---

## node_modules Search Path

### Local Resolution

For a file at `/home/ry/projects/foo.js` requiring `bar.js`:

```
/home/ry/projects/node_modules/bar.js
/home/ry/node_modules/bar.js
/home/node_modules/bar.js
/node_modules/bar.js
```

The search continues until the root of the filesystem is reached.

### Global Folders (Legacy)

Node.js also searches these locations (mostly for historic reasons):

1. `$HOME/.node_modules`
2. `$HOME/.node_libraries`
3. `$PREFIX/lib/node`

Where:
- `$HOME` is the user's home directory
- `$PREFIX` is Node.js configured `node_prefix`

**Note:** Global folders are **discouraged**. Use local `node_modules` instead.

### Module Paths

You can inspect the search paths at runtime:

```javascript
// CommonJS
console.log(module.paths);
/* Example output:
[
  '/home/user/project/node_modules',
  '/home/user/node_modules',
  '/home/node_modules',
  '/node_modules'
]
*/
```

---

## Configuration & Environment Variables

### NODE_PATH

Add custom directories to the module search path.

**Format:**
- **Unix/Linux/macOS:** Colon-delimited (`:`)
- **Windows:** Semicolon-delimited (`;`)

**Example:**

```bash
# Unix/Linux/macOS
export NODE_PATH=/usr/lib/node_modules:/opt/custom/modules

# Windows
set NODE_PATH=C:\libs\node_modules;D:\custom\modules
```

**Usage:**

```javascript
// With NODE_PATH=/opt/custom/modules
require('custom-package') // Searches /opt/custom/modules/custom-package
```

**Important:** NODE_PATH is **legacy** and "less necessary now that the Node.js ecosystem has settled on a convention for locating dependent modules." Prefer local `node_modules`.

### NODE_MODULES

Not a standard environment variable. Node.js always looks for `node_modules` directories.

### NODE_OPTIONS

Pass options to Node.js runtime:

```bash
export NODE_OPTIONS="--max-old-space-size=4096"
```

Affects module loading indirectly (memory limits, etc.).

### NPM Configuration

NPM uses its own configuration system:

```bash
# Set global install location
npm config set prefix /custom/global

# View current config
npm config list

# Global modules location
npm root -g
```

**Default global locations:**
- **Unix/Linux/macOS:** `/usr/local/lib/node_modules`
- **Windows:** `%APPDATA%\npm\node_modules`

---

## Module Resolution API

### require.resolve()

Get the resolved filename without loading the module.

**Signature:**

```javascript
require.resolve(request[, options])
```

**Parameters:**
- `request` - Module specifier to resolve
- `options.paths` - Array of custom search paths

**Examples:**

```javascript
// Basic resolution
const path = require.resolve('lodash');
// Returns: '/home/user/project/node_modules/lodash/lodash.js'

// Resolve relative to custom paths
const custom = require.resolve('my-module', {
  paths: ['/custom/path', '/another/path']
});

// Resolve from specific directory
const fromDir = require.resolve('express', {
  paths: ['/home/user/project']
});
```

**Error Handling:**

```javascript
try {
  const path = require.resolve('nonexistent-module');
} catch (err) {
  console.error('Module not found:', err.code); // MODULE_NOT_FOUND
}
```

### require.resolve.paths()

Get the search paths for a module.

**Signature:**

```javascript
require.resolve.paths(request)
```

**Returns:**
- Array of paths that would be searched
- `null` for core modules

**Examples:**

```javascript
// Get search paths for a package
const paths = require.resolve.paths('lodash');
/* Returns:
[
  '/home/user/project/node_modules',
  '/home/user/node_modules',
  '/home/node_modules',
  '/node_modules'
]
*/

// Core modules return null
const corePaths = require.resolve.paths('fs');
// Returns: null
```

### module.paths

Array of search paths for the current module.

**Example:**

```javascript
console.log(module.paths);
/* Output:
[
  '/home/user/project/src/node_modules',
  '/home/user/project/node_modules',
  '/home/user/node_modules',
  '/home/node_modules',
  '/node_modules',
  '/home/user/.node_modules',
  '/home/user/.node_libraries',
  '/usr/local/lib/node'  // $PREFIX/lib/node
]
*/
```

---

## Module Caching

### Cache Behavior

Modules are cached after first load:

```javascript
const moduleA = require('./module');
const moduleB = require('./module');

console.log(moduleA === moduleB); // true (same object)
```

**Key Points:**
- Cache is based on **resolved filename**
- Multiple paths to same file create **single cache entry**
- Different paths to different files create **separate entries**

### Cache Access

```javascript
// View module cache
console.log(require.cache);

// Clear specific module from cache
delete require.cache[require.resolve('./module')];

// Clear all modules (rarely needed)
Object.keys(require.cache).forEach(key => {
  delete require.cache[key];
});
```

**Warning:** Clearing cache can cause issues. Use only for hot-reloading or testing.

---

## package.json Configuration

### CommonJS Fields

```json
{
  "name": "my-package",
  "version": "1.0.0",
  "main": "./dist/index.js",        // Default entry point
  "type": "commonjs"                // Explicitly set module type
}
```

### ES Module Fields

```json
{
  "type": "module",                 // .js files are ESM
  "main": "./dist/index.js",        // Default (for old Node.js)
  "exports": {
    ".": {
      "import": "./dist/esm/index.js",
      "require": "./dist/cjs/index.js"
    },
    "./utils": "./dist/utils.js"
  }
}
```

### Exports Field (Subpath Patterns)

```json
{
  "exports": {
    ".": "./index.js",
    "./features/*": "./src/features/*.js",
    "./utils/*": "./src/utils/*.js",
    "./package.json": "./package.json"
  }
}
```

**Usage:**

```javascript
import { feature1 } from 'my-package/features/feature1.js';
import { helper } from 'my-package/utils/helper.js';
```

### Conditional Exports

```json
{
  "exports": {
    ".": {
      "node": "./node-specific.js",
      "default": "./generic.js"
    },
    "./feature": {
      "import": {
        "development": "./feature-dev.js",
        "production": "./feature-prod.js"
      },
      "require": "./feature-cjs.js"
    }
  }
}
```

**Conditions:**
- `import` - ES module
- `require` - CommonJS
- `node` - Node.js environment
- `default` - Fallback
- Custom conditions via `--conditions` flag

### Imports Field (Package Imports)

Define internal imports with `#` prefix:

```json
{
  "imports": {
    "#utils/*": "./src/utils/*.js",
    "#config": {
      "development": "./config/dev.js",
      "production": "./config/prod.js"
    }
  }
}
```

**Usage:**

```javascript
import { helper } from '#utils/helper.js';
import config from '#config';
```

---

## ES Modules vs CommonJS

### Detection

**By file extension:**
- `.mjs` → Always ES module
- `.cjs` → Always CommonJS
- `.js` → Depends on nearest `package.json`

**By package.json:**

```json
{
  "type": "module"  // .js files are ESM
}
```

```json
{
  "type": "commonjs"  // .js files are CommonJS (default)
}
```

### Interoperability

**ESM importing CommonJS:**

```javascript
// ✅ Default import works
import pkg from 'commonjs-package';

// ❌ Named imports may not work
import { method } from 'commonjs-package'; // May fail
```

**CommonJS importing ESM:**

```javascript
// ❌ Cannot use require() for ESM
const pkg = require('esm-package'); // Error

// ✅ Use dynamic import
(async () => {
  const pkg = await import('esm-package');
})();
```

---

## Best Practices

### 1. Use Local Dependencies

Prefer local `node_modules` over global or `NODE_PATH`:

```bash
# ✅ Good
npm install lodash

# ❌ Avoid
npm install -g lodash
```

### 2. Specify Module Type

Be explicit in `package.json`:

```json
{
  "type": "module"  // or "commonjs"
}
```

### 3. Use Exports Field

Control package exports explicitly:

```json
{
  "exports": {
    ".": "./index.js",
    "./package.json": "./package.json"
  }
}
```

Prevents users from importing internal files.

### 4. Include File Extensions in ESM

```javascript
// ✅ Explicit
import { foo } from './module.js';

// ❌ Implicit (works in CommonJS, fails in ESM)
import { foo } from './module';
```

### 5. Avoid Clearing require.cache

Only clear cache when absolutely necessary (hot-reloading, testing).

---

## Troubleshooting

### Module Not Found

**Check resolution:**

```javascript
console.log(require.resolve('package-name'));
```

**Check search paths:**

```javascript
console.log(require.resolve.paths('package-name'));
```

**Verify installation:**

```bash
npm list package-name
```

### Dual Package Hazard

When a package is loaded as both CommonJS and ESM, you get two separate instances:

```javascript
// instance1.js (CommonJS)
const shared = require('shared-package');

// instance2.js (ESM)
import shared from 'shared-package'; // Different instance!
```

**Solution:** Use `exports` field to ensure single resolution:

```json
{
  "exports": {
    ".": {
      "import": "./esm-wrapper.js",  // Wraps CommonJS
      "require": "./index.js"
    }
  }
}
```

### ERR_REQUIRE_ESM

```
Error [ERR_REQUIRE_ESM]: require() of ES Module not supported
```

**Solution:** Use dynamic import:

```javascript
// ❌ Error
const pkg = require('esm-package');

// ✅ Works
import('esm-package').then(pkg => {
  // Use pkg
});
```

### Cannot find module

1. **Reinstall dependencies:**
   ```bash
   rm -rf node_modules package-lock.json
   npm install
   ```

2. **Check NODE_PATH:**
   ```bash
   echo $NODE_PATH
   ```

3. **Verify file exists:**
   ```bash
   ls -la node_modules/package-name
   ```

---

## References

- [Node.js Modules Documentation](https://nodejs.org/api/modules.html)
- [Node.js ES Modules Documentation](https://nodejs.org/api/esm.html)
- [Node.js Package Entry Points](https://nodejs.org/api/packages.html)
- [npm Documentation](https://docs.npmjs.com/)
