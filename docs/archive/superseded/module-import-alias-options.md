# Stable Import Alias Options for Forge Modules

## Problem
Modules use: `import type { ForgeCommand } from '../../../lib/types'`
- Fragile relative path
- Breaks if module location changes
- No intellisense/autocomplete hints about "forge" APIs

## Goal
Stable, predictable way to import Forge types/utilities:
```typescript
import type { ForgeCommand } from '@forge/types';
// or
import type { ForgeCommand } from 'forge';
```

---

## Option 1: package.json "exports" (Recommended)

**Location:** `~/.local/share/forge/package.json`

```json
{
  "name": "@planet57/forge",
  "exports": {
    "./types": "./node_modules/@planet57/forge/lib/types.js",
    "./logger": "./node_modules/@planet57/forge/lib/logger.js",
    "./helpers": "./node_modules/@planet57/forge/lib/helpers.js"
  }
}
```

**Usage in modules:**
```typescript
import type { ForgeCommand } from '@planet57/forge/types';
import { log } from '@planet57/forge/logger';
```

**Pros:**
- Standard Node.js/Bun feature
- Works with Bun's module resolution
- Already have @planet57/forge installed in forge home
- Just need to add exports to its package.json

**Cons:**
- Need to modify installed package.json (or our package source)
- Longer import path: `@planet57/forge/types` vs `forge/types`

---

## Option 2: tsconfig.json "paths"

**Location:** `~/.local/share/forge/tsconfig.json`

```json
{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@forge/*": ["./node_modules/@planet57/forge/lib/*"],
      "forge/*": ["./node_modules/@planet57/forge/lib/*"]
    }
  }
}
```

**Usage in modules:**
```typescript
import type { ForgeCommand } from '@forge/types';
import { log } from '@forge/logger';
```

**Pros:**
- Clean `@forge/*` prefix
- Easy to set up in forge home
- Bun respects tsconfig.json paths natively

**Cons:**
- We already decided NOT to use tsconfig.json for resolution
- Would require passing --tsconfig-override (complexity we avoided)
- Or symlinking tsconfig.json into each project (defeats purpose)

---

## Option 3: npm "link" style package

**Location:** `~/.local/share/forge/node_modules/@forge/`

Create a symlink/directory:
```
~/.local/share/forge/node_modules/@forge/
├── package.json  (name: "@forge/core")
├── types.js      → symlink to ../../../node_modules/@planet57/forge/lib/types.js
├── logger.js     → symlink
├── helpers.js    → symlink
```

**Usage:**
```typescript
import type { ForgeCommand } from '@forge/types';
```

**Pros:**
- Clean `@forge/*` prefix
- Works with NODE_PATH (our current solution)
- Standard npm package structure

**Cons:**
- Need to maintain symlinks/package structure
- More complexity in installer

---

## Option 4: Wrapper package in package.json

**Location:** Our forge package exports in `package.json`

```json
{
  "name": "@planet57/forge",
  "exports": {
    ".": "./bin/forge",
    "./types": "./lib/types.js",
    "./logger": "./lib/logger.js",
    "./helpers": "./lib/helpers.js",
    "./command": "./lib/command.js"
  }
}
```

**Usage:**
```typescript
import type { ForgeCommand } from '@planet57/forge/types';
```

**Pros:**
- Standard package.json exports
- No extra setup beyond our own package
- Works immediately when forge is installed

**Cons:**
- Slightly verbose: `@planet57/forge/types`
- Can't shorten to just `forge/types` easily

---

## Recommendation: Option 4 (Package Exports)

**Why:**
1. Standard Node.js/Bun feature (package.json exports)
2. No extra infrastructure needed
3. Works with NODE_PATH automatically
4. Clean imports: `@planet57/forge/types`
5. Versionable with the package
6. IDE autocomplete works

**Implementation:**
Just add to our `package.json`:
```json
"exports": {
  ".": "./bin/forge",
  "./types": "./lib/types.js",
  "./logger": "./lib/logger.js", 
  "./helpers": "./lib/helpers.js",
  "./state": "./lib/state.js"
}
```

**Example module becomes:**
```typescript
import type { ForgeCommand, ForgeContext } from '@planet57/forge/types';
import { log } from '@planet57/forge/logger';

export const say: ForgeCommand = {
  description: 'Make a cow say something',
  usage: '<text...>',
  execute: async (options, args, context: ForgeContext) => {
    log.info({ text: args.join(' ') }, 'Cow says');
    // ...
  }
};
```

Much cleaner and stable!
