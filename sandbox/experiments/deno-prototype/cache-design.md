# Git Clone to Cache - Design

**Solution:** Clone git repos to local cache, use import maps to resolve from cache.

This approach:
- ✅ Keeps SSH git support (no HTTPS tokens!)
- ✅ Solves module resolution (import maps control it)
- ✅ Works with Deno OR Bun
- ✅ Follows proven package manager patterns (Cargo, Go, npm)

---

## Cache Directory Structure

```
~/.local/share/forge/
├── repos/                          # Git repository cache
│   ├── github.com/
│   │   ├── jdillon/
│   │   │   └── forge-standard/     # Cloned repo
│   │   │       ├── .git/
│   │   │       ├── commands/
│   │   │       └── lib/
│   │   └── other-user/
│   │       └── other-repo/
│   └── gitlab.com/
│       └── org/
│           └── private-repo/
├── cache-state.json                # Tracks what's cached
└── node_modules/                   # npm packages (existing)
```

### Cache State File

`~/.local/share/forge/cache-state.json`:
```json
{
  "repos": {
    "github.com/jdillon/forge-standard": {
      "url": "git+ssh://git@github.com/jdillon/forge-standard.git",
      "ref": "main",
      "commit": "abc123...",
      "lastUpdated": "2025-11-03T10:00:00Z",
      "path": "~/.local/share/forge/repos/github.com/jdillon/forge-standard"
    }
  }
}
```

---

## Dependency Resolution Flow

### User Configuration

`.forge2/config.yml`:
```yaml
dependencies:
  # Git repos - will be cloned to cache
  - git+ssh://git@github.com/jdillon/forge-standard.git
  - git+ssh://git@github.com/jdillon/forge-common.git#v1.2.3  # Specific tag

  # npm packages - install to node_modules (existing)
  - yaml
  - commander
```

### Install Process

`forge install` (or `forge module install`):

```typescript
async function installDependencies(config: ForgeConfig) {
  for (const dep of config.dependencies) {
    if (dep.startsWith('git+') || dep.includes('github.com')) {
      await installGitDependency(dep);
    } else {
      await installNpmDependency(dep);  // Existing logic
    }
  }

  // Generate import map from installed dependencies
  await generateImportMap();
}

async function installGitDependency(depUrl: string) {
  // Parse: "git+ssh://git@github.com/jdillon/forge-standard.git#v1.0.0"
  const { url, ref, repoPath } = parseGitUrl(depUrl);

  // Example: github.com/jdillon/forge-standard
  const cacheKey = repoPath;
  const cachePath = `${FORGE_HOME}/repos/${cacheKey}`;

  if (await exists(cachePath)) {
    // Already cloned - update it
    await $`git -C ${cachePath} fetch`;
    await $`git -C ${cachePath} checkout ${ref}`;
  } else {
    // Clone fresh
    await $`mkdir -p ${dirname(cachePath)}`;
    await $`git clone ${url} ${cachePath}`;
    await $`git -C ${cachePath} checkout ${ref}`;
  }

  // Update cache state
  const commit = await $`git -C ${cachePath} rev-parse HEAD`.text();
  updateCacheState(cacheKey, { url, ref, commit, path: cachePath });
}
```

### Import Map Generation

After installing dependencies, generate import map:

**For Deno** (`deno.json`):
```json
{
  "imports": {
    "@jdillon/forge-standard/": "/Users/jason/.local/share/forge/repos/github.com/jdillon/forge-standard/",
    "@jdillon/forge-common/": "/Users/jason/.local/share/forge/repos/github.com/jdillon/forge-common/"
  }
}
```

**For Bun** (`bunfig.toml` or similar):
```toml
# Not sure if Bun supports this, but worth exploring
# Might need to use NODE_PATH or package linking
```

---

## Commands

### `forge install`
Install all dependencies from config.

```bash
forge install

# Output:
# Installing dependencies...
#   ✓ git+ssh://git@github.com/jdillon/forge-standard.git (cached)
#   ✓ git+ssh://git@github.com/jdillon/forge-common.git (cloning...)
#   ✓ yaml (npm)
# Generating import map...
# Done!
```

### `forge cache status`
Show what's in the cache.

```bash
forge cache status

# Output:
# Cache: ~/.local/share/forge/repos/
#
# github.com/jdillon/forge-standard
#   Ref: main (abc123...)
#   Last updated: 2 hours ago
#   Size: 1.2 MB
#
# github.com/jdillon/forge-common
#   Ref: v1.2.3 (def456...)
#   Last updated: 1 day ago
#   Size: 500 KB
#
# Total: 2 repos, 1.7 MB
```

### `forge cache clean`
Remove cached repos.

```bash
# Remove unused repos (not in any project's config)
forge cache clean

# Remove specific repo
forge cache clean github.com/jdillon/forge-standard

# Remove all
forge cache clean --all
```

### `forge cache update`
Update all cached repos (git fetch + pull).

```bash
forge cache update

# Update specific repo
forge cache update github.com/jdillon/forge-standard
```

---

## Dependency Specifications

Support various formats:

```yaml
dependencies:
  # SSH (preferred)
  - git+ssh://git@github.com/jdillon/forge-standard.git

  # HTTPS (also works)
  - https://github.com/jdillon/forge-common.git

  # With ref (branch, tag, commit)
  - git+ssh://git@github.com/jdillon/forge-standard.git#main
  - git+ssh://git@github.com/jdillon/forge-standard.git#v1.2.3
  - git+ssh://git@github.com/jdillon/forge-standard.git#abc123

  # Short form (GitHub shorthand)
  - jdillon/forge-standard              # → github.com/jdillon/forge-standard
  - jdillon/forge-standard#v1.2.3       # → with tag

  # GitLab, etc.
  - git+ssh://git@gitlab.com/org/repo.git
```

---

## Edge Cases

### Private Repos
- ✅ SSH keys work (no change from current workflow)
- ✅ HTTPS with credentials (git credential helper)
- ✅ Deploy keys (SSH)

### Monorepos
If a git repo contains multiple modules:

```yaml
dependencies:
  - git+ssh://git@github.com/org/monorepo.git

modules:
  - "@org/monorepo/packages/module-a"
  - "@org/monorepo/packages/module-b"
```

Import map:
```json
{
  "imports": {
    "@org/monorepo/": "~/.local/share/forge/repos/github.com/org/monorepo/"
  }
}
```

### Conflicting Versions
If different projects need different versions:

**Option A: Per-project cache** (like node_modules)
```
project-a/.forge2/repos/
project-b/.forge2/repos/
```

**Option B: Global cache with version dirs** (like Cargo)
```
~/.local/share/forge/repos/
  github.com/jdillon/forge-standard/
    v1.0.0/
    v1.2.3/
    main/
```

**Recommendation:** Start with Option A (per-project cache) for simplicity.

### Updates
When should repos update?

1. **Explicit** (recommended):
   - `forge cache update` to fetch latest
   - `forge install` uses cached version

2. **Automatic** (risky):
   - `forge install` always fetches latest
   - Could break reproducibility

**Recommendation:** Explicit updates only. Predictability > freshness.

---

## Implementation Phases

### Phase 1: Basic Git Clone (1-2 days)
- [ ] Parse git URLs from dependencies
- [ ] Clone to cache directory
- [ ] Track in cache-state.json
- [ ] Generate import map (Deno)

### Phase 2: Import Map Integration (1 day)
- [ ] Generate deno.json from dependencies
- [ ] Test module resolution with import maps
- [ ] Verify no self-reference issues

### Phase 3: Cache Management (1 day)
- [ ] `forge cache status` command
- [ ] `forge cache clean` command
- [ ] `forge cache update` command
- [ ] Disk space reporting

### Phase 4: Advanced Features (1-2 days)
- [ ] Support branch/tag/commit refs
- [ ] Handle updates (fetch + checkout)
- [ ] Parallel cloning
- [ ] Error handling (auth failures, network issues)

### Total: 4-6 days

---

## Comparison: All Approaches

| Approach | Module Resolution | Git Workflow | Complexity | Recommendation |
|----------|------------------|--------------|------------|----------------|
| **Bun plugins** | ❌ Can't intercept | ✅ SSH works | Low | ❌ Not viable |
| **Deno native** | ✅ Import maps | ❌ HTTPS tokens | Medium | ⚠️ Token overhead |
| **Git clone cache** | ✅ Import maps | ✅ SSH works | Medium | ✅ **Best solution** |

---

## Benefits Summary

### vs Bun Plugin Approach
- ✅ Actually works (plugins don't intercept imports)
- ✅ No experimental features or workarounds

### vs Deno Native Git Imports
- ✅ SSH support (no token management)
- ✅ Full git features (branches, tags, submodules)
- ✅ Offline support after initial clone

### vs Current NPM-only Approach
- ✅ Supports private git repos
- ✅ No need to publish to npm
- ✅ Direct from source control

### Universal Benefits
- ✅ Works with both Deno and Bun runtimes
- ✅ Follows established patterns (Cargo, Go)
- ✅ Full control over when deps update
- ✅ Can work offline after initial install

---

## Next Steps

1. **Decide on runtime**: Deno or Bun?
   - Deno: Import maps built-in
   - Bun: Need to verify import map support or alternative

2. **Implement Phase 1**: Basic git clone to cache
   - Start with simple case: one git dep
   - Verify import maps work
   - Test with forge-standard repo

3. **Test in real scenario**:
   - Clone forge-standard to cache
   - Import from it in examples/standard
   - Verify no self-reference issues

Want me to start implementing Phase 1?
