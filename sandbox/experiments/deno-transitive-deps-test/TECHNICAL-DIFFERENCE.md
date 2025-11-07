# Technical Difference: Registry vs Directory

**Question**: What is the technical difference between how Deno handles registry packages vs local directories?

---

## The Key Difference

### Registry Packages (npm/JSR)

When you import from npm or JSR, Deno:

1. **Fetches package metadata** from the registry
2. Metadata includes **dependency declarations** (like package.json dependencies field)
3. Deno **recursively resolves** those declared dependencies
4. Downloads and caches the entire tree
5. **No import maps needed** - dependencies are explicit in metadata

**Example: Express**
```bash
$ deno info main.ts
dependencies: 69 unique
size: 2.1MB

npm:/express@4.21.2
├─┬ npm:/accepts@1.3.8
│ ├─┬ npm:/mime-types@2.1.35
│ │ └── npm:/mime-db@1.52.0
│ └── npm:/negotiator@0.6.3
├── npm:/array-flatten@1.1.1
├─┬ npm:/body-parser@1.20.3
  ... (69 total packages)
```

**Where does dependency info come from?**
- `npm:/express` → Fetch from npm registry
- Registry returns `package.json` with `dependencies: { "accepts": "~1.3.8", ... }`
- Deno knows to fetch those too
- Process repeats recursively

### Local Directory/File Imports

When you import from a local path, Deno:

1. **Reads the file directly** from filesystem
2. **No metadata fetch** - just TypeScript/JavaScript source
3. Parses imports in the source code
4. **Import maps are the ONLY resolution mechanism**
5. No automatic dependency discovery

**Example: forge-mock**
```bash
$ deno info user-module/command.ts
dependencies: 0 unique
size: 994B

file:///.../command.ts
└── Import "@forge/mock" not a dependency (resolve error)
```

**What happened?**
- `command.ts` imports `"@forge/mock"`
- Import map resolves to `../forge-mock/mod.ts`
- Deno reads `forge-mock/mod.ts` source
- Source has: `import { Command } from "commander"`
- **No mechanism to resolve "commander"** - it's just a bare specifier in source code
- forge-mock's `deno.json` import map doesn't apply (package-scoped)
- ERROR: Can't resolve "commander"

---

## Why The Difference?

### Registry Packages Have Explicit Metadata

**npm package.json**:
```json
{
  "name": "express",
  "version": "4.21.2",
  "dependencies": {
    "accepts": "~1.3.8",
    "body-parser": "1.20.3",
    "cookie": "0.7.1",
    ...
  }
}
```

This metadata is **separate from the source code**. Deno fetches it, parses it, and knows what to install.

### Local Directories Only Have Source Code

**forge-mock/mod.ts**:
```typescript
import { Command } from "commander";
import * as YAML from "yaml";
```

This is just source code with **bare import specifiers**. There's no separate metadata file that Deno automatically consults for dependencies.

**forge-mock/deno.json**:
```json
{
  "imports": {
    "commander": "npm:commander@^12.0.0",
    "yaml": "npm:yaml@^2.3.0"
  }
}
```

This exists, but Deno **doesn't automatically use it** when another package imports forge-mock. Import maps are **package-scoped** - they only apply to imports within that package's own code when running directly.

---

## The Resolution Process

### Registry Package Resolution

```
User code: import express from "npm:express@4"
  ↓
Deno: Fetch https://registry.npmjs.org/express/4.21.2
  ↓
Registry returns: package.json with dependencies list
  ↓
Deno: For each dependency, repeat process
  ↓
Result: Complete dependency tree downloaded
```

**Key**: Dependency information comes from **registry metadata**, not import maps.

### Local Package Resolution

```
User code: import { foo } from "@forge/mock"
  ↓
Import map: "@forge/mock" → "../forge-mock/mod.ts"
  ↓
Deno: Read ../forge-mock/mod.ts source
  ↓
Source contains: import { Command } from "commander"
  ↓
Deno: Look for "commander" in import map
  ↓
User's import map: No "commander" entry
  ↓
Result: ERROR - Can't resolve "commander"
```

**Key**: Dependency resolution relies on **import maps only**, not package metadata.

---

## Why Import Maps Are Package-Scoped

Import maps in `deno.json` are configuration for **that package's runtime environment**, not metadata about the package itself.

**Think of it like environment variables**:
- Each process has its own environment variables
- Child processes don't automatically inherit specific variables
- Must explicitly pass them through

**Same with import maps**:
- Each package has its own import map
- Importing packages don't inherit the map
- Must explicitly duplicate entries

### Contrast with package.json dependencies

`package.json` dependencies are **metadata about the package**:
- "This package needs express@4"
- "To use this package, you need these things"
- **Describes the package itself**, not just configuration

Import maps are **configuration for resolution**:
- "When I see 'commander', use npm:commander@12"
- "This is MY configuration for running MY code"
- **Describes how to run**, not what the package needs

---

## Could Deno Change This?

### Hypothetical: deno.json as Package Metadata

If Deno treated `deno.json` like npm treats `package.json`:

```json
{
  "name": "@forge/mock",
  "version": "1.0.0",
  "exports": "./mod.ts",
  "dependencies": {  // ← New: actual dependencies, not import maps
    "commander": "npm:commander@^12.0.0",
    "yaml": "npm:yaml@^2.3.0"
  }
}
```

Then Deno could:
1. Parse `dependencies` field
2. Fetch and cache those packages
3. Make them available to the package's code
4. Importing packages would get transitive deps automatically

**But this doesn't exist.** The `imports` field is for import maps (resolution), not dependency declaration.

---

## The Fundamental Issue

### Registry Packages: Two-Level System

1. **Metadata layer**: package.json declares dependencies
2. **Code layer**: Source code imports them

When you install a package, you get metadata + code. Runtime uses metadata to resolve dependencies.

### Local Packages: One-Level System

1. **Code layer only**: Source code imports things
2. **Import maps**: Configuration to resolve bare specifiers

There's no "metadata layer" that declares dependencies separate from import maps.

---

## Workarounds

### Option 1: Duplicate Import Maps

**user-module/deno.json**:
```json
{
  "imports": {
    "@forge/mock": "../forge-mock/mod.ts",
    "commander": "npm:commander@^12.0.0",  // Duplicate from forge-mock
    "yaml": "npm:yaml@^2.3.0"              // Duplicate from forge-mock
  }
}
```

**Downside**: Must know and maintain forge-mock's dependencies.

### Option 2: Publish to Registry

Publish forge-mock to npm or JSR. Then:

**user-module/deno.json**:
```json
{
  "imports": {
    "@forge/mock": "jsr:@forge/mock@^1.0.0"
  }
}
```

**Upside**: Transitive deps work automatically.
**Downside**: Lose git+ssh:// flexibility, can't develop locally.

### Option 3: Deno Workspaces (Partial)

Use workspace configuration to share import maps:

```json
{
  "workspace": ["./forge-mock", "./user-module"],
  "imports": {
    "commander": "npm:commander@^12.0.0",
    "yaml": "npm:yaml@^2.3.0"
  }
}
```

**Upside**: Shared import map across workspace.
**Downside**: Only works within a workspace, doesn't help with distributed packages.

---

## Summary

| Aspect | Registry Packages | Local Directories |
|--------|------------------|-------------------|
| **Metadata source** | package.json from registry | None (just source code) |
| **Dependency info** | Explicit in metadata | Implicit in source imports |
| **Resolution** | Registry declares deps | Import maps only |
| **Transitive deps** | Automatic | Manual (must duplicate) |
| **Why it works** | Metadata separate from code | Only have code + config |

**The fundamental difference**: Registry packages have **explicit dependency metadata** separate from source code. Local packages only have **source code + import maps**, and import maps are configuration (package-scoped), not metadata (inheritable).

---

## Impact on Forge

For forge's use case (git repos, local development, file paths):
- No dependency metadata system exists for local/git packages
- Import maps are the only resolution mechanism
- Import maps don't cross boundaries (they're configuration, not metadata)
- **Users must duplicate all dependencies**

This is why Bun's approach (treating all dependency types equally with automatic transitive resolution) is better for our use case.
