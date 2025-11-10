# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [1.0.0] - 2025-11-09

### Changed
- First stable release of TypeScript/Bun implementation
- Renamed from "Forge v2" to "Forge" (bash version was 0.1, saved in forge-bash branch)
- Removed module documentation headers from source files (Apache 2.0 license headers remain)

### Added
- Installation system via `install.sh` script (Phase 1 of Module Distribution System)
- Package metadata in `package.json` with `@planet57/forge` scoped package name
- Wrapper script installation at `~/.local/bin/forge`
- Meta-project pattern for shared module storage at `~/.local/share/forge`
- Package exports for programmatic use (`@planet57/forge`, `@planet57/forge/types`)
- Bun test suite with 32 passing tests covering logger, validation, formats, colors
- Test documentation in `tests/README.md`
- Session stash support via `.claude/stashes/` for resuming work
- Documentation reorganization: moved session notes to `docs/archive/`
- New `docs/output-helpers.md` guide

### Changed
- Upgraded Commander.js from 12.0.0 to 14.0.2 for fancy help styling
- Changed `--log-format` to accept `pretty` or `json` (removed `color` value)
- Color is now controlled separately via `--no-color` flag and `NO_COLOR` env var
- Help and version commands now work without requiring a project setup
- Module path resolution now uses `resolve()` instead of `join()` for proper absolute paths
- Exit code handling fixed to properly handle exitCode=0 (using `??` instead of `||`)

### Fixed
- `--root` flag now works correctly from any directory (path resolution bug)
- Exit codes for `--help` and `--version` now correctly return 0
- `--version` no longer shows spurious ERROR message
- Module imports no longer fail when using `--root` from outside project directory

## [2.0.0-prototype] - 2025-01-30

### Added
- Complete TypeScript/Bun rewrite of Forge framework
- Commander.js integration for CLI parsing and help generation
- Pino-based logging with pretty formatter (synchronous, no worker threads)
- Cosmiconfig integration supporting YAML, JSON, JS, and TS config files
- Layered configuration system (user + project + local)
- Module auto-discovery from `.forge2/` directory
- Subcommand grouping with auto-detection from filename
- Module metadata for custom group names via `__module__` export
- XDG Base Directory standard support for user config (`~/.config/forge2/`)
- Logging controls: `-d/--debug`, `-q/--quiet`, `-s/--silent`, `--log-level`, `--log-format`
- Styled help output with colored titles, options, and commands
- `ForgeContext` providing commands access to config, state, log settings
- Early option parsing for logger configuration before module loading
- Error helpers: `die()`, `error()`, `exit()` for consistent error handling
- Update notifier integration (checks once per day)
- Example project structure in `examples/website/`

### Changed
- Runtime switched from Bash to Bun for better performance and TypeScript support
- CLI name changed from `forge` to `forge2` for prototype clarity
- Architecture refactored with clear separation: `cli.ts` (bootstrap) and `core.ts` (framework)
- Config directory moved from `~/.forge/` to XDG-compliant `~/.config/forge2/`
- Logger configured via public API instead of environment variables
- Invalid options now show clear ERROR messages before help output

### Fixed
- Exit performance improved by disabling pino-pretty worker threads
- Bootstrap sequence optimized to avoid circular dependencies
- Logger respects log level settings consistently

## [1.0.0] - Historical

### Added
- Original Bash-based Forge framework for deployments
- Support for AWS, Terraform, and Kubernetes workflows
- Command-based architecture with subcommands
- Configuration management and state tracking
- Deployment orchestration capabilities

---

## Release Notes

### v2.0.0-prototype - TypeScript/Bun Rewrite (Unreleased)

This is a complete rewrite of Forge using modern tooling:
- **TypeScript** for type safety and better IDE support
- **Bun** for fast runtime and built-in tooling
- **Commander.js** for robust CLI parsing and help generation
- **Pino** for structured, performant logging
- **Cosmiconfig** for flexible configuration

**Current Status**: Active development on `v2-prototype` branch. Core framework is functional with:
- ✅ Module auto-discovery and command registration
- ✅ Layered configuration system
- ✅ Styled help output with color control
- ✅ Comprehensive test suite (32 tests passing)
- ✅ Working example project

**Testing the Prototype**:
```bash
# Clone and install
git clone <repo-url>
cd forge-bash
git checkout v2-prototype
bun install

# Run example
cd examples/website
../../bin/forge2 --help
../../bin/forge2 basic greet Jason

# Run tests
bun test
```

See [README.md](README.md) and [docs/](docs/) for full documentation.
