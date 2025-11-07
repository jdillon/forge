# Test 4 Results: package.json Does NOT Help

**Date**: 2025-11-07
**Question**: Does Deno use package.json for transitive dependency resolution with local file imports?

---

## Result: ❌ NO

```bash
$ deno run --allow-all user-module/command.ts

error: Import "yaml" not a dependency and not in import map
from "file:///.../forge-with-pkg/mod.ts"
```

---

## What We Tested

**forge-with-pkg/package.json**:
```json
{
  "name": "@forge/with-pkg",
  "dependencies": {
    "commander": "^12.0.0",
    "yaml": "^2.3.0"
  }
}
```

**user-module/deno.json**:
```json
{
  "imports": {
    "@forge/with-pkg": "../forge-with-pkg/mod.ts"
  }
}
```

**Expected**: Deno would read package.json and resolve commander/yaml
**Actual**: Same error as test-3 - package.json completely ignored

---

## Why package.json Doesn't Help

### When Deno Uses package.json

Deno ONLY reads package.json when:

1. **Importing from npm**: `import x from "npm:package-name"`
   - Deno fetches package from npm registry
   - Registry includes the package.json
   - Deno uses dependencies field for transitive resolution

2. **node_modules compatibility mode**: When `nodeModulesDir: "auto"` or `"manual"`
   - Deno creates local node_modules
   - Reads package.json from installed packages
   - Mimics Node.js behavior

### When Deno IGNORES package.json

When importing via file path:
- `import x from "./path/to/package/mod.ts"`
- `import x from "file:///absolute/path/mod.ts"`
- Via import map: `"@pkg": "./local/package/mod.ts"`

**Deno treats this as a direct file import**:
- Reads the TypeScript/JavaScript source
- Parses imports in the source
- Does NOT check for package.json
- Does NOT use any dependency metadata

---

## The Technical Reason

### File Path Resolution is Direct

```
import from "../forge-with-pkg/mod.ts"
  ↓
Deno reads: file:///path/to/forge-with-pkg/mod.ts
  ↓
Parses imports: "commander", "yaml"
  ↓
Checks import maps only (no package.json check)
  ↓
Not found → ERROR
```

### package.json is Only for npm: Specifier

```
import from "npm:@forge/with-pkg"
  ↓
Deno fetches: https://registry.npmjs.org/@forge/with-pkg
  ↓
Gets package.json with dependencies
  ↓
Resolves transitively
  ↓
Works! ✅
```

---

## Why This Design?

### File Paths = Direct Code

When you import a file path, you're saying:
- "Import THIS specific file"
- "Treat it as TypeScript/JavaScript source"
- Not: "Import this package with metadata"

Deno doesn't infer "this is an npm-style package" from directory structure.

### npm: Specifier = Package with Metadata

When you use `npm:package-name`, you're saying:
- "Fetch this package from registry"
- "Use its metadata (package.json)"
- "Resolve dependencies"

The `npm:` prefix tells Deno to treat it as a package, not just a file.

---

## Implications

### For Local Development

**package.json does not help** when:
- Developing packages locally
- Using file path imports
- Testing before publishing

You must use **import maps** for all dependencies.

### For Published Packages

**package.json works** when:
- Package published to npm
- Users import via `npm:@your/package`
- Deno fetches from registry

---

## Could We Make It Work?

### Option 1: Use npm: with Local Package (Doesn't Work)

```json
{
  "imports": {
    "@forge/with-pkg": "npm:@forge/with-pkg@file:../forge-with-pkg"
  }
}
```

**Result**: npm: specifier expects registry URL, not file path. Doesn't work.

### Option 2: Publish to Local npm Registry

Set up local npm registry, publish package there, use npm: specifier.

**Result**: Overly complex, defeats purpose of local development.

### Option 3: Use node_modules (Hybrid Approach)

```bash
# Install package to node_modules
cd forge-with-pkg && npm install
cd ../user-module && npm install ../forge-with-pkg
```

```json
// deno.json
{
  "nodeModulesDir": "auto"
}
```

**Result**: Creates node_modules, Deno might respect package.json
**Downside**: Defeats purpose of using Deno, adds complexity

### Option 4: Duplicate in Import Maps (Current Solution)

```json
{
  "imports": {
    "@forge/with-pkg": "../forge-with-pkg/mod.ts",
    "commander": "npm:commander@^12.0.0",
    "yaml": "npm:yaml@^2.3.0"
  }
}
```

**Result**: Works, but must duplicate dependencies
**This is what we have to do** ❌

---

## Summary

| Scenario | package.json Used? | Why |
|----------|-------------------|-----|
| `npm:package` | ✅ Yes | Registry provides package.json |
| `file:./path` | ❌ No | Direct file import, no metadata check |
| Import map to file | ❌ No | Resolves to file path, treated as direct import |
| Local with nodeModulesDir | ⚠️ Maybe | If in node_modules, might work |

**For forge's use case**: package.json doesn't help. We can't use `npm:` for local/git packages, so metadata is ignored.

---

## Updated Understanding

**Original question**: "Does providing package.json help with local directories?"

**Answer**: No. Deno only uses package.json when:
1. Fetching from npm registry (npm: specifier)
2. Node.js compatibility mode (node_modules)

For file path imports (including via import maps), Deno:
- Reads source code directly
- Uses import maps for resolution
- **Ignores package.json completely**

This means our Test 3 finding stands: **Import maps don't cross boundaries, and package.json doesn't help**.
