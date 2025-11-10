# Forge Roadmap

**Last Updated**: 2025-10-30
**Primary Tracking**: [GitHub Project Board](https://github.com/users/jdillon/projects/3)
**Repository**: https://github.com/jdillon/forge

---

## Overview

Forge is a modern CLI framework for deployments built with TypeScript/Bun. This roadmap tracks planned features from conception through implementation.

**Current Status**: Working prototype (v2.0.0)
- ✅ Core framework complete (39 tests passing)
- ✅ Module auto-discovery and loading
- ✅ State management (project + user)
- ✅ Structured logging with multiple formats
- ✅ Beautiful CLI UI (chalk, ora, listr2, boxen)

---

## How This Works (GitHub-First Hybrid)

**Primary tracking**: GitHub Issues + [Project Board](https://github.com/users/jdillon/projects/3)
- Create issues for all features
- Use project board for kanban view (Backlog → Planned → Doing → Blocked → Done)
- Use milestones to group by version

**This document**: Generated overview from GitHub
- Provides quick reference
- Shows version milestones
- Links to detailed designs

**Detailed designs**: `docs/planning/FEATURE.md` for complex features
- Created when needed (complex/architectural features)
- Linked from GitHub issues
- Example: `module-sharing-private.md`

**Feature graduation**:
```
1. Create GitHub issue → add to project board
2. Create detailed design (if complex) → link in issue
3. Implement → move through board columns
4. Complete → update README.md features, add to CHANGELOG.md
5. Archive design doc → move to docs/archive/
```

---

## v2.1 - Module Ecosystem

**Target**: Q1 2025 (March 31, 2025)
**Focus**: Make Forge modules shareable and discoverable

### High Priority

#### [#2 Module Distribution System](https://github.com/jdillon/forge/issues/2)
**Priority**: High | **Complexity**: High | **Status**: Open

Enable users to install, list, update, and remove modules from private registries (npm, GitLab packages).

**Key Features**:
- Commands: `forge2 module add/list/update/remove`
- Registry support: npm, GitLab packages
- Authentication for private registries
- Local module cache
- Semver version resolution

**Design**: [module-sharing-private.md](./module-sharing-private.md)

### Medium Priority

#### [#3 Shell Completion Support](https://github.com/jdillon/forge/issues/3)
**Priority**: Medium | **Complexity**: Medium | **Status**: Open

Generate and install shell completion for bash/zsh/fish.

**Key Features**:
- Auto-complete commands, subcommands, flags
- Support bash, zsh, fish
- Installation: `forge2 completion install`

**Dependencies**: omelette package (already installed)

### Low Priority

#### [#4 Top-Level Commands Support](https://github.com/jdillon/forge/issues/4)
**Priority**: Low | **Complexity**: Simple | **Status**: Open

Support commands at top level, not just subcommands.

**Current**: `forge2 website deploy`
**Desired**: `forge2 deploy` or `forge2 website:deploy`

---

## v2.2 - External Modules

**Target**: Q2 2025
**Focus**: Load modules from external sources

### High Priority

#### [#5 npm/git Module Loading](https://github.com/jdillon/forge/issues/5)
**Priority**: High | **Complexity**: High | **Status**: Open

Load modules from npm packages and git repositories, not just local filesystem.

**Key Features**:
- Load from npm: `@scope/package`
- Load from git: `github:user/repo`
- Local path (current behavior)
- Version locking and updates

**Dependencies**: Requires #2 (Module distribution system)

---

## Backlog (Not Scheduled)

Features under consideration but not yet prioritized to a version:

- Configuration validation and schema
- Interactive prompts/wizards
- Performance profiling tools
- Migration tools (if v1 exists)
- Parallel command execution
- Watch mode for commands

---

## Meta (Roadmap Management)

#### [#1 Define Roadmap and Feature Graduation Process](https://github.com/jdillon/forge/issues/1)
**Status**: Open

Establish the roadmap management system itself. See this document and [roadmap-management-proposal.md](../../tmp/roadmap-management-proposal.md) for details.

---

## How to Use This Roadmap

### As a Developer

**View current work**: [Project Board](https://github.com/users/jdillon/projects/3)
**See detailed plans**: Click issue links → check for linked design docs
**Track progress**: Watch issue status and milestone progress

### When Starting a Feature

1. **Find the issue**: Click through from this roadmap or browse GitHub
2. **Read design doc**: If linked in issue (complex features only)
3. **Consider spec-kit**: For complex features, use `/speckit.*` workflow
4. **Update status**: Move issue through project board columns

### When Completing a Feature

1. **Update README.md**: Add to Features section
2. **Update CHANGELOG.md**: Add under appropriate version
3. **Close issue**: GitHub will move to Done column
4. **Archive design**: Move planning doc to `docs/archive/`
5. **Update this roadmap**: Remove completed items or mark with ✅

---

## Questions?

- **Propose a feature**: Create GitHub issue with `type:feature` label
- **Discuss priorities**: Comment on issue or milestone
- **Ask questions**: Create issue or discussion

---

## Links

- **Project Board**: https://github.com/users/jdillon/projects/3
- **Milestones**: https://github.com/jdillon/forge/milestones
- **Issues**: https://github.com/jdillon/forge/issues
- **README**: [../../README.md](../../README.md)
- **CHANGELOG**: [../../CHANGELOG.md](../../CHANGELOG.md)
