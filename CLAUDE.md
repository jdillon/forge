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
lib/           # Core framework code
  cli.ts       # CLI bootstrap and option parsing
  core.ts      # Forge class and module loading
  logger.ts    # Pino logger configuration
  types.ts     # TypeScript interfaces
  helpers.ts   # Utility functions
examples/      # Example projects
  website/     # Sample project with .forge2/ config
tests/         # Bun test suite
docs/          # Design docs and analysis
```

## Testing

```bash
# Run all tests
bun test

# Run specific test file
bun test tests/logger.test.ts

# Type checking
bun run typecheck
```

**Test Status**: 32 pass, 2 skip, 5 fail (core functionality solid)

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
