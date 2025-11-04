# Git Repository Cache Management System

## Overview

Implement a cache management system for git repositories similar to Cargo, Go modules, and npm. Instead of relying on runtime-specific git import mechanisms, **forge manages git clones directly** in a local cache directory.

This provides:
- Full control over cache lifecycle
- Works with any runtime (Bun, Deno, Node)
- SSH git support (no HTTPS token requirements)
- Offline support after initial clone
- Familiar git workflow

## Motivation

**Problem with runtime-native git imports:**
- Deno doesn't support `git+ssh://` URLs (requires HTTPS + tokens)
- Bun doesn't have native git import support
- Node.js doesn't have native git import support

**Solution: Manage clones ourselves**

Like Cargo and Go modules, clone repos to a local cache and use import maps to resolve from there. This is **runtime-agnostic** and gives us full control.

## Cache Architecture

### Directory Structure

```
~/.local/share/forge/
├── repos/                          # Git repository cache
│   ├── github.com/
│   │   ├── jdillon/
│   │   │   └── forge-standard/     # Cloned repo
│   │   │       ├── .git/           # Full git repo
│   │   │       ├── commands/
│   │   │       └── lib/
│   │   └── other-user/
│   │       └── other-repo/
│   ├── gitlab.com/
│   │   └── org/
│   │       └── private-repo/
│   └── git.company.com/            # Custom git hosts
│       └── internal/
│           └── modules/
├── cache-state.json                # Cache metadata
└── node_modules/                   # npm packages (existing)
```

### Cache State File

Track cached repositories in `~/.local/share/forge/cache-state.json`:

```json
{
  "version": "1.0",
  "repos": {
    "github.com/jdillon/forge-standard": {
      "url": "git+ssh://git@github.com/jdillon/forge-standard.git",
      "ref": "main",
      "commit": "abc123def456...",
      "lastUpdated": "2025-11-03T10:00:00Z",
      "lastChecked": "2025-11-03T12:00:00Z",
      "path": "~/.local/share/forge/repos/github.com/jdillon/forge-standard",
      "diskUsage": 1234567,
      "projects": [
        "/Users/jason/projects/my-app",
        "/Users/jason/projects/other-app"
      ]
    }
  },
  "stats": {
    "totalRepos": 5,
    "totalDiskUsage": 12345678,
    "lastCleanup": "2025-11-01T00:00:00Z"
  }
}
```

## Commands

### `forge cache status`

Show what's in the cache with detailed information.

**Usage:**
```bash
# Show all cached repos
forge cache status

# Show specific repo
forge cache status github.com/jdillon/forge-standard

# Show with disk usage details
forge cache status --verbose
```

**Example output:**
```
Cache: ~/.local/share/forge/repos/

github.com/jdillon/forge-standard
  URL: git+ssh://git@github.com/jdillon/forge-standard.git
  Ref: main (abc123d...)
  Last updated: 2 hours ago
  Last checked: 10 minutes ago
  Size: 1.2 MB
  Used by: 2 projects

github.com/jdillon/forge-common
  URL: git+ssh://git@github.com/jdillon/forge-common.git
  Ref: v1.2.3 (def456a...)
  Last updated: 1 day ago
  Last checked: 1 day ago
  Size: 500 KB
  Used by: 1 project

gitlab.com/company/internal
  URL: git+ssh://git@gitlab.com/company/internal.git
  Ref: develop (789xyz1...)
  Last updated: 3 days ago
  Last checked: 3 days ago
  Size: 3.4 MB
  Used by: 1 project

Total: 3 repos, 5.1 MB
```

### `forge cache clean`

Remove cached repositories to free disk space.

**Usage:**
```bash
# Remove unused repos (not referenced by any project)
forge cache clean

# Remove specific repo
forge cache clean github.com/jdillon/forge-standard

# Remove all cached repos
forge cache clean --all

# Dry run (show what would be removed)
forge cache clean --dry-run
```

**Example output:**
```
Cleaning cache...

Checking for unused repos...
  ✓ github.com/old-user/archived-repo (not used, 2.3 MB)
  ✓ gitlab.com/test/experiment (not used, 500 KB)

Would remove 2 repos, freeing 2.8 MB

Run with --confirm to remove
```

**Safety features:**
- Prompt before deleting
- Don't delete repos used by active projects
- Dry run mode to preview
- Can restore from git URL (non-destructive)

### `forge cache update`

Update cached repositories (fetch latest changes).

**Usage:**
```bash
# Update all cached repos
forge cache update

# Update specific repo
forge cache update github.com/jdillon/forge-standard

# Update and show what changed
forge cache update --verbose
```

**Example output:**
```
Updating cached repositories...

github.com/jdillon/forge-standard
  Fetching from origin...
  ✓ Up to date (main: abc123d...)

github.com/jdillon/forge-common
  Fetching from origin...
  ✓ Updated: v1.2.2 → v1.2.3
    - 3 new commits
    - Release notes: Bug fixes and improvements

gitlab.com/company/internal
  Fetching from origin...
  ✓ Updated: 5 new commits on develop

Updated 2 of 3 repos
```

### `forge cache verify`

Verify cache integrity (git repos are healthy, no corruption).

**Usage:**
```bash
forge cache verify
```

**Example output:**
```
Verifying cache integrity...

✓ github.com/jdillon/forge-standard - OK
✓ github.com/jdillon/forge-common - OK
✗ gitlab.com/company/internal - CORRUPT
  Error: fatal: not a git repository

3 repos checked, 1 issue found

Run 'forge cache repair' to fix issues
```

### `forge cache repair`

Repair corrupted cache entries (re-clone if needed).

**Usage:**
```bash
forge cache repair

# Repair specific repo
forge cache repair gitlab.com/company/internal
```

## Implementation Details

### Git Clone Strategy

**On first install:**
```typescript
async function installGitDependency(depUrl: string) {
  const { host, org, repo, ref } = parseGitUrl(depUrl);
  const cacheKey = `${host}/${org}/${repo}`;
  const cachePath = `${FORGE_HOME}/repos/${cacheKey}`;

  if (await exists(cachePath)) {
    // Already cloned - fetch and checkout ref
    await $`git -C ${cachePath} fetch --all`;
    await $`git -C ${cachePath} checkout ${ref || 'main'}`;
    await $`git -C ${cachePath} pull`;
  } else {
    // Clone fresh
    await $`mkdir -p ${dirname(cachePath)}`;
    await $`git clone ${depUrl.replace(/#.*$/, '')} ${cachePath}`;
    if (ref) {
      await $`git -C ${cachePath} checkout ${ref}`;
    }
  }

  // Update cache state
  const commit = await $`git -C ${cachePath} rev-parse HEAD`.text();
  await updateCacheState(cacheKey, {
    url: depUrl,
    ref: ref || 'main',
    commit: commit.trim(),
    lastUpdated: new Date().toISOString(),
    path: cachePath,
  });
}
```

### Cache State Management

**Update tracking:**
```typescript
interface CacheState {
  version: string;
  repos: Record<string, RepoCache>;
  stats: CacheStats;
}

interface RepoCache {
  url: string;
  ref: string;
  commit: string;
  lastUpdated: string;
  lastChecked: string;
  path: string;
  diskUsage?: number;
  projects?: string[];  // Projects using this repo
}

async function updateCacheState(key: string, updates: Partial<RepoCache>) {
  const state = await loadCacheState();
  state.repos[key] = {
    ...state.repos[key],
    ...updates,
    lastChecked: new Date().toISOString(),
  };
  await saveCacheState(state);
}

async function trackProjectUsage(repoKey: string, projectPath: string) {
  const state = await loadCacheState();
  if (!state.repos[repoKey].projects) {
    state.repos[repoKey].projects = [];
  }
  if (!state.repos[repoKey].projects.includes(projectPath)) {
    state.repos[repoKey].projects.push(projectPath);
  }
  await saveCacheState(state);
}
```

### Disk Usage Tracking

**Calculate and cache disk usage:**
```typescript
async function calculateDiskUsage(repoPath: string): Promise<number> {
  const output = await $`du -sk ${repoPath}`.text();
  const kb = parseInt(output.split('\t')[0]);
  return kb * 1024; // Return bytes
}

async function updateDiskUsage(repoKey: string) {
  const state = await loadCacheState();
  const repo = state.repos[repoKey];
  repo.diskUsage = await calculateDiskUsage(repo.path);
  await saveCacheState(state);
}
```

## Dependency Specifications

Support various git URL formats:

```yaml
dependencies:
  # SSH (preferred)
  - git+ssh://git@github.com/jdillon/forge-standard.git

  # HTTPS (also works)
  - https://github.com/jdillon/forge-common.git

  # With specific ref (branch, tag, commit)
  - git+ssh://git@github.com/jdillon/repo.git#main
  - git+ssh://git@github.com/jdillon/repo.git#v1.2.3
  - git+ssh://git@github.com/jdillon/repo.git#abc123def

  # GitHub shorthand
  - jdillon/forge-standard              # → github.com/jdillon/forge-standard
  - jdillon/forge-standard#v1.2.3       # → with tag

  # GitLab, custom hosts
  - git+ssh://git@gitlab.com/org/repo.git
  - git+ssh://git@git.company.com/internal/modules.git
```

## Update Strategies

### Strategy 1: Explicit Updates (Recommended)

**Behavior:**
- `forge install` uses cached version (no network)
- `forge cache update` explicitly fetches latest

**Pros:**
- ✅ Fast installs (no network required)
- ✅ Predictable behavior
- ✅ Works offline
- ✅ No surprise breakage

**Cons:**
- ⚠️ User must remember to update
- ⚠️ Might miss important updates

### Strategy 2: Check on Install

**Behavior:**
- `forge install` checks remote for updates
- Only downloads if new commits

**Pros:**
- ✅ Automatically stays current
- ✅ Only fetches if needed

**Cons:**
- ⚠️ Slower installs (network check)
- ⚠️ Fails without network
- ⚠️ Can break unexpectedly

### Strategy 3: Time-based Check

**Behavior:**
- Check remote if last check > N hours ago
- Configurable threshold

**Pros:**
- ✅ Balance between fresh and fast
- ✅ Configurable

**Cons:**
- ⚠️ Complex to implement
- ⚠️ Still has network dependency

**Recommendation:** Start with Strategy 1 (explicit), add Strategy 3 later as config option.

## Cache Cleanup Policies

### Manual Cleanup
User-triggered via `forge cache clean`.

### Automatic Cleanup (Future)
```yaml
# .forge2/config.yml
cache:
  maxSize: 1GB          # Max total cache size
  maxAge: 90d           # Remove repos not used in 90 days
  autoClean: weekly     # Run cleanup weekly
```

### Smart Cleanup
- Track last accessed time
- Track project references
- Never delete if used by active project
- Prompt before deleting repos with uncommitted changes

## Integration with Import Maps

After cloning, generate import maps pointing to cache:

**Bun (tsconfig.json):**
```json
{
  "compilerOptions": {
    "paths": {
      "@jdillon/forge-standard/*": [
        "~/.local/share/forge/repos/github.com/jdillon/forge-standard/*"
      ]
    }
  }
}
```

**Deno (deno.json):**
```json
{
  "imports": {
    "@jdillon/forge-standard/": "~/.local/share/forge/repos/github.com/jdillon/forge-standard/"
  }
}
```

**This is runtime-agnostic - same cache, different import map formats.**

## Benefits

### Runtime Agnostic
- ✅ Works with Bun, Deno, Node, or any other runtime
- ✅ Same cache directory for all runtimes
- ✅ Just generate different import map format

### SSH Git Support
- ✅ Use SSH keys (no HTTPS tokens needed!)
- ✅ Works with deploy keys
- ✅ Works with SSH agent
- ✅ Familiar git workflow

### Full Git Features
- ✅ Branches, tags, commits
- ✅ Submodules
- ✅ Git history
- ✅ Can make local changes for debugging

### Offline Support
- ✅ Works offline after initial clone
- ✅ Fast installs (no network required)
- ✅ No dependency on remote availability

### Proven Pattern
- ✅ Cargo does this (Rust)
- ✅ Go modules do this
- ✅ npm/yarn do similar (tarballs instead of git)
- ✅ Battle-tested approach

## Edge Cases

### Concurrent Installs
**Problem:** Multiple `forge install` running simultaneously.

**Solution:**
- Lock file per repo during clone/update
- Wait for lock or skip if already being cloned
- Release lock after operation

### Disk Space
**Problem:** Cache grows unbounded.

**Solution:**
- Track disk usage in cache-state.json
- Warn at 1GB, 5GB, 10GB thresholds
- Provide cleanup commands
- Future: Automatic cleanup policies

### Corrupted Repos
**Problem:** Git repo becomes corrupted.

**Solution:**
- `forge cache verify` detects corruption
- `forge cache repair` re-clones
- Always keep URL in cache-state for re-cloning

### Network Failures
**Problem:** Clone/fetch fails due to network.

**Solution:**
- Retry with exponential backoff
- Fall back to cached version if exists
- Clear error messages
- Don't leave partial clones

### Private Repos
**Problem:** Authentication for private repos.

**Solution:**
- SSH: Use existing SSH agent (works automatically)
- HTTPS: Use git credential helper (user configures once)
- Document setup in forge docs

## Implementation Plan

### Phase 1: Core Cache System (2 days)
- [ ] Cache directory structure
- [ ] Cache state file (JSON)
- [ ] Git clone logic
- [ ] Git fetch/update logic
- [ ] Parse git URLs

### Phase 2: Cache Commands (2 days)
- [ ] `forge cache status`
- [ ] `forge cache clean`
- [ ] `forge cache update`
- [ ] `forge cache verify`
- [ ] Disk usage tracking

### Phase 3: Integration (1 day)
- [ ] Integrate with `forge install`
- [ ] Generate import maps from cache
- [ ] Track project usage
- [ ] Error handling

### Phase 4: Advanced Features (1-2 days)
- [ ] Parallel cloning
- [ ] Lock file support
- [ ] Automatic cleanup policies
- [ ] Cache repair command

**Total: 6-7 days**

## Testing Strategy

### Unit Tests
- URL parsing
- Cache state management
- Disk usage calculation

### Integration Tests
- Clone to cache
- Update cached repo
- Clean unused repos
- Verify integrity

### Manual Tests
- Real private repos (SSH)
- Network failures
- Concurrent operations
- Disk space limits

## Success Metrics

- [ ] Can clone git repos to cache
- [ ] Can update cached repos
- [ ] Can clean cache
- [ ] Cache state tracks all repos
- [ ] Disk usage reported accurately
- [ ] Works with SSH git URLs
- [ ] Works offline after initial clone
- [ ] Handles network failures gracefully
- [ ] Multiple projects can share cache

## Related Issues

- Enables: #21 (Git Dependencies via Import Maps)
- Similar to: Cargo git dependencies, Go modules

## References

### Internal Documentation
- Cache design: `sandbox/experiments/deno-prototype/cache-design.md`
- Deno evaluation: `sandbox/experiments/deno-prototype/findings.md`
- Bun tsconfig: `sandbox/experiments/bun-tsconfig-paths/findings.md`

### External References
- Cargo git dependencies: https://doc.rust-lang.org/cargo/reference/specifying-dependencies.html#specifying-dependencies-from-git-repositories
- Go modules: https://go.dev/ref/mod#vcs
- npm cache: https://docs.npmjs.com/cli/v10/commands/npm-cache

## Future Enhancements

- [ ] Shallow clones (`--depth 1`) for faster downloads
- [ ] Sparse checkouts for monorepos
- [ ] Mirror support (custom git registry)
- [ ] Cache compression
- [ ] Cache analytics (most used repos, etc.)
- [ ] Lock file for reproducible installs (like package-lock.json)
- [ ] Integration with CI/CD (cache sharing)

---

**Labels:** `enhancement`, `infrastructure`
**Depends on:** None (standalone feature)
**Enables:** #21 (Git Dependencies)
**Estimate:** 6-7 days
