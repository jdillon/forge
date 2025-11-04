# Research: Custom Modules Directory in Bun

**Date:** 2025-11-03
**Question:** Can Bun use a different directory name instead of `node_modules` (e.g., `forge_modules`)?
**Answer:** No, Bun does not support this.

---

## Why This Would Be Useful

If we could tell Bun to use `forge_modules` instead of `node_modules`, it would solve our self-reference problem:

### The Problem (Current Behavior)
```
/Users/jason/ws/jdillon/forge/
├── package.json            # name: "@planet57/forge"
├── lib/
├── tests/
│   └── fixtures/
│       └── test-project/
│           └── .forge2/
│               └── test.ts  # imports '@planet57/forge'
└── node_modules/           # Standard location
    └── @planet57/forge/    # When installed for testing
```

**What happens:**
- `test.ts` imports `@planet57/forge`
- Bun finds `package.json` in parent directory (self-reference)
- Resolves to **local source** instead of **installed package**
- Double-loading, singleton breaks

### If We Could Use Custom Directory (Hypothetical)
```
/Users/jason/ws/jdillon/forge/
├── package.json            # name: "@planet57/forge"
├── lib/
├── tests/
│   └── fixtures/
│       └── test-project/
│           └── .forge2/
│               └── test.ts  # imports '@planet57/forge'
└── forge_modules/          # Custom directory name
    └── @planet57/forge/    # Installed package
```

**What WOULD happen:**
- `test.ts` imports `@planet57/forge`
- Bun looks for `node_modules` (standard name)
- Doesn't find it locally (we're using `forge_modules`)
- **No self-reference possible!**
- Falls back to configured `forge_modules` location
- Resolves to **installed package** ✓

**Result:** Self-reference problem solved without plugins!

---

## What Bun Actually Supports

### 1. tsconfig.json Path Mapping ✅
```json
{
  "compilerOptions": {
    "paths": {
      "myapp/*": ["./src/*"],
      "@components/*": ["./src/components/*"]
    }
  }
}
```

**Purpose:** Alias imports, avoid long relative paths
**Limitation:** Doesn't change where packages are installed or resolved from
**Our use case:** ❌ Doesn't help - self-reference happens before paths are checked

---

### 2. NODE_PATH Environment Variable ✅
```bash
NODE_PATH=/custom/path bun run script.ts
```

**Purpose:** Add additional search paths
**Limitation:** Only a **fallback** after standard resolution
**Resolution order:**
1. Package self-reference (happens first)
2. node_modules walk-up
3. NODE_PATH (fallback)

**Our use case:** ❌ Doesn't help - self-reference happens before NODE_PATH

---

### 3. Global Cache Location ✅
```toml
# bunfig.toml
[install.cache]
dir = "/custom/cache/location"
```

**Purpose:** Change where Bun caches downloaded packages
**Limitation:** Only affects cache, not runtime resolution
**Our use case:** ❌ Doesn't help - cache is separate from resolution

---

### 4. Auto-install Behavior ✅
```toml
# bunfig.toml
[install]
auto = "fallback"  # or "auto", "force", "disable"
```

**Purpose:** Control when Bun auto-installs missing packages
**Limitation:** Doesn't change resolution paths
**Our use case:** ❌ Doesn't help - doesn't affect where modules are found

---

## What Bun Does NOT Support

### ❌ Custom node_modules Directory Name
**Desired:**
```toml
# bunfig.toml (DOESN'T EXIST)
[install]
modulesDir = "forge_modules"
```

**Status:** Not available in any Bun version
**Alternative:** None - Bun hardcodes `node_modules` in its resolution algorithm

---

### ❌ Custom node_modules Location
**Desired:**
```toml
# bunfig.toml (DOESN'T EXIST)
[install]
modulesPath = "/custom/location/node_modules"
```

**Status:** Not available
**Note:** `bun install` always creates `node_modules` in the directory containing `package.json`

---

### ❌ Disable Package Self-Reference
**Desired:**
```toml
# bunfig.toml (DOESN'T EXIST)
[runtime]
disableSelfReference = true
```

**Status:** Not available
**Workaround:** None without using plugins

---

### ❌ Resolution Priority Control
**Desired:**
```toml
# bunfig.toml (DOESN'T EXIST)
[runtime]
resolutionOrder = ["NODE_PATH", "node_modules", "self"]
```

**Status:** Not available
**Reality:** Resolution order is fixed in Bun's implementation

---

## Comparison with Other Runtimes

### Node.js
- ❌ No custom node_modules directory
- ✅ NODE_PATH support (same limitations as Bun)
- ❌ No self-reference (feature specific to Bun)

### Deno
- ✅ No node_modules at all by default
- ✅ Import maps for URL remapping
- ✅ Different architecture (URL-based imports)

### pnpm
- ✅ Uses symlinks but still named `node_modules`
- ✅ Can configure store location
- ❌ Can't change directory name

**Conclusion:** No JavaScript runtime supports renaming `node_modules`

---

## Why This Limitation Exists

### Historical Reasons
1. **Ecosystem compatibility** - npm, yarn, pnpm, Node.js all use `node_modules`
2. **Tooling expectations** - Editors, bundlers, linters hardcode `node_modules`
3. **CommonJS spec** - `require()` algorithm defines `node_modules` lookup
4. **ESM spec** - Package resolution walks up looking for `node_modules`

### Bun-Specific Reasons
1. **Node.js compatibility** - Bun aims to be a drop-in replacement
2. **Ecosystem integration** - Works with existing npm packages
3. **Resolution performance** - Hardcoded strings are faster than config lookups

---

## Impact on Our Problem

**Bad News:** Can't use directory renaming to avoid self-reference
**Good News:** This eliminates one option, narrowing our choices

### Remaining Options (from bun-resolution-problem.md)

**Option A: Runtime Plugin** ⭐
- Intercept resolution before self-reference
- Force rewrites to FORGE_NODE_MODULES
- See: [plugin-viability-plan.md](plugin-viability-plan.md)

**Option B: Copy Fixtures**
- Copy fixtures outside project before tests
- No self-reference possible
- Straightforward but more setup

**Option C: Move Fixtures Permanently**
- Store fixtures outside project tree
- Clean separation
- More complex project structure

**Option D: Dev-Mode Testing Only**
- Accept fixtures always test local source
- Simplest approach
- No installed package validation

---

## Recommendation

**Proceed with Plugin Testing** ([plugin-viability-plan.md](plugin-viability-plan.md))

Since we can't avoid self-reference through configuration:
1. Test if runtime plugins can intercept before self-reference
2. If plugins work → Clean solution without restructuring
3. If plugins fail → Fall back to Option B (copy fixtures)

**Why not give up?**
- Custom directory would have been simplest, but not available
- Plugin approach is still viable and more powerful
- Other runtimes don't offer this either (not a Bun-specific gap)

---

## Future Considerations

### Feature Request to Bun?

**Proposed:**
```toml
# bunfig.toml
[runtime]
modulesDirectory = "custom_modules"  # Rename node_modules
```

**Likelihood:** Low
- Breaks ecosystem compatibility
- Would confuse tooling
- Limited use case

**Better request:**
```toml
# bunfig.toml
[runtime]
selfReference = false  # Disable package self-reference
```

**Likelihood:** Medium
- Addresses specific use case (testing, monorepos)
- Doesn't break ecosystem
- Opt-in behavior

**Should we file an issue?**
- Wait until we've tested plugins thoroughly
- If plugins don't work, this becomes more valuable
- Include our use case as motivation

---

## Related Research

- [bun-resolution-problem.md](bun-resolution-problem.md) - Original problem analysis
- [plugin-viability-plan.md](plugin-viability-plan.md) - Testing plan for plugin approach
- [phase3-test-framework.md](../docs/wip/module-system/phase3-test-framework.md) - Test framework design

---

## Summary

**Q:** Can Bun use `forge_modules` instead of `node_modules`?
**A:** No - hardcoded in resolution algorithm, no configuration available

**Q:** Why would this help?
**A:** Would prevent package self-reference, solving our double-loading problem

**Q:** Any workarounds?
**A:** Runtime plugins (Option A) or restructuring fixtures (Options B/C)

**Q:** Worth requesting from Bun team?
**A:** Maybe, but after we've exhausted other options

**Next Step:** Proceed with plugin viability testing (Phase 1)
