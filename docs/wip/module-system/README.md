# WIP: Module System

**Spec**: [docs/planning/installation-and-module-system.md](../../planning/installation-and-module-system.md)
**Started**: 2025-10-31
**Current Phase**: Phase 1 - Basic Installation & Local Modules

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

### 🚧 Phase 1: Basic Installation & Local Modules
**Status**: Not Started
**Document**: [phase1-basic-installation.md](phase1-basic-installation.md)

**Goals:**
- Create `install.sh` script
- Add `package.json` with proper metadata
- Test installation flow
- Verify wrapper script works
- Keep existing local modules working

**Success Criteria:**
- Can install forge via `install.sh`
- `forge --version` works
- Local modules (`.forge2/*.ts`) still work

---

### 📋 Phase 2: Meta Project & Dependencies
**Status**: Planned
**Document**: [phase2-meta-project-deps.md](phase2-meta-project-deps.md) *(to be created)*

**Goals:**
- Parse `dependencies:` from config.yml
- Install dependencies to shared location
- Implement module resolver
- Auto-install on first use

---

### 📋 Phase 3: Git Module Loading
**Status**: Planned
**Document**: [phase3-git-modules.md](phase3-git-modules.md) *(to be created)*

**Goals:**
- Git URL parsing and installation
- Package submodule support
- Private repo authentication

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
