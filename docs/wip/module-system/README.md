# WIP: Module System

**Spec**: [docs/planning/installation-and-module-system.md](../../planning/installation-and-module-system.md)
**Started**: 2025-10-31
**Current Phase**: Phase 2 - Meta Project & Dependencies

---

## Overview

Implementing installation, upgrade, and module distribution system for Forge v2.

**Key Goals:**
- Simple one-line installation
- Shared module storage using meta-project pattern
- Support local, git, and npm module sources
- Easy upgrades without file locking

---

## Implementation Phases

### ✅ Phase 0: Research & Specification
**Status**: Complete
**Completed**: 2025-10-31

- ✅ Researched Bun capabilities
- ✅ Validated architecture with experiments
- ✅ Created comprehensive specification
- ✅ Updated GitHub issues

**Artifacts:**
- `tmp/bun-research-findings.md`
- `tmp/experiments/` (meta-project, test-resolve, bootstrap-cli)
- `docs/planning/installation-and-module-system.md`

---

### ✅ Phase 1: Basic Installation & Local Modules
**Status**: Complete
**Completed**: 2025-11-01
**Document**: [phase1-basic-installation.md](phase1-basic-installation.md)
**Summary**: [phase1-summary.md](phase1-summary.md)

**Completed:**
- ✅ Created `install.sh` and `uninstall.sh` scripts
- ✅ Added `package.json` with proper metadata
- ✅ Test installation flow (7 install tests)
- ✅ Test infrastructure overhaul (test extension framework)
- ✅ All 87 tests passing
- ✅ Local modules working unchanged

**Artifacts:**
- Installation scripts: `bin/install.sh`, `bin/uninstall.sh`
- Test infrastructure: `tests/lib/testx.ts`, `tests/lib/utils.ts`
- Documentation: `docs/testing.md`

---

### ✅ Phase 2: Forge Home & Dependencies
**Status**: Complete
**Completed**: 2025-11-03
**Document**: [phase2-meta-project-deps.md](phase2-meta-project-deps.md)

**Completed:**
- ✅ Parse `dependencies:` from config.yml
- ✅ Install dependencies to forge home (`~/.local/share/forge/node_modules/`)
- ✅ Auto-install on first use with exit code 42 restart
- ✅ Support for npm packages, git URLs, and file: references
- ✅ Working examples: `cowsay` (npm), `forge-standard` (file:)

**Terminology:**
- **forge home** = `~/.local/share/forge/` (where forge is installed, manages shared dependencies)
- **forge project** = Directory with `.forge2/` (your project with local modules)

---

### ✅ Phase 3: Git Module Loading & tsconfig Resolution
**Status**: Complete (Simplified Approach)
**Started**: 2025-11-03
**Completed**: 2025-11-05
**Documents**:
- [phase3-implementation-proposal.md](phase3-implementation-proposal.md)
- [phase3-test-framework.md](phase3-test-framework.md)

**Resolution:**
After exploring Deno migration and complex tsconfig solutions, implemented simpler approach using Bun's `--cwd` flag to solve config resolution issues.

**Completed:**
- ✅ Bun `--cwd` wrapper pattern (no --tsconfig-override needed)
- ✅ FORGE_USER_DIR environment variable to track user's actual directory
- ✅ ProjectConfig interface for structured path management
- ✅ BootstrapConfig for early CLI initialization
- ✅ Automatic dependency installation with exit code 42 restart
- ✅ All 39 tests passing
- ✅ Manual testing with examples/website verified

**Approach:**
Instead of fighting Bun's tsconfig override issues, wrapper scripts use `--cwd` to set Bun's working directory to forge-home, which naturally finds the correct configs and node_modules. User's actual directory is preserved in FORGE_USER_DIR environment variable.

---

### 📋 Phase 4: Upgrade Commands
**Status**: Planned
**Document**: [phase4-upgrade-commands.md](phase4-upgrade-commands.md) *(to be created)*

**Goals:**
- `forge upgrade` command
- `forge module update` command
- Version detection and rollback

---

### 📋 Phase 5: Polish & Documentation
**Status**: Planned
**Document**: [phase5-polish-docs.md](phase5-polish-docs.md) *(to be created)*

**Goals:**
- Module templates
- Example modules
- Complete documentation
- Migration guide

---

## Key Decisions

*(Track major decisions here as we implement)*

### 2025-11-05: Phase 3 - Bun --cwd Approach

**Problem:**
Bun's `--tsconfig-override` flag was unreliable - would sometimes use wrong tsconfig.json and node_modules, causing module resolution failures.

**Explored Solutions:**
1. Deno migration - Created working prototype but added complexity
2. Complex tsconfig path generation and overrides
3. Shell cd + process.chdir() patterns

**Final Solution:**
Use Bun's `--cwd` flag to set working directory to forge-home:
- `bun --cwd="$forge_home" run "$forge_cli" "$@"`
- Bun naturally finds correct tsconfig.json and node_modules in forge-home
- No need for `--tsconfig-override` flag
- User's actual directory preserved in `FORGE_USER_DIR` env var

**Implementation:**
- Updated `bin/forge` and `bin/forge-dev` wrappers to use `--cwd`
- Created `ProjectConfig` interface with fully resolved paths (projectRoot, forgeDir, userDir)
- Created `BootstrapConfig` for early CLI initialization (includes `isRestarted` flag)
- Added `createProjectConfig()` helper using `resolve()` to eliminate ./ and ../ segments
- Updated Forge constructor to accept `ProjectConfig` instead of raw paths

**Benefits:**
- Simpler than Deno migration
- No runtime changes needed (pure Bun)
- Clear configuration demarcation points
- All existing functionality preserved
- 39 tests passing

### 2025-11-01: Phase 1 Completion

**Package Exports:**
- Removed package exports temporarily until API is stable
- Current exports don't match actual usage patterns (examples use `lib/command.ts` via tsconfig alias)
- `bin/forge` uses relative imports instead of package exports
- Will add back once API is finalized and tested

**Test Infrastructure:**
- Created test extension framework (`testx.ts`) for auto-context injection
- Descriptive test directory naming instead of UUIDs (`build/test-logs/<test-file>/<test-name>-{stdout,stderr}.log`)
- Centralized directory constants via `TEST_DIRS` (root, fixtures, reports, tmp, logs)
- All CLI tests converted to new pattern (31 tests total)

**Installation:**
- Install script is idempotent and checks prerequisites
- Explicit tarball check with clear error message
- Uninstall with `--purge` option to remove all data
- 7 installation tests covering all flows

### 2025-10-31: Architecture Decisions

**Installation:**
- Use `install.sh` script (requires Bun pre-installed)
- Wrapper at `~/.local/bin/forge`
- Delegates to `~/.local/share/forge/node_modules/@planet57/forge/cli.ts`

**Module Resolution:**
- Priority: Local → Shared → Project
- Programmatic via `require.resolve()` (no env vars)

**Configuration:**
- YAML only (no JSON)
- Three levels: User-wide → Project → Project-local
- Separate `dependencies:` and `modules:` sections

---

## Gotchas & Learning

*(Track issues, surprises, lessons learned)*

### Bun Capabilities
- ✅ Full git repository support (github:, gitlab:, git+ssh:, git+https:)
- ✅ Custom node_modules via working directory
- ❌ No git subdirectory support (use package exports instead)

---

## Open Questions

*(Track unresolved questions across all phases)*

1. **Wrapper script**: Pure bash or bun script? *(Phase 1)*
2. **Error messages**: Level of detail for users? *(Phase 1)*
3. **Progress indicators**: Spinners during install/upgrade? *(Phase 2+)*
4. **Offline mode**: How to handle network unavailable? *(Phase 2+)*

---

## Related Issues

- GitHub #2 - Module distribution system (main tracking issue)
- GitHub #5 - npm/git module loading (covered by Phase 3)
- Milestone: v2.1 - Module Ecosystem
