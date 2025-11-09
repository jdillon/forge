# Homebrew Tap Implementation Plan

**Date**: 2025-11-09
**Status**: Ready for implementation
**Estimated effort**: 2-3 hours

---

## Overview

Add Homebrew support for Forge installation via a GitHub-based tap. This provides standard package manager UX for macOS users while keeping everything in your own GitHub repos (no external registry needed).

---

## How It Works

### User Experience
```bash
# One-time setup
brew tap jdillon/tap

# Install forge
brew install forge

# Update forge
brew upgrade forge

# Works immediately
forge --version
```

### Behind the Scenes

1. **`brew tap jdillon/tap`**
   - Clones `github.com/jdillon/homebrew-tap` to `/opt/homebrew/Library/Taps/jdillon/homebrew-tap`
   - Homebrew discovers all Formula/*.rb files

2. **`brew install forge`**
   - Runs the Ruby formula at `Formula/forge.rb`
   - Formula downloads/clones Forge from GitHub
   - Installs to `/opt/homebrew/Cellar/forge/<version>/`
   - Symlinks `forge` binary to `/opt/homebrew/bin/forge`

3. **`forge` command runs**
   - User runs `forge` from anywhere
   - Wrapper script sets up environment
   - Loads actual CLI from Homebrew-managed location

---

## Architecture Decisions

### Where Does Forge Live?

**Option A: Homebrew Manages Everything** (RECOMMENDED)

```
/opt/homebrew/Cellar/forge/2.0.0-alpha.1/
├── lib/                           # TypeScript source
│   ├── cli.ts
│   ├── core.ts
│   └── ...
├── node_modules/                  # Framework dependencies
│   ├── commander/
│   ├── chalk/
│   └── ...
└── bin/
    └── forge                      # Wrapper script

/opt/homebrew/bin/forge            # Symlink to above

~/.forge/                          # User data (NOT managed by Homebrew)
├── config/                        # User config
├── state/                         # User state
├── cache/                         # Module cache
├── logs/                          # Logs
├── package.json                   # User modules
└── node_modules/                  # User-installed shared modules
    └── @my-org/                   # Your custom modules
        └── aws-utils/
```

**What Homebrew manages:**
- Forge framework code (lib/*.ts)
- Framework dependencies (commander, chalk, etc.)
- The `forge` binary wrapper

**What stays user-managed:**
- `~/.forge/` - user config, state, cache
- User-installed shared modules
- Project `.forge/` directories

**Why this works:**
- Clean separation: framework vs. user data
- Homebrew handles framework updates
- User modules don't get blown away on upgrade
- FORGE_HOME still points to `~/.forge` for user data
- Framework location is managed by Homebrew

### Formula Approach

**Option B: Release Tarball** (RECOMMENDED)

Use GitHub Releases workflow:

```ruby
class Forge < Formula
  desc "Modern CLI framework for deployments"
  homepage "https://github.com/jdillon/forge"
  url "https://github.com/jdillon/forge/releases/download/v2.0.0-alpha.1/forge-2.0.0-alpha.1.tar.gz"
  sha256 "abc123..."
  version "2.0.0-alpha.1"

  depends_on "bun"

  def install
    # Install TypeScript source files
    lib.install Dir["lib/*.ts"]

    # Install dependencies in the Cellar
    system "bun", "install", "--frozen-lockfile"

    # Create wrapper script
    (bin/"forge").write <<~BASH
      #!/usr/bin/env bash
      set -euo pipefail

      # Set FORGE_HOME to user directory (for user data)
      export FORGE_HOME="${HOME}/.forge"

      # Set FORGE_INSTALL to Homebrew location (for framework code)
      export FORGE_INSTALL="#{prefix}"

      # Run CLI from Homebrew-managed location
      exec bun run "#{lib}/cli.ts" "$@"
    BASH
  end

  def post_install
    # Create ~/.forge structure if it doesn't exist
    forge_home = "#{Dir.home}/.forge"

    unless File.exist?(forge_home)
      mkdir_p "#{forge_home}/config"
      mkdir_p "#{forge_home}/state"
      mkdir_p "#{forge_home}/cache"
      mkdir_p "#{forge_home}/logs"

      # Initialize package.json for user modules
      File.write("#{forge_home}/package.json", <<~JSON)
        {
          "name": "forge-home",
          "private": true,
          "description": "Forge user modules"
        }
      JSON
    end
  end

  test do
    assert_match "2.0.0", shell_output("#{bin}/forge --version")
  end
end
```

**Pros:**
- Standard Homebrew pattern (checksums, caching, security)
- Fast installs (tarball vs git clone)
- Works with GitHub Releases
- Homebrew community expects this

**Cons:**
- Requires release process (build tarball, upload to GitHub)
- Can't install arbitrary branches easily

**Alternative: Git Installation**

For development/testing, could also support:

```ruby
class ForgeDev < Formula
  desc "Forge (development version)"
  homepage "https://github.com/jdillon/forge"
  url "https://github.com/jdillon/forge.git", branch: "main"
  version "HEAD"

  # ... same install logic
end
```

This could live as `Formula/forge-dev.rb` for bleeding edge.

---

## Implementation Steps

### Phase 1: Create Homebrew Tap Repo (30 min)

1. **Create GitHub repo** `github.com/jdillon/homebrew-tap`

2. **Initial structure:**
   ```
   homebrew-tap/
   ├── Formula/
   │   └── forge.rb
   ├── README.md
   └── .github/
       └── workflows/
           └── tests.yml  # Optional: brew test-bot for CI
   ```

3. **README.md:**
   ```markdown
   # Homebrew Tap for Forge

   ## Installation

   ```bash
   brew tap jdillon/tap
   brew install forge
   ```

   ## Upgrade

   ```bash
   brew upgrade forge
   ```
   ```

4. **Commit and push**

### Phase 2: Write Formula (45 min)

1. **Create `Formula/forge.rb`** (see template above)

2. **Key decisions to make:**
   - ✅ Use release tarball approach (standard)
   - ✅ Homebrew manages framework code
   - ✅ `~/.forge` remains user-managed
   - ✅ Add `post_install` hook to create `~/.forge` structure

3. **Handle dependencies:**
   - `depends_on "bun"` - Homebrew will install Bun if needed
   - Framework dependencies (chalk, commander, etc.) installed via `bun install` in the formula

### Phase 3: Test Locally (30 min)

```bash
# Clone your tap locally
git clone https://github.com/jdillon/homebrew-tap ~/homebrew-tap
cd ~/homebrew-tap

# Test formula syntax
brew audit --strict Formula/forge.rb

# Install from local formula (builds from source)
brew install --build-from-source ~/homebrew-tap/Formula/forge.rb

# Test it works
forge --version
forge --help

# Uninstall
brew uninstall forge
```

### Phase 4: Release Workflow (1 hour)

**Manual approach** (for now):

1. **In main forge repo**, when ready to release:
   ```bash
   # Tag release
   git tag v2.0.0-alpha.1
   git push origin v2.0.0-alpha.1

   # Build tarball
   bun pm pack --destination build/

   # Create GitHub Release
   gh release create v2.0.0-alpha.1 \
     --title "v2.0.0-alpha.1" \
     --notes "Release notes here" \
     build/planet57-forge-2.0.0-alpha.1.tgz

   # Get SHA256
   shasum -a 256 build/planet57-forge-2.0.0-alpha.1.tgz
   ```

2. **In homebrew-tap repo**, update formula:
   ```bash
   cd ~/homebrew-tap

   # Edit Formula/forge.rb
   # - Update version
   # - Update url to new release tarball
   # - Update sha256 checksum

   git add Formula/forge.rb
   git commit -m "forge 2.0.0-alpha.1"
   git push
   ```

3. **Users upgrade:**
   ```bash
   brew update
   brew upgrade forge
   ```

**Automated approach** (future):

Add `.github/workflows/publish.yml` to main forge repo:
```yaml
name: Publish to Homebrew

on:
  release:
    types: [published]

jobs:
  update-tap:
    runs-on: ubuntu-latest
    steps:
      - name: Update Homebrew formula
        uses: dawidd6/action-homebrew-bump-formula@v3
        with:
          tap: jdillon/homebrew-tap
          formula: forge
          token: ${{ secrets.HOMEBREW_TAP_TOKEN }}
```

This auto-updates the formula when you create a GitHub release.

### Phase 5: Documentation (15 min)

Update main `README.md`:

```markdown
## Installation

### Homebrew (macOS)

```bash
brew tap jdillon/tap
brew install forge
```

### Manual Install

See [installation guide](docs/install.md)
```

---

## Code Changes Needed

### Minimal Changes

The current codebase almost works as-is. Only small tweaks needed:

1. **lib/forge-home.ts** - Already uses `FORGE_HOME` env var ✅
   - Formula sets `FORGE_HOME=~/.forge`
   - No changes needed

2. **bin/forge** - Wrapper script replaced by formula ✅
   - Formula creates its own wrapper
   - Points to Homebrew-managed lib/cli.ts

3. **package.json** - Add "bin" field (optional)
   ```json
   {
     "bin": {
       "forge": "./bin/forge"
     }
   }
   ```
   This helps Homebrew find the binary name.

### Optional Enhancements

**Detect installation method:**

```typescript
// lib/helpers.ts
export function getInstallMethod(): 'homebrew' | 'manual' {
  if (process.env.FORGE_INSTALL?.includes('/Cellar/forge/')) {
    return 'homebrew';
  }
  return 'manual';
}
```

Could use this for:
- Self-update command behavior (`forge update` → `brew upgrade forge`)
- Installation diagnostics
- Telemetry

---

## Questions for Jason

1. **Version strategy**: How do you want to version releases?
   - Continue with `2.0.0-alpha.1`, `2.0.0-alpha.2`, etc.?
   - Switch to `0.1.0`, `0.2.0` for pre-1.0?
   - Use date-based like `2025.11.1`?

2. **Release frequency**: How often to publish?
   - Every significant feature?
   - Weekly/monthly?
   - Only on explicit decision?

3. **Branch strategy**: What goes in the formula?
   - Stable only (main branch, tagged releases)?
   - Or also provide `forge-dev` formula for bleeding edge?

4. **~/.forge initialization**: Should Homebrew create this structure?
   - Formula `post_install` hook can do it
   - Or let the CLI create on first run?
   - Current plan: Formula creates skeleton, CLI manages contents

5. **Bun dependency**: Homebrew will install Bun automatically
   - Is this acceptable? (adds ~50MB install)
   - Or document "install Bun first"?

---

## Testing Checklist

Before publishing:

- [ ] Formula passes `brew audit --strict`
- [ ] Fresh install works: `brew install jdillon/tap/forge`
- [ ] `forge --version` shows correct version
- [ ] `forge --help` works
- [ ] Can run commands in a project
- [ ] `~/.forge/` structure created correctly
- [ ] Upgrade works: `brew upgrade forge`
- [ ] Uninstall works: `brew uninstall forge`
- [ ] Reinstall works after uninstall

---

## Next Steps

**Recommended order:**

1. **Create homebrew-tap repo** (10 min)
2. **Write initial Formula/forge.rb** (30 min)
3. **Test locally with current code** (30 min)
4. **Create first GitHub release** (15 min)
5. **Update formula with release tarball** (15 min)
6. **Test full install flow** (15 min)
7. **Update README** (15 min)

**Total time: ~2.5 hours**

After that, you have a working Homebrew tap. Future releases are just:
1. Tag version
2. Create GitHub release with tarball
3. Update formula SHA256
4. Push tap repo

(Or automate with GitHub Actions workflow)

---

## Open Questions

1. Do you want to keep the bash install.sh for non-Homebrew users?
   - Linux users
   - CI/CD systems
   - Users who prefer manual control

2. Should we add a `forge update` command?
   - Detects Homebrew: runs `brew upgrade forge`
   - Detects manual: runs `bin/install.sh` again
   - Or just document it?

3. Once Homebrew tap exists, what's the primary install method?
   - Update README to recommend Homebrew first?
   - Keep both equal?

---

## References

Real-world examples for implementation guidance:

- **Homebrew tap example**: https://github.com/steveyegge/homebrew-beads
  - Working tap structure and formula

- **GitHub Actions automation**: https://github.com/steveyegge/beads/blob/main/.github/workflows/update-homebrew.yml
  - Automated formula updates on release
