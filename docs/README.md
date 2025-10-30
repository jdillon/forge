# Forge v2 Documentation

**Philosophy**: *"It's for me mostly, so I like awesome."*

Since we're using Bun anyway, let's make this CLI **absolutely delightful** to use.

---

## Status

**Branch**: `v2-prototype` (TypeScript/Bun implementation)
**Tests**: 39 pass, 0 skip, 0 fail
**Decision**: Pure TypeScript/Bun (not Bash, not hybrid)

---

## Quick Start

### For Users

Writing commands? Start with:
- **[command-patterns.md](command-patterns.md)** - How to write commands (examples!)
- **[../examples/website/](../examples/website/)** - Working example project (tested!)
- **[libraries/](libraries/)** - CLI library reference (chalk, ora, listr2, etc.)

### For Contributors

Understanding the architecture:
- **[features/](features/)** - In-depth feature documentation
- **[reference/](reference/)** - System reference (XDG, dependencies, package management)
- **[planning/](planning/)** - Future features not yet implemented

---

## Documentation Structure

### Top Level (Most Used)
| Document | Purpose |
|----------|---------|
| **[command-patterns.md](command-patterns.md)** | Quick reference for writing commands |

### Directories
| Directory | Purpose |
|----------|---------|
| **[features/](features/)** | In-depth feature documentation (auto-discovery, module metadata, etc.) |
| **[libraries/](libraries/)** | CLI library reference (chalk, ora, listr2, boxen, etc.) |
| **[reference/](reference/)** | System reference (XDG paths, dependencies, package management) |
| **[planning/](planning/)** | Future features not yet implemented |
| **[archive/](archive/)** | Historical docs (language comparisons, design decisions) |


---

## What's Where

### Need to write commands?
→ [command-patterns.md](command-patterns.md) - Quick patterns
→ [../examples/website/](../examples/website/) - Working example (tested!)

### Want to understand a feature?
→ [features/](features/) directory

### Looking up a library API?
→ [libraries/](libraries/) directory

### Need reference material?
→ [reference/](reference/) directory

### Current status and what's next?
→ [../README.md](../README.md) - Top-level README

### What changed?
→ [../CHANGELOG.md](../CHANGELOG.md) - Version history

### Curious about future plans?
→ [planning/](planning/) directory

### Understanding past decisions?
→ [archive/](archive/) directory

---

## Key Decisions Made

✅ **Language**: Pure TypeScript/Bun (not Bash, not hybrid)
✅ **Runtime**: Bun (>=1.0.0) with `$` operator for shell commands
✅ **CLI Framework**: Commander.js for parsing
✅ **Logging**: Pino (structured JSON + pretty mode)
✅ **UI Libraries**: chalk, ora, listr2, boxen, cli-table3
✅ **Config**: YAML-based (.forge2/config.yml) with TypeScript modules
✅ **Structure**: Auto-discovery via module exports + `__module__` metadata
✅ **Directories**: XDG-compliant (~/.local/share/forge2/, etc.)
✅ **Module Distribution**: Git URLs via Bun package manager

---

## Philosophy & Principles

### "It's for me mostly, so I like awesome"

Forge v2 prioritizes delightful UX:
- Beautiful terminal output (colors, spinners, boxes)
- Clear, actionable error messages
- Structured logging for audit trails
- Modern conventions (XDG paths)
- Type safety without boilerplate
- Fast startup (~60ms)

### Design Principles

1. **Simple commands stay simple** - One-liner commands work with minimal boilerplate
2. **Powerful when needed** - Full Commander/TypeScript power available
3. **Auto-discovery** - Export a command, it's available
4. **Type-safe** - TypeScript catches errors at dev time
5. **Delightful UX** - Not just functional, but enjoyable to use

---

## Project Structure

```
docs/
├── README.md                      # This file
├── command-patterns.md            # User guide: writing commands
├── whats-working-now.md           # Status and features
├── xdg-paths.md                   # Directory structure
├── dependencies.md                # Security policy
├── output-helpers.md              # Library comparison
├── package-management.md          # Bun PM
├── module-sharing-private.md      # Git modules
├── libraries/                     # Library reference
│   ├── README.md
│   ├── chalk.md
│   ├── ora.md
│   ├── listr2.md
│   ├── boxen.md
│   ├── commander.md
│   ├── pino.md
│   └── ...
└── archive/                       # Historical docs
    ├── language-evaluation.md
    ├── recommendations.md
    ├── questions-for-jason.md
    └── ...
```

---

## Next Steps

See **[whats-working-now.md](whats-working-now.md)** for current status and roadmap.

**TODO**:
1. Module commands (`forge2 module add/list/update`)
2. Example module repository
3. Real-world testing on cirqil.com
4. Shell completion (omelette integration)
5. Helper utilities (if needed)

---

## Contributing

Found an issue or want to improve docs?

1. Update the relevant documentation file
2. Keep it concise and practical
3. Add examples when possible
4. Follow the existing style

---

**Last Updated**: 2025-10-30
