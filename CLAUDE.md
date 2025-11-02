# CLAUDE.md

This file provides guidance to Claude Code when working with this repository.

---

## **🔥 Working Agreement 🚀**

**Copy this section to other projects - these are Jason's preferences.**

### Communication
- **Direct and technical** - No excessive praise or superlatives
- **Present trade-offs** - Not just benefits, show costs too
- **Jason decides** - Present options clearly, let him choose
- **Call me Jason** - Not "you" or formal

### Workflow: No Auto-Commit
- **NEVER NEVER NEVER EVER run git commit without explicit "commit" command.**
- **STOP after work** - Give terse summary of changes
- **WAIT for "commit"** - Jason will run `git status`/`git diff` if he wants details
- **Why**: Helps him understand what changed and learn from your work

### Workflow: Proposals in tmp/
- **For significant changes**: Create proposal doc in `tmp/` (e.g., `tmp/refactor-proposal.md`)
- **Let Jason review first** - He can adjust before execution
- **Why it works**:
  - Clear documentation of what will change and why
  - Easy to discuss trade-offs
  - Can be referenced later to understand decisions
- **When to use**: Reorganizations, refactors, architectural changes, deleting things
- **Format**: Markdown with problem, solution, trade-offs, questions

### Workflow: Temp Files
- **Use project `tmp/`** - Project root only, never in subdirs
- **Purpose**: Proposals, analysis, scratch work
- **Cleanup**: Jason decides when to delete

### Documentation Principles
**Before writing documentation, always check for duplication - it becomes stale**:

**Ask these questions first**:
1. Does this duplicate info elsewhere? → Don't write it, reference the other location
2. Will this need updating when code changes? → Don't write it, reference working examples
3. Is this better as working code in `examples/`? → Write code, not docs
4. Does this belong in feature docs or library docs? → Put it there, not here

**What to write**:
- ✅ HOW it works (concepts, architecture) - stays stable
- ✅ WHERE to find things (references to examples/) - stays current
- ✅ WHY decisions were made (in docs/archive/) - stays relevant

**What NOT to write**:
- ❌ Code examples (copy working examples/ instead - tested code stays current)
- ❌ Current status (put in README.md at high level only)
- ❌ What changed (use CHANGELOG.md)
- ❌ Duplicate feature lists (one place only)

**Single source of truth**:
- Features list → README.md
- Working examples → examples/ (tested!)
- How features work → docs/features/
- Library APIs → docs/libraries/
- History → CHANGELOG.md

### Changelog & Versioning
- Follow [Keep a Changelog](https://keepachangelog.com/en/1.0.0/)
- Follow [Semantic Versioning](https://semver.org/spec/v2.0.0.html)
- Update `[Unreleased]` section as you work

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
CLAUDECODE=1 bun test       # AI-friendly output (failures only)
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

**ALWAYS use the logger** - No `console.log/error/warn` except:
- Bash scripts (no logger available)
- Very early initialization before logger configured

**Import and use:**
```typescript
import { log } from './logger';  // or createLogger('moduleName')

log.debug({ key: value }, 'Terse message');  // Debug info
log.info('User-facing status');              // Normal info
log.warn('Something unusual');               // Warnings
log.error({ error }, 'What failed');         // Errors
```

**Style guidelines:**
- Terse messages - simple, to the point
- Use structured data (first param object) not string concatenation
- No fancy rendering - logger handles formatting
- Minimal use of separators/special chars

**CLI flags:**
- `-d/--debug` - Sets log level to debug
- `-q/--quiet` - Sets log level to warn
- `-s/--silent` - Disables all logging
- `--log-level <level>` - Explicit level
- `--log-format <format>` - pretty (default) or json
- `--no-color` - Disable colors (respects `NO_COLOR` env var)

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

## When You Need Details

- **Architecture deep dive**: See `lib/core.ts` source code
- **Command examples**: See `examples/website/.forge2/`
- **Testing patterns**: See `tests/`
- **Library usage**: See `docs/libraries/`
- **Design decisions**: See `docs/archive/`
