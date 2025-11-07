# Test 4: Local Directory with package.json

**Question**: Does Deno use package.json for transitive dependency resolution when importing from a local directory?

## Setup

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

**user-module/deno.json** (only lists forge, not its deps):
```json
{
  "imports": {
    "@forge/with-pkg": "../forge-with-pkg/mod.ts"
  }
}
```

## Test

```bash
deno run --allow-all user-module/command.ts
```

## Expected Outcomes

### If package.json is used ✅
- Deno reads forge-with-pkg/package.json
- Sees commander and yaml in dependencies
- Fetches them automatically
- Test passes

### If package.json is ignored ❌
- Same error as test-3
- Can't resolve "commander" from forge-with-pkg/mod.ts
- User must duplicate dependencies in their deno.json

## Run Test

```bash
cd test-4-with-package-json
deno run --allow-all user-module/command.ts
```
