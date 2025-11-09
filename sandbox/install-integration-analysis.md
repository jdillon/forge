# install.sh Integration Analysis

**Question**: Can we integrate install.sh with forge-dev to reduce duplication?

---

## Current State

### install.sh (312 lines)
**Purpose**: User-facing installation script
- Interactive prompts and confirmation
- Color output and status messages
- Installs to `~/.forge`
- Creates `~/.local/bin/forge` symlink
- Checks prerequisites (bun, git)
- PATH validation and guidance
- Support for GitHub repo OR local tarball

### forge-dev (244 lines)
**Purpose**: Developer rebuild automation
- Silent, automatic rebuilds
- Uses `dev-home/forge`
- Checksum-based change detection
- Delegates to `bin/forge` for execution

---

## Overlap Analysis

### Duplicated Code (~70-80 lines)

**1. Config File Creation (~20 lines)**
```bash
# bunfig.toml - IDENTICAL
# tsconfig.json - IDENTICAL
# package.json - DIFFERENT CONTENT
```

**2. Version Generation (~50 lines)**
```bash
# Read version from package.json
# Get git info (hash, branch, timestamp, dirty)
# Format timestamp as YYYYMMDD.HHMM
# Build semver string
# Write version.json
# IDENTICAL LOGIC
```

**3. Package Installation (~10 lines)**
```bash
# install.sh: bun add <repo>
# forge-dev: bun install (with package.json)
# SIMILAR BUT DIFFERENT
```

### Unique to install.sh (~230 lines)

- Color output setup (~20 lines)
- Helper functions (info, warn, error, die) (~30 lines)
- Argument parsing (-y, -h, help text) (~30 lines)
- Prerequisites checking (~5 lines)
- Repo/tarball auto-detection (~40 lines)
- Installation plan display (~20 lines)
- User confirmation prompt (~10 lines)
- Symlink to ~/.local/bin/forge (~20 lines)
- Verification test (~10 lines)
- PATH checking and guidance (~20 lines)
- Error handling and user guidance (~25 lines)

### Unique to forge-dev (~160 lines)

- Checksum computation (~10 lines)
- Rebuild detection (~10 lines)
- Clear Bun cache (~5 lines)
- Build tarball (~20 lines)
- Rebuild orchestration (~15 lines)
- Delegation to bin/forge (~5 lines)
- Progress output for dev (~10 lines)

---

## Integration Options

### Option 1: Merge into Single Script

**Approach**: Add flags to install.sh to support dev mode

```bash
install.sh --dev          # Dev mode (silent, dev-home)
install.sh --user         # User mode (interactive, ~/.forge)
install.sh --tarball <path>  # Use specific tarball
```

**Pros**:
- Single script to maintain
- Shared config generation
- Shared version generation

**Cons**:
- Complex flag handling and conditionals
- Two very different user experiences in one file
- Much harder to understand
- Mixed responsibilities (user install vs dev rebuild)
- Would need conditionals throughout:
  ```bash
  if [[ "$MODE" == "dev" ]]; then
    # Silent operation
  else
    # Show progress, ask for confirmation
  fi
  ```

**Estimated complexity**: Would grow to ~400 lines with lots of conditionals

---

### Option 2: Extract Shared Functions

**Approach**: Create `lib/forge-install-common.sh` with shared functions

```bash
# lib/forge-install-common.sh
create_bunfig() { ... }
create_tsconfig() { ... }
generate_version_json() { ... }

# install.sh
source "$(dirname "$0")/../lib/forge-install-common.sh"
create_bunfig "$FORGE_HOME"
generate_version_json "$FORGE_HOME" "$REPO_ROOT"

# forge-dev
source "${PROJECT_ROOT}/lib/forge-install-common.sh"
create_bunfig "$FORGE_HOME"
generate_version_json "$FORGE_HOME" "$PROJECT_ROOT"
```

**Pros**:
- Reduces ~70 lines of duplication
- Each script stays focused
- Shared logic in one place

**Cons**:
- Adds dependency on external file
- Bash sourcing can be fragile
- Need to handle path resolution
- Not much savings for ~70 lines of simple, stable code

---

### Option 3: Keep Separate (Current)

**Approach**: Accept ~70 lines of duplication

**Pros**:
- ✅ Each script is self-contained (no dependencies)
- ✅ Clear separation of concerns
- ✅ Easy to understand each script's purpose
- ✅ Different user experiences optimized for their use case
- ✅ install.sh can evolve independently (homebrew, npm, etc.)
- ✅ forge-dev can evolve independently (faster rebuilds, etc.)

**Cons**:
- ~70 lines of duplicated code (config files + version generation)
- Changes to version format need updating in both places

---

## Recommendation: Keep Separate (Option 3)

**Rationale**:

1. **Different Purposes**:
   - `install.sh`: One-time user installation (interactive, informative)
   - `forge-dev`: Continuous developer rebuilds (automatic, silent)

2. **Duplication is Minimal**:
   - Only ~70 lines (config files + version.json)
   - Simple, stable code that rarely changes
   - Easy to keep in sync

3. **User Experience**:
   - install.sh: Needs prompts, colors, guidance, PATH checking
   - forge-dev: Needs speed, silence, automation
   - Merging would compromise both experiences

4. **Future Evolution**:
   - install.sh will gain: Homebrew support, npm support, release channel selection
   - forge-dev will gain: Faster rebuilds, better caching, watch mode
   - These will diverge further

5. **Maintenance Burden is Low**:
   - Config files are stable (bunfig.toml, tsconfig.json)
   - Version generation is stable (format unlikely to change)
   - Git commands are stable
   - Low risk of duplication causing issues

---

## If We Must Reduce Duplication

**Targeted extraction** of the version generation logic only:

```bash
# bin/generate-version-json.sh
#!/usr/bin/env bash
# Usage: generate-version-json.sh <forge-home> [project-root]
# Generates version.json in <forge-home>/version.json

FORGE_HOME="$1"
PROJECT_ROOT="${2:-$FORGE_HOME/node_modules/@planet57/forge}"

# ... version generation logic ...
```

Then:
```bash
# install.sh
./bin/generate-version-json.sh "$FORGE_HOME"

# forge-dev
./bin/generate-version-json.sh "$FORGE_HOME" "$PROJECT_ROOT"
```

**Savings**: ~50 lines
**Cost**: Extra script, extra invocation, path management

---

## Conclusion

**Don't integrate.** The scripts serve different purposes with different user experiences. The ~70 lines of duplication is acceptable given:

- Low maintenance burden (stable, simple code)
- Clear separation of concerns
- Optimized user experiences
- Independent evolution paths

If duplication becomes a real maintenance problem (version generation changes frequently), extract just the version generation into a separate script. But for now, **keep them separate**.
