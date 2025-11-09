# Version Handling Strategy

**Date**: 2025-11-09
**Status**: Proposal
**Context**: Version management for active development workflow

---

## Requirements

**Dev workflow:**
1. Make changes, commit, push to `main` or `release` branch
2. Run update command or re-run installer
3. `--version` should clearly show when code changed
4. No manual version bumps during active dev
5. Simple and automatic

**Version display needs:**
- Quick check: `forge --version` shows version changed
- Detailed: `forge version` shows comprehensive info
- Must work with package.json ecosystem
- Clear distinction between releases and dev builds

---

## The Challenge

**Competing needs:**
1. **package.json version** - Ecosystem expects semver here
2. **Git state** - Source of truth for "what code is this?"
3. **Install time** - When was this version installed?
4. **Runtime performance** - Don't want to run git commands on every invocation

**Questions:**
- When do we generate version info?
- Where do we store it?
- How do we display it?
- How do we keep it in sync with package.json?

---

## Proposed Solution: Install-Time Generation

### Overview

Generate version information at **install time**, combining:
- Base version from package.json
- Git commit hash (short + full)
- Git commit timestamp
- Git branch name
- Dirty state (uncommitted changes)

Store in `forge-home/version.json` and read at runtime.

### Version Format (Semver Compatible)

**Format:** `{version}+{date}.{hash}`

**Examples:**
```
Development builds:
  2.0.0-dev+20251109.abc1234

Alpha releases:
  2.0.0-alpha.1+20251109.abc1234

Release candidates:
  2.0.0-rc.1+20251109.abc1234

Stable releases:
  2.0.0+20251109.abc1234
```

**Why this format:**
- Semver compliant (build metadata after `+`)
- Date lets you see "how fresh" the install is
- Hash lets you identify exact commit
- Build metadata doesn't affect version precedence

### Implementation

#### 1. Version Data Structure

**File:** `forge-home/version.json`

```json
{
  "version": "2.0.0-dev",
  "hash": "abc1234",
  "hashFull": "abc1234567890abcdef1234567890abcdef12345",
  "timestamp": "2025-11-09T15:30:00Z",
  "timestampUnix": 1731166200,
  "branch": "main",
  "dirty": false,
  "semver": "2.0.0-dev+20251109.abc1234"
}
```

**Fields:**
- `version` - From package.json (base version)
- `hash` - Short git hash (7 chars)
- `hashFull` - Full git hash
- `timestamp` - ISO 8601 timestamp of commit
- `timestampUnix` - Unix timestamp (easier for comparisons)
- `branch` - Git branch at install time
- `dirty` - Had uncommitted changes when installed?
- `semver` - Computed full semver string (for display)

#### 2. Generation Script (in install.sh)

**Add to install.sh:**

```bash
# Generate version.json
echo "Generating version information..."

VERSION=$(node -p "require('./package.json').version")
HASH=$(git rev-parse --short HEAD)
HASH_FULL=$(git rev-parse HEAD)
TIMESTAMP=$(git log -1 --format=%cI HEAD)
TIMESTAMP_UNIX=$(git log -1 --format=%ct HEAD)
BRANCH=$(git rev-parse --abbrev-ref HEAD)
DIRTY=$(git diff-index --quiet HEAD && echo "false" || echo "true")

# Extract date component (YYYYMMDD) from timestamp
DATE=$(echo "$TIMESTAMP" | cut -d'T' -f1 | tr -d '-')

# Build semver string
SEMVER="${VERSION}+${DATE}.${HASH}"

cat > version.json <<EOF
{
  "version": "$VERSION",
  "hash": "$HASH",
  "hashFull": "$HASH_FULL",
  "timestamp": "$TIMESTAMP",
  "timestampUnix": $TIMESTAMP_UNIX,
  "branch": "$BRANCH",
  "dirty": $DIRTY,
  "semver": "$SEMVER"
}
EOF

echo "Version: $SEMVER"
```

#### 3. Runtime API (lib/version.ts)

```typescript
import { join } from 'node:path';
import { readFile } from 'node:fs/promises';
import { getForgeHome } from './forge-home';

export interface VersionInfo {
  version: string;        // Base version (from package.json)
  hash: string;           // Short git hash
  hashFull: string;       // Full git hash
  timestamp: string;      // ISO 8601
  timestampUnix: number;  // Unix timestamp
  branch: string;         // Git branch
  dirty: boolean;         // Uncommitted changes?
  semver: string;         // Full semver string
}

/**
 * Get version information.
 * Reads from version.json generated at install time.
 */
export async function getVersion(): Promise<VersionInfo> {
  const forgeHome = getForgeHome();
  const versionFile = join(forgeHome, 'version.json');

  try {
    const content = await readFile(versionFile, 'utf-8');
    return JSON.parse(content);
  } catch (error) {
    // Fallback if version.json missing (shouldn't happen)
    return {
      version: 'unknown',
      hash: 'unknown',
      hashFull: 'unknown',
      timestamp: new Date().toISOString(),
      timestampUnix: Date.now() / 1000,
      branch: 'unknown',
      dirty: false,
      semver: 'unknown'
    };
  }
}

/**
 * Get semver string for --version flag.
 * Fast: just the version string, no extra details.
 */
export async function getVersionString(): Promise<string> {
  const info = await getVersion();
  return info.semver;
}
```

#### 4. CLI Usage

**Quick version (--version flag):**

```typescript
// In cli.ts, handle --version early
if (process.argv.includes('--version') || process.argv.includes('-v')) {
  const version = await getVersionString();
  console.log(`forge version ${version}`);
  process.exit(0);
}
```

**Output:**
```
forge version 2.0.0-dev+20251109.abc1234
```

**Detailed version command:**

```typescript
// In builtins.ts or commands/version.ts
export const version: ForgeCommand = {
  description: 'Show detailed version information',
  execute: async () => {
    const info = await getVersion();

    console.log('Forge Version Information:');
    console.log();
    console.log(`  Version:    ${info.version}`);
    console.log(`  Full:       ${info.semver}`);
    console.log(`  Commit:     ${info.hashFull}`);
    console.log(`  Branch:     ${info.branch}`);
    console.log(`  Built:      ${info.timestamp}`);
    console.log(`  Dirty:      ${info.dirty ? 'yes (uncommitted changes)' : 'no'}`);
    console.log();
    console.log(`Install location: ${getForgeHome()}`);
  }
};
```

**Output:**
```
Forge Version Information:

  Version:    2.0.0-dev
  Full:       2.0.0-dev+20251109.abc1234
  Commit:     abc1234567890abcdef1234567890abcdef12345
  Branch:     main
  Built:      2025-11-09T15:30:00Z
  Dirty:      no

Install location: /Users/jason/.forge
```

---

## Update Workflow

### Current (Manual)

```bash
# In your dev environment
cd ~/forge
git pull origin main
./install.sh
```

This regenerates `version.json` with new hash and timestamp.

### Future (Automated)

Add `forge self-update` command:

```typescript
export const selfUpdate: ForgeCommand = {
  description: 'Update Forge to latest version',
  execute: async () => {
    const forgeHome = getForgeHome();

    log.info('Updating Forge...');

    // Pull latest changes
    await exec('git pull origin main', { cwd: forgeHome });

    // Re-run install logic (regenerate version, install deps)
    await exec('./install.sh', { cwd: forgeHome });

    const newVersion = await getVersionString();
    log.info(`Updated to: ${newVersion}`);
  }
};
```

Usage:
```bash
forge self-update
```

---

## Package.json Management

### During Active Development

**Keep package.json at:** `"version": "2.0.0-dev"`

- Don't bump manually during dev
- The build metadata (timestamp + hash) shows what changed
- Only bump when you want to mark a milestone

**Example progression:**
```json
// Active dev
"version": "2.0.0-dev"           → 2.0.0-dev+20251109.abc1234

// First alpha
"version": "2.0.0-alpha.1"       → 2.0.0-alpha.1+20251115.def5678

// Second alpha
"version": "2.0.0-alpha.2"       → 2.0.0-alpha.2+20251120.123abcd

// Release candidate
"version": "2.0.0-rc.1"          → 2.0.0-rc.1+20251201.456cdef

// Stable release
"version": "2.0.0"               → 2.0.0+20251215.789beef
```

### Version Bump Script

For when you DO want to bump:

```bash
#!/usr/bin/env bash
# scripts/bump-version.sh

set -euo pipefail

if [ $# -ne 1 ]; then
  echo "Usage: $0 <version>"
  echo "Example: $0 2.0.0-alpha.1"
  exit 1
fi

NEW_VERSION=$1

# Update package.json
npm version "$NEW_VERSION" --no-git-tag-version

# Commit the change
git add package.json
git commit -m "Bump version to $NEW_VERSION"

echo "Version bumped to $NEW_VERSION"
echo "Don't forget to push: git push origin main"
```

Usage:
```bash
./scripts/bump-version.sh 2.0.0-alpha.1
git push origin main
```

---

## Comparison with Alternatives

### Alternative 1: Runtime Git Queries

**Approach:** Read git info at runtime on every `--version` call

```typescript
async function getVersion() {
  const hash = await exec('git rev-parse --short HEAD');
  const timestamp = await exec('git log -1 --format=%cI');
  // ...
}
```

**Pros:**
- Always accurate, even after git pull
- No install step needed

**Cons:**
- Slower (git commands on every invocation)
- Requires git installed
- Fails if .git directory missing/corrupted
- Doesn't work with non-git installs (future: npm, homebrew)

**Verdict:** ❌ Not suitable for production use

### Alternative 2: Build-Time Code Generation

**Approach:** Use build tool to inject version at compile time

```typescript
// Use bun --define or similar
const VERSION = __VERSION__;  // Injected at build
```

**Pros:**
- Embedded in code, no external file
- Fast at runtime

**Cons:**
- Requires build step (we run TypeScript directly)
- Would need to bundle/compile
- More complex build setup

**Verdict:** ❌ Overkill for current architecture

### Alternative 3: Git Hooks

**Approach:** Post-commit or post-checkout hook updates version.json

```bash
# .git/hooks/post-commit
#!/bin/bash
./scripts/generate-version.sh
```

**Pros:**
- Automatic on every commit/checkout
- No manual step

**Cons:**
- Requires hook setup (not in repo by default)
- Doesn't run on `git pull` (only checkout)
- Can be disabled by users
- Doesn't work on remote pulls

**Verdict:** ❌ Too fragile, doesn't fit workflow

### Alternative 4: Proposed (Install-Time Generation)

**Approach:** Generate version.json at install time

**Pros:**
- ✅ Simple: just run install.sh
- ✅ Fast: cached in file, no git calls
- ✅ Works without git at runtime
- ✅ Works with future install methods (homebrew, npm)
- ✅ Fits current workflow (reinstall to update)

**Cons:**
- Requires install step (but that's already the workflow)
- Version.json can get stale if you pull without reinstalling

**Verdict:** ✅ **Best fit for requirements**

---

## Implementation Checklist

### Phase 1: Basic Version Info (1 hour)

- [ ] Create `lib/version.ts` with types and getVersion()
- [ ] Add version.json generation to install.sh
- [ ] Update cli.ts to handle --version flag
- [ ] Test: install.sh generates correct version.json
- [ ] Test: forge --version shows correct output

### Phase 2: Detailed Version Command (30 min)

- [ ] Add `version` command to builtins
- [ ] Show all version fields
- [ ] Test: forge version shows detailed info

### Phase 3: Self-Update Command (1 hour)

- [ ] Add `self-update` command
- [ ] Pulls latest + regenerates version
- [ ] Shows old → new version
- [ ] Test: self-update works end-to-end

### Phase 4: Version Bump Tooling (30 min)

- [ ] Create scripts/bump-version.sh
- [ ] Test: bumps package.json and commits
- [ ] Document in CONTRIBUTING.md

**Total effort: ~3 hours**

---

## Future Enhancements

### Auto-Update Check

Optionally check for updates on startup:

```typescript
// Check if newer version available on remote
async function checkForUpdates() {
  const current = await getVersion();
  const remote = await exec('git ls-remote origin main');
  const remoteHash = remote.split('\t')[0];

  if (remoteHash !== current.hashFull) {
    log.warn('New version available! Run: forge self-update');
  }
}
```

Could be:
- Opt-in via config: `autoUpdateCheck: true`
- Only check once per day (cache last check time)
- Only show on interactive terminals

### Release Tagging

When creating official releases:

```bash
# Tag the release
git tag v2.0.0-alpha.1
git push origin v2.0.0-alpha.1

# Create GitHub release
gh release create v2.0.0-alpha.1 \
  --title "v2.0.0-alpha.1" \
  --notes "Release notes here"
```

Then version.json includes tag info:

```json
{
  "version": "2.0.0-alpha.1",
  "tag": "v2.0.0-alpha.1",
  "hash": "abc1234",
  ...
}
```

### Homebrew Integration

For Homebrew installs, version.json generated differently:

```ruby
# Formula/forge.rb
def install
  # ... install files ...

  # Generate version.json for Homebrew install
  (prefix/"version.json").write <<~JSON
    {
      "version": "#{version}",
      "hash": "#{stable.specs[:revision]}",
      "timestamp": "#{Time.now.utc.iso8601}",
      "branch": "release",
      "dirty": false,
      "semver": "#{version}",
      "installMethod": "homebrew"
    }
  JSON
end
```

Then `forge --version` can show:
```
forge version 2.0.0-alpha.1 (installed via Homebrew)
```

---

## Questions for Jason

1. **Version format preferences?**
   - Proposed: `2.0.0-dev+20251109.abc1234`
   - Alternative: `2.0.0-dev-20251109-abc1234` (no `+`)
   - Alternative: `2.0.0-dev (abc1234)` (simpler)

> proposed is fine

2. **What version to keep in package.json now?**
   - `2.0.0-dev` (stay on dev until alpha ready)?
   - `2.0.0-alpha.1` (bump to alpha now)?
   - Something else?

> change it to 2.0.0-dev, i'm gonna think 'dev' is like 'SNAPSHOT' in maven land (ie. active development) but doesn't follow the same auto-update semantics (yet)

3. **Self-update command priority?**
   - Implement now (Phase 3)?
   - Or later (manual reinstall is fine for now)?

> later

4. **Auto-update check?**
   - Nice-to-have or skip?
   - If yes: opt-in or opt-out?

> nice to have, lets leave that with later for 3

5. **Where should version.json live?**
   - Proposed: `forge-home/version.json`
   - Alternative: `forge-home/state/version.json` (treat as state)
   - Alternative: `forge-home/lib/version.json` (next to code)

> proposed is fine

---

## Recommendation

**Implement in this order:**

1. **Phase 1 first** (basic version info)
   - Gets you working --version with hash+timestamp
   - Solves immediate need
   - ~1 hour

2. **Phase 2 quick win** (detailed version command)
   - Nice for debugging
   - ~30 min

3. **Phases 3-4 later** (self-update, bump scripts)
   - When you're ready to streamline workflow
   - Not blocking

**Start with:**
- package.json: `"version": "2.0.0-dev"`
- version.json generated by install.sh
- `forge --version` shows semver with build metadata
- Manual workflow: pull + reinstall

**This gives you:**
- ✅ Clear version visibility (timestamp shows freshness)
- ✅ Simple workflow (already doing reinstalls)
- ✅ Room to grow (self-update later)
- ✅ Works with future install methods
