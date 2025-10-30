# CLAUDE.md

This file provides guidance to Claude Code when working with this repository.

---

## Working with Jason

**Communication Style**:
- Direct and technical - no excessive praise or superlatives
- Present trade-offs, not just benefits
- Jason decides - present options clearly

**Workflow**:
- **No auto-commit**: STOP after work, show changes, WAIT for "commit" command
- **Proposals in tmp/**: For significant changes or reorganizations, create a proposal document in `tmp/` (e.g., `tmp/docs-reorganization-proposal.md`). Let Jason review before executing.
- Use `tmp/` for temp files (project root only, never in subdirs)
- Follow [Keep a Changelog](https://keepachangelog.com/en/1.0.0/) and [Semantic Versioning](https://semver.org/spec/v2.0.0.html)

**Why Proposals Work**:
- Jason can review and adjust before changes are made
- Clear documentation of what will change and why
- Easy to discuss trade-offs
- Can be referenced later to understand decisions

---

## Project Quick Reference

**What**: Forge v2 - Modern CLI framework for deployments (TypeScript/Bun)
**Branch**: `v2-prototype` (active development)
**Status**: Working prototype, 39 tests passing

**Key Files**:
- `README.md` - User-facing feature docs
- `docs/` - Architecture and design docs
- `lib/` - Framework implementation
- `examples/website/` - Working example (DO NOT modify in tests)
- `tests/fixtures/` - Use for testing only

---

## Development Commands

```bash
# Testing
bun test                    # Run all tests
bun test --watch            # Watch mode
bun test --bail             # Stop on first failure
bun run test:junit          # Generate JUnit XML
bun run typecheck           # Type checking

# Current status: 39 pass, 0 skip, 0 fail
```

---

## Code Conventions

### Error Handling
- `die(message)` - Fatal error, exits with code 1
- `error(message)` - Non-fatal error, continues
- `log.error()` - App error respecting --silent flag

### Logging
- Use `createLogger(name)` from `lib/logger.ts`
- CLI flags: `-d/--debug`, `-q/--quiet`, `-s/--silent`, `--log-level`, `--log-format`
- Formats: pretty (default), json
- Color: `--no-color` flag or `NO_COLOR` env var

---

## Architecture Overview

For detailed architecture, see:
- `README.md` - Feature overview
- `docs/command-patterns.md` - How to write commands
- `lib/core.ts` - Framework implementation

### Quick Summary

**Bootstrap** (`cli.ts`):
1. Parse early options (for logger config)
2. Discover project root (walk up from CWD, like git)
3. Load config from `.forge2/config.yml`
4. Register commands via Commander.js
5. Execute command

**Module Loading** (`core.ts`):
- Modules listed in `.forge2/config.yml` under `modules:` array
- Auto-discover exports (named or default)
- Group name from filename (`website.ts` → `website` group)
- Override with `__module__` export: `{ group: 'custom', description: '...' }`

**Command Pattern**:
```typescript
export const myCommand: ForgeCommand = {
  description: 'What this command does',
  execute: async (options, args, context) => {
    // context.forge, context.config, context.state, etc.
  }
};
```

**State**:
- Project: `.forge2/state.json` (gitignored)
- User: `~/.config/forge2/state.json`
- API: `context.state.get(key)` / `context.state.set(key, value)`

---

## Documentation Principles

**Avoid duplication - it becomes stale**:
- Each concept documented in ONE place (single source of truth)
- Don't copy code examples into docs - reference working examples instead
- Status/roadmap: Keep minimal and high-level in README.md
- History: Use CHANGELOG.md, not "what changed" docs
- Feature docs: How it works, not current status
- Examples: `examples/` are tested and stay current - prefer pointing to them

**Before creating docs, ask**:
- Does this duplicate info elsewhere?
- Will this need updating when code changes?
- Is this better as a working example in `examples/`?
- Could this go in feature docs or library docs instead?

**Good docs**:
- Reference implementation, don't duplicate it
- Stay relevant even as code evolves
- Clear single purpose

**Bad docs**:
- Duplicate code examples that drift from implementation
- Status that needs constant updating
- Multiple places saying the same thing

---

## When You Need Details

- **Architecture deep dive**: See `lib/core.ts` source code
- **Command examples**: See `examples/website/.forge2/`
- **Testing patterns**: See `tests/`
- **Library usage**: See `docs/libraries/`
- **Design decisions**: See `docs/archive/`
