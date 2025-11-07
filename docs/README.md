# Forge Documentation

**Status**: `module-system` branch - 74 tests passing

---

## Quick Start

**Writing commands?**
- [command-patterns.md](command-patterns.md) - Command patterns with examples
- [examples/website/](../examples/website/) - Working example project

**Understanding features?**
- [features/](features/) - Feature documentation
- [libraries/](libraries/) - CLI library reference

**Reference material?**
- [reference/](reference/) - System reference (XDG, dependencies)
- [planning/](planning/) - Future features
- [archive/](archive/) - Historical decisions

---

## Documentation Structure

| Location | Purpose |
|----------|---------|
| [command-patterns.md](command-patterns.md) | How to write commands |
| [testing.md](testing.md) | Test infrastructure |
| [features/](features/) | Feature docs (auto-discovery, metadata, etc.) |
| [libraries/](libraries/) | Library reference (chalk, ora, listr2, etc.) |
| [reference/](reference/) | System reference (XDG, dependencies) |
| [planning/](planning/) | Future features |
| [archive/](archive/) | Historical docs |

---

## Tech Stack

- **Runtime**: Bun (>=1.0.0) with TypeScript
- **CLI**: Commander.js
- **Logging**: Pino (structured JSON + pretty mode)
- **UI**: chalk, ora, listr2, boxen, cli-table3
- **Config**: YAML (.forge2/config.yml)
- **Paths**: XDG-compliant (~/.local/share/forge/)

---

## Philosophy

*"It's for me mostly, so I like awesome."*

Forge prioritizes delightful UX: beautiful output, clear errors, fast startup, type safety.
