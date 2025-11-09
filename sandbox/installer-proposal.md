# Installer Modernization Proposal

**Date**: 2025-11-09
**Status**: Draft
**Context**: Replace bash installer with Bun script; add Homebrew tap support

---

## Problem

Current installation uses a bash script (`bin/install.sh`) which:
- Is ~250 lines of bash code
- Duplicates logic that could be shared with the CLI
- Requires separate bash expertise to maintain
- Can't leverage TypeScript type safety or Bun's features

Additionally, we lack native package manager support (Homebrew, etc.) which is expected for modern CLI tools.

---

## Questions for Jason

### Installer Strategy
1. **Target audience**: Who installs Forge?
   - Developers on their own machines (local dev tools)
   - CI/CD systems (automated deployments)
   - Both equally?

2. **Distribution preference**:
   - Git-based (current approach: `bun add git+ssh://...`)
   - npm registry (publish to npmjs.com)
   - Both?

3. **Bootstrap problem**: How do users get Bun + Forge together?
   - Assume Bun pre-installed (documentation only)?
   - Installer checks/installs Bun automatically?
   - Homebrew tap handles both?

### Homebrew Tap
4. **Tap scope**: What should `brew install jdillon/tap/forge` provide?
   - Just the CLI binary?
   - Bun + Forge together?
   - Multiple formulae (`forge`, `forge-dev`, etc.)?

5. **Update frequency**: How often do you want to publish releases?
   - Every commit (bleeding edge via tap)?
   - Tagged releases only (stable)?

---

## Why Programs Use Dedicated Installers vs `curl | bash`

### Option 1: Direct `curl | bash`
```bash
curl -fsSL https://raw.githubusercontent.com/jdillon/forge/main/install.sh | bash
```

**Pros**:
- Extremely simple for users
- No intermediate files
- One-liner in README

**Cons**:
- **Security concern**: Executes remote code without review
- No way to inspect before running (unless manually curl + bash separately)
- Requires users to trust GitHub + your repo completely
- Hard to debug failures (no local script to inspect)
- Can't easily pass arguments (requires ugly URL encoding)

### Option 2: Download then Execute
```bash
curl -fsSL https://raw.githubusercontent.com/jdillon/forge/main/install.sh -o install-forge.sh
chmod +x install-forge.sh
./install-forge.sh --help
./install-forge.sh -y
```

**Pros**:
- Users can inspect script before running (security)
- Can pass arguments easily
- Easier to debug (script is local)
- More professional/trustworthy appearance

**Cons**:
- Two steps instead of one
- Users might forget to cleanup downloaded script

### Current Best Practice

Most reputable projects use **Option 2** for initial install, then provide:
1. **Package manager** (Homebrew, apt, etc.) - best UX for updates
2. **Self-update command** - `forge update` built into CLI
3. **Manual install option** - for locked-down environments

Examples:
- Bun: `curl -fsSL https://bun.sh/install | bash` (they use piped approach because they're a runtime)
- Deno: `curl -fsSL https://deno.land/install.sh | sh` (same - they bootstrap themselves)
- Homebrew itself: Download script, inspect, then run (they can't use a package manager to install themselves)
- Most other CLIs: Prefer package managers (Homebrew tap, npm, cargo, etc.)

**Key insight**: Runtime tools (Bun, Deno, Node via nvm) use piped install because they bootstrap themselves. Application CLIs should prefer package managers.

---

## Proposal 1: Bun-based Installer

### Approach: Hybrid Bootstrap

**Philosophy**: Use bash for minimal bootstrap, Bun for actual installation logic.

```bash
# bin/install-bootstrap.sh (~30 lines)
#!/usr/bin/env bash
set -euo pipefail

# Check for bun
if ! command -v bun &>/dev/null; then
  echo "Error: bun is required. Install from https://bun.sh" >&2
  exit 1
fi

# Download and run TypeScript installer
curl -fsSL https://raw.githubusercontent.com/jdillon/forge/main/scripts/install.ts -o /tmp/forge-install.ts
bun run /tmp/forge-install.ts "$@"
rm -f /tmp/forge-install.ts
```

```typescript
// scripts/install.ts (~200 lines, but typed and tested)
import { $ } from 'bun';
import { parseArgs } from 'node:util';
import { log } from '../lib/logger.ts'; // Reuse CLI logging!

interface InstallOptions {
  yes: boolean;
  repo: string;
  branch: string;
  forgeHome: string;
}

async function checkPrerequisites() {
  // Check git, bun versions, etc.
}

async function createForgeHome(options: InstallOptions) {
  // Same logic as current install.sh but typed
}

async function installFromGit(options: InstallOptions) {
  // bun add with proper error handling
}

async function createSymlink(options: InstallOptions) {
  // Create ~/.local/bin/forge -> forge home
}

async function verifyInstallation(options: InstallOptions) {
  // Run forge --version
}

// Main
const options = parseCliArgs();
await checkPrerequisites();
await createForgeHome(options);
await installFromGit(options);
await createSymlink(options);
await verifyInstallation(options);
```

### Benefits
- **Reuses CLI code**: Logger, utilities, types
- **Type safety**: Catch errors at development time
- **Testable**: Unit test installation logic
- **Maintainable**: One language, consistent style
- **Still works**: Bootstrap script is simple bash

### Trade-offs
- **Requires Bun**: Users must install Bun first (but that's a requirement anyway)
- **Two files**: Bootstrap bash + TypeScript installer
- **Network dependency**: Must download TypeScript installer (cached in /tmp though)

### Alternative: Pure Bun Bundle

Ship a standalone Bun binary with installer bundled:
```bash
curl -fsSL https://raw.githubusercontent.com/jdillon/forge/main/install-bundle -o install-forge
chmod +x install-forge
./install-forge  # Self-contained Bun + TypeScript
```

**Pros**: No Bun required, single file
**Cons**: Larger download (~50MB), need to build/host bundles per platform

---

## Proposal 2: Homebrew Tap

### How Homebrew Taps Work

A "tap" is a third-party Homebrew repository. Structure:

```
github.com/jdillon/homebrew-tap/
├── Formula/
│   └── forge.rb          # Homebrew formula
└── README.md
```

Users install via:
```bash
brew tap jdillon/tap                    # Add your tap
brew install jdillon/tap/forge          # Install forge
brew upgrade jdillon/tap/forge          # Update forge
```

### Formula Options

#### Option A: Git Installation (Current Model)
```ruby
# Formula/forge.rb
class Forge < Formula
  desc "Modern CLI framework for deployments"
  homepage "https://github.com/jdillon/forge"
  url "https://github.com/jdillon/forge.git", branch: "main"
  version "2.0.0-alpha.1"

  depends_on "bun"

  def install
    # Create forge home in Homebrew prefix
    forge_home = "#{prefix}/forge-home"
    mkdir_p forge_home

    cd forge_home do
      # Create package.json
      File.write("package.json", <<~JSON)
        {
          "name": "forge-meta",
          "version": "1.0.0",
          "private": true
        }
      JSON

      # Install forge package
      system "bun", "add", "@planet57/forge@git+https://github.com/jdillon/forge#main"
    end

    # Create wrapper script
    (bin/"forge").write <<~BASH
      #!/usr/bin/env bash
      export FORGE_HOME="#{forge_home}"
      exec bun run "#{forge_home}/node_modules/@planet57/forge/lib/cli.ts" "$@"
    BASH
  end

  test do
    assert_match "2.0.0", shell_output("#{bin}/forge --version")
  end
end
```

**Pros**:
- Uses existing Git-based install model
- Homebrew manages updates
- Can install directly from branch

**Cons**:
- Slower installs (git clone + bun add)
- Less standard (most formulae use tarballs)

#### Option B: Release Tarball (Standard Approach)
```ruby
class Forge < Formula
  desc "Modern CLI framework for deployments"
  homepage "https://github.com/jdillon/forge"
  url "https://github.com/jdillon/forge/releases/download/v2.0.0-alpha.1/forge-2.0.0-alpha.1.tar.gz"
  sha256 "abc123..."  # Checksum for security
  version "2.0.0-alpha.1"

  depends_on "bun"

  def install
    # Install TypeScript files
    lib.install Dir["lib/*.ts"]

    # Install bin wrapper
    bin.install "bin/forge"

    # Set up forge home (maybe?)
    # Or rely on CLI to create ~/.forge on first run
  end
end
```

**Pros**:
- Standard Homebrew pattern (faster, cached, secure)
- Works with GitHub Releases
- Checksums for security

**Cons**:
- Requires release process (create tarball, upload to GitHub)
- Can't install from arbitrary branches

#### Option C: Homebrew as Primary Distribution

Rethink the architecture:
- Homebrew installs TypeScript files directly to `/opt/homebrew/lib/forge/`
- bin/forge wrapper sets up NODE_PATH to find them
- No separate ~/.forge/node_modules/@planet57/forge
- User modules still in project .forge2/ dirs

This would make Forge feel like a "real" Homebrew package instead of a meta-installer.

### Tap Repository Structure

```
github.com/jdillon/homebrew-tap/
├── Formula/
│   ├── forge.rb              # Main CLI
│   └── forge-dev.rb          # Development version (optional)
├── Casks/                    # For GUI apps (not relevant)
├── README.md
└── .github/
    └── workflows/
        └── publish.yml       # Auto-update formula on release
```

### Release Automation

When you tag a release on main repo:
1. GitHub Action builds tarball
2. Uploads to GitHub Releases
3. Triggers workflow in homebrew-tap repo
4. Auto-updates Formula/forge.rb with new version + SHA256

This is standard for Homebrew taps - users set it up once, then just `git tag v2.0.1` and push.

---

## Recommendations

### Phase 1: Improve Current Installer
- **Keep bash installer for now** - it works, not broken
- **Add `forge install` / `forge update` commands** - self-update from within CLI
- **Document Bun requirement** - be explicit in README

### Phase 2: Homebrew Tap (Recommended First)
- **Create homebrew-tap repo**
- **Use Option B (Release Tarball)** - standard, secure, fast
- **Set up auto-publish workflow** - tag release → update formula
- **This becomes the primary install method** for macOS users

Why Homebrew first:
- More valuable to users than installer refactor
- Standard installation UX (brew install)
- Handles updates automatically
- Builds trust (Homebrew vets formulae)

### Phase 3: Bun Installer (Optional)
- Only if you want to support non-Homebrew installs (Linux, Windows, CI/CD)
- Use hybrid approach (bash bootstrap + TypeScript installer)
- Or just document: "install Bun, then `bun add @planet57/forge@github:jdillon/forge`"

### Phase 4: npm Registry (Future)
- Once stable, publish to npmjs.com
- Enables `npx forge init` for quick starts
- Standard for JavaScript ecosystem

---

## Open Questions

1. **What's the primary install method you envision?**
   - Homebrew (macOS developers)
   - Git-based (cross-platform, CI/CD)
   - npm (JavaScript ecosystem)

2. **How do you want to distribute updates?**
   - Package manager auto-update
   - Self-update command in CLI
   - Manual reinstall

3. **Where should Forge be published?**
   - Just GitHub (current)
   - Homebrew tap (proposed)
   - npm registry (future)
   - All of the above

4. **What's the minimum effort to ship?**
   - Keep bash installer, add Homebrew tap (2-3 hours)
   - Rewrite installer in Bun (1 day)
   - Full npm + Homebrew + self-update (2-3 days)

---

## Next Steps

**If you want Homebrew tap:**
1. Create `github.com/jdillon/homebrew-tap` repo
2. Write Formula/forge.rb (30 minutes)
3. Test locally: `brew install --build-from-source ./Formula/forge.rb`
4. Set up auto-publish on release (1 hour)
5. Update README with `brew install jdillon/tap/forge`

**If you want Bun installer:**
1. Move install logic to `scripts/install.ts`
2. Create minimal `bin/install-bootstrap.sh`
3. Test on clean system
4. Update README

**My recommendation**: Start with Homebrew tap (biggest user value, least effort). Defer installer refactor unless you have specific pain points with current bash version.
