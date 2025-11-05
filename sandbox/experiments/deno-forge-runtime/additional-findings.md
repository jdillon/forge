# Additional Findings - Git Dependency Handling

**Date:** 2025-11-04
**Context:** Analyzing full migration requirements

---

## Critical Discovery: Bun.spawn in lib/forge-home.ts

### Current Implementation

**File:** `lib/forge-home.ts:179`
```typescript
const proc = Bun.spawn(['bun', 'add', dep], {
  cwd: forgeHome,
  stdout: 'pipe',
  stderr: 'pipe',
});
```

**Problem:** This won't work with Deno. `bun add` is Bun-specific.

---

## Dependency Types to Handle

Current Forge supports three dependency types in `config.yml`:

### 1. npm packages
```yaml
dependencies:
  - cowsay@^1.6.0
```

**Bun:** `bun add cowsay@^1.6.0`
**Deno:** Import map in `deno.jsonc`
```jsonc
{
  "imports": {
    "cowsay": "npm:cowsay@^1.6.0"
  }
}
```

**Action:** No runtime installation needed! Deno handles via imports.

### 2. file: URLs (local packages)
```yaml
dependencies:
  - file:../forge-standard
```

**Bun:** `bun add file:../forge-standard` (creates symlink)
**Deno:** Need custom handling

**Options:**
- Copy to forge-home for testing
- Use import map to point to source
- Symlink (like Bun)

**For POC:** Use import maps pointing to source path.

### 3. git URLs (remote repositories)
```yaml
dependencies:
  - git+ssh://github.com/planet57/forge-standard.git
  - git+https://github.com/user/repo.git#v1.0.0
```

**Bun:** `bun add git+ssh://...` (clones and installs)
**Deno:** Need custom git clone handling

**Implementation:**
```typescript
import $ from 'dax';

async function installGitDependency(dep: string, targetPath: string) {
  const gitUrl = dep.replace('git+', '');

  // Parse branch/tag if present (e.g., #v1.0.0)
  const [url, ref] = gitUrl.split('#');

  // Clone
  await $`git clone ${url} ${targetPath}`;

  // Checkout specific ref if provided
  if (ref) {
    await $`git checkout ${ref}`.cwd(targetPath);
  }
}
```

**Benefits of custom implementation:**
- ✅ SSH keys work (no HTTPS token management!)
- ✅ Full control over git operations
- ✅ Can implement update/pull logic
- ✅ Can cache clones for performance

---

## Migration Strategy

### Phase 1: npm packages (Easy - No Code)
Just declare in `deno.jsonc` imports. Deno downloads on first use.

### Phase 2: file: URLs (Medium - POC Scope)
**For POC:** Use import maps pointing directly to file paths:
```jsonc
{
  "imports": {
    "@planet57/forge-standard": "file:///absolute/path/to/forge-standard/mod.ts"
  }
}
```

**For production:** Implement copy/symlink to forge-home.

### Phase 3: git URLs (Medium - Post-POC)
Implement custom git clone handling in `lib/forge-home.ts`.

**Required changes:**
1. Replace `Bun.spawn(['bun', 'add', ...])` with git clone logic
2. Parse git URL formats (git+ssh, git+https, github:, gitlab:)
3. Handle branches/tags/commits (#ref syntax)
4. Clone to `forge-home/repos/` directory
5. Update import maps to point to cloned paths

---

## Recommended Approach for Migration

### Immediate (POC)
1. **npm packages:** Add to deno.jsonc imports (works immediately)
2. **file: URLs:** Use direct import map references (no copying)
3. **git URLs:** Skip for POC or use pre-cloned local paths

### Full Migration (Day 2-3)
1. Implement git clone handling
2. Test with file: URLs first
3. Test with git+ssh:// URLs
4. Handle edge cases (existing clones, updates, etc.)

---

## Code Changes Required

### lib/forge-home.ts

**Current function:** `installDependency(dep: string)`
```typescript
export async function installDependency(dep: string): Promise<boolean> {
  const proc = Bun.spawn(['bun', 'add', dep], { ... });
  // ...
}
```

**New implementation:**
```typescript
import $ from 'dax';

export async function installDependency(dep: string): Promise<boolean> {
  await ensureForgeHome();
  const forgeHome = getForgeHomePath();

  // npm package - update deno.jsonc
  if (!dep.startsWith('file:') && !dep.startsWith('git+')) {
    await addToDenoConfig(dep);  // New helper function
    return true;  // Config changed, may need restart
  }

  // file: URL - copy or symlink
  if (dep.startsWith('file:')) {
    const srcPath = dep.replace('file:', '');
    const pkgName = extractPackageName(dep);
    const targetPath = join(forgeHome, 'modules', pkgName);

    // Option A: Copy
    await $`cp -r ${srcPath} ${targetPath}`;

    // Option B: Symlink (faster, but requires source stability)
    // await $`ln -s ${srcPath} ${targetPath}`;

    await addToDenoConfig(pkgName, targetPath);
    return true;
  }

  // git URL - clone
  if (dep.startsWith('git+')) {
    const gitUrl = dep.replace('git+', '');
    const [url, ref] = gitUrl.split('#');
    const pkgName = extractPackageName(dep);
    const targetPath = join(forgeHome, 'repos', pkgName);

    // Clone if not exists
    if (!existsSync(targetPath)) {
      await $`git clone ${url} ${targetPath}`;
    }

    // Checkout specific ref if provided
    if (ref) {
      await $`git checkout ${ref}`.cwd(targetPath);
    }

    await addToDenoConfig(pkgName, targetPath);
    return true;
  }

  throw new Error(`Unknown dependency format: ${dep}`);
}

// New helper
async function addToDenoConfig(pkgName: string, path?: string) {
  const configPath = join(getForgeHomePath(), 'deno.jsonc');
  // Read existing config
  // Add to imports
  // Write back
}
```

---

## Testing Strategy

### Test with file: URLs first
```yaml
# examples/standard/.forge2/config.yml
dependencies:
  - file:../../packages/forge-standard
```

**Expected:**
1. Forge reads config
2. Calls `installDependency('file:../../packages/forge-standard')`
3. Function handles file: URL
4. Creates import map entry
5. Modules load successfully

### Then test with npm packages
```yaml
dependencies:
  - cowsay@^1.6.0
```

**Expected:**
1. Added to deno.jsonc imports
2. Deno downloads on first use
3. Works immediately

### Finally test with git URLs (if time permits)
```yaml
dependencies:
  - git+ssh://github.com/planet57/forge-standard.git#main
```

**Expected:**
1. Git clone executed
2. Cloned to forge-home/repos/
3. Import map created
4. Modules load successfully

---

## Missing Items from Initial Plan

1. **Bun.spawn replacement** - Not just file I/O, also process spawning
2. **Git clone logic** - Need to implement from scratch
3. **deno.jsonc management** - Need to read/write programmatically
4. **Import map generation** - Dynamic based on installed deps

**Updated timeline:**
- Previous estimate: 3-4 days
- With git handling: **4-5 days**
- POC scope (file: URLs only): **3-4 days**

---

## Recommendations

### For POC (This Week)
1. ✅ Focus on core runtime (completed)
2. ✅ Test basic commands (completed)
3. ⏭️ Test npm packages via import maps (easy)
4. ⏭️ Test file: URLs with direct paths (medium)
5. ⏸️ Defer git clone implementation (post-POC)

### For Full Migration
1. Implement git clone handling (~1 day)
2. Test all three dependency types
3. Handle edge cases (updates, cache, etc.)

---

## Conclusion

**Good news:** The git dependency issue is solvable and actually gives us MORE control than Bun.

**Better news:** Using custom git clone means SSH keys work perfectly (no HTTPS token issue!).

**Trade-off:** Need to implement git handling ourselves, but it's straightforward with dax.

**POC strategy:** Start with file: URLs (easiest), prove the approach works, then implement git clone.
