# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Forge v2 - Modern CLI framework for deployments built with TypeScript and Bun. A prototype/experimental rewrite of the original Bash-based Forge framework.

## Development

**Branch**: `v2-prototype` - Active development branch for the TypeScript/Bun rewrite

**Tech Stack**:
- Runtime: Bun (>=1.0.0)
- Language: TypeScript (type="module")
- CLI Framework: Commander.js 14.0.2
- Logging: Pino with custom pretty formatter
- Config: Cosmiconfig (YAML, JSON, JS, TS support)
- Testing: Bun's built-in test runner

**Project Structure**:
```
lib/              # Core framework code
  cli.ts          # CLI bootstrap and option parsing
  core.ts         # Forge class and module loading
  logger.ts       # Pino logger configuration
  types.ts        # TypeScript interfaces
  helpers.ts      # Utility functions
  state.ts        # State management
  xdg.ts          # XDG directory paths
examples/         # Example projects (DO NOT modify in tests)
  website/        # Sample project with .forge2/ config
tests/            # Bun test suite
  fixtures/       # Test data (ALWAYS use for testing)
    test-project/ # Minimal project for test verification
docs/             # Design docs and analysis
docs/archive/     # Archived design docs
```

## Testing

```bash
# Run all tests
bun test

# Run specific test file
bun test tests/logger.test.ts

# Watch mode
bun test --watch

# Stop on first failure (debugging)
bun test --bail

# Generate JUnit XML for CI/CD (Maven Surefire-style)
bun run test:junit

# Type checking
bun run typecheck
```

**Test Status**: 39 pass, 0 skip, 0 fail

**Important**: Always use `tests/fixtures/test-project/` for testing, never modify `examples/` during tests

## Changelog and Releases

- Follow [Keep a Changelog](https://keepachangelog.com/en/1.0.0/) and [Semantic Versioning](https://semver.org/spec/v2.0.0.html)
- Update `[Unreleased]` section as you work
- On release: Update version in `package.json`, move `[Unreleased]` to new version in `CHANGELOG.md`, commit as "Release v{version}", tag, and push with tags

## Key Conventions

**Error Handling**:
- `die(message)` - Fatal error with ERROR: prefix, exits with code 1
- `error(message)` - Non-fatal error with ERROR: prefix, continues
- `log.error()` - App error respecting --silent flag

**Logging**:
- Use `createLogger(name)` from `lib/logger.ts`
- Configure via CLI flags: `-d/--debug`, `-q/--quiet`, `-s/--silent`, `--log-level`, `--log-format`
- Supports formats: pretty (default), json
- Color control: `--no-color` flag or `NO_COLOR` env var

**Module Loading**:
- Commands auto-discovered from `.forge2/` directory
- Export `ForgeCommand` objects with `description` and `execute`
- Optional `defineCommand()` for custom Commander configuration
- Optional `__module__` export for group customization

**Architecture Principles**:
- Thin adapter pattern: `cli.ts` handles bootstrap, delegates to `Forge` class
- No auto-commit: STOP after work, show changes, WAIT for "commit" command
- Logger config: CLI configures via public API, logger reads config
- Encapsulation: Forge class owns Commander integration

## Architecture Deep Dive

**Bootstrap Flow** (`cli.ts`):
1. Parse early options (before module loading) - needed for logger config
2. Check for unknown options (invalid flags should error before project discovery)
3. Configure logger with CLI flags (--debug, --log-format, --no-color)
4. Discover project root (walk up from CWD to find `.forge2/`, like git)
5. Skip project requirement only for explicit --help/-h/--version/-V flags
6. Create Forge instance and register commands
7. Parse full command line with Commander

**Module Loading** (`core.ts`):
- Modules declared in `.forge2/config.yml` under `modules:` array
- Auto-discover all exports: default export (object of commands) or named exports
- Group name derived from filename (e.g., `website.ts` → `website` group)
- Override group name with `__module__` export: `{ group: 'custom', description: '...' }`
- Commands accessed as: `forge2 <group> <command>` or `forge2 <command>` if `group: false`

**Command Structure**:
```typescript
export const myCommand: ForgeCommand = {
  description: 'What this command does',
  execute: async (options, args, context) => {
    // context.forge - Forge instance
    // context.config - Project config
    // context.settings - Merged settings
    // context.state - State manager
    // context.commandName - Current command name
    // context.groupName - Current group name
    // context.logLevel, logFormat, color - Logging config
  }
};
```

**Custom Commander Config** (optional):
```typescript
export function defineCommand(cmd: Command) {
  cmd
    .option('--dry-run', 'Dry run mode')
    .argument('[target]', 'Deployment target');
}
```

**State Management**:
- Project state: `.forge2/state.json` (git-ignored, project-local)
- User state: `~/.config/forge2/state.json` (user-global)
- Access via `context.state.get(key)` and `context.state.set(key, value)`
- Automatically saved after command execution
