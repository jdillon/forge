# Forge v2 - TypeScript/Bun CLI Framework

A modern, type-safe framework for building project-specific CLI tools using Bun and TypeScript.

## Status

🚧 **Prototype Phase** - This is the v2 prototype built with Bun/TypeScript to evaluate a modern redesign.

**Branch**: `v2-prototype`
**Previous version**: See `initial` branch for Bash-based v1 analysis

## Quick Start

```bash
# Install Bun (if not already installed)
curl -fsSL https://bun.sh/install | bash

# Try the example
cd examples/website
../../forge2 help
../../forge2 build
../../forge2 info

# Works from subdirectories (CWD-aware!)
cd dist
../../../forge2 info
```

## What's Different in v2

### Core Design Changes

- **Language**: Bun/TypeScript instead of Bash
- **Returns**: Native `return` instead of OUTPUT_PATTERN hack
- **Type Safety**: Full TypeScript type checking
- **Commands**: Bun's `$` operator for shell execution
- **XDG Compliant**: Follows modern directory standards

### Directory Structure (XDG Standard)

```
~/.local/share/forge2/       # Application data
├── modules/                # Shared modules
└── runtime/
    └── bin/bun            # Bundled Bun runtime

~/.local/bin/forge2         # Executable (in PATH)

~/.config/forge2/            # User configuration (optional)

~/.cache/forge2/             # Cache (safe to delete)

~/.local/state/forge2/       # Logs, history

# Project structure (unchanged)
project/
├── .forge2/
│   └── config.ts          # TypeScript config
└── ...
```

## Key Features

### ✅ Implemented

- **CWD-aware discovery** - Run from any subdirectory (like git)
- **TypeScript config** - Type-safe command definitions
- **Bun's `$` operator** - Clean shell command execution
- **Module system** - Load shared modules (project > user > system)
- **State management** - JSON-based project + user state
- **Command composition** - Commands can call other commands
- **Argument parsing** - Flag support (--dry-run, --paths, etc.)

### 🚧 Planned

- Module repository and distribution
- Shell completion (bash, zsh, fish)
- Help system with usage examples
- Auto-update mechanism
- Mock mode for testing

## Example: Website Deployment

See `examples/website/` for a complete working example.

```typescript
// .forge2/config.ts
export default {
  commands: {
    'sync': {
      description: 'Sync to S3',
      execute: async (args) => {
        const bucket = 'my-bucket';
        await $`aws s3 sync dist/ s3://${bucket}/ --delete`;
        console.log('✓ Sync complete');
      }
    },

    'publish': {
      description: 'Full publish workflow',
      execute: async (args) => {
        // Compose commands
        await config.commands.build.execute([]);
        await config.commands.sync.execute(args);
        await config.commands.invalidate.execute([]);
      }
    }
  }
} satisfies ForgeConfig;
```

## Why Bun/TypeScript?

### Advantages Over Bash

| Feature | Bash | Bun | Winner |
|---------|------|-----|--------|
| Command execution | `aws s3 ls` | `await $\`aws s3 ls\`` | Bash (slightly) |
| Function returns | OUTPUT_PATTERN hack | Native `return` | **Bun** 🏆 |
| Type safety | None | TypeScript | **Bun** 🏆 |
| Error handling | Verbose | try/catch | **Bun** 🏆 |
| JSON/data | jq/sed/awk | Native | **Bun** 🏆 |
| Startup time | 50ms | 60ms | Bash (negligible) |

See `docs/V2_PROTOTYPE_EVALUATION.md` for detailed analysis.

### The `$` Operator Game-Changer

Bun's `$` template literal makes shell commands almost as easy as Bash:

```typescript
// Almost identical to Bash!
await $`aws s3 sync . s3://${bucket}/`;

// Capture output
const distId = await $`aws cloudfront list-distributions ...`.text();

// Conditional execution
if (dryRun) {
  await $`aws s3 sync . s3://${bucket}/ --dryrun`;
}
```

## Documentation

### Analysis & Design
- **[Session Summary](docs/archive/session-summary.md)** - Context reset guide
- **[v2 Prototype Plan](docs/v2-prototype-plan.md)** - Design decisions
- **[v2 Prototype Evaluation](docs/v2-prototype-evaluation.md)** - Love it or hate it?
- **[Answers to Questions](docs/answers-to-questions.md)** - All decisions documented

### Deep Dives
- **[Output Pattern](docs/archive/output-pattern.md)** - The Bash stdout/stderr problem
- **[Language Comparison](docs/language-syntax-comparison.md)** - Bash vs Python vs Bun vs Ruby
- **[Shell Improvements](docs/shell-improvements-and-hybrid.md)** - Bash 5 features & hybrid approach

## Installation Strategy

### Bun Installation (XDG-Compliant)

```bash
# Install Bun to XDG location
export BUN_INSTALL="$HOME/.local/share/forge2/runtime"
curl -fsSL https://bun.sh/install | bash

# Symlink to PATH
ln -s ~/.local/share/forge2/runtime/bin/bun ~/.local/bin/bun

# Verify
bun --version
```

### Forge Installation (Planned)

```bash
# Clone to XDG data directory
git clone https://github.com/jdillon/forge ~/.local/share/forge2

# Symlink executable
ln -s ~/.local/share/forge2/bin/forge2 ~/.local/bin/forge2

# Verify
forge2 --version
```

### Version Management

```bash
# Upgrade Bun
bun upgrade

# Upgrade to specific version
curl -fsSL https://bun.sh/install | bash -s "bun-v1.1.34"

# Upgrade forge (planned)
forge2 update
```

## Architecture

```
forge2 (entry point)
  ↓
lib/core.ts (framework)
  ├─ Project discovery (walk up from CWD)
  ├─ Config loading (.forge2/config.ts)
  ├─ Module loading (search path)
  ├─ Command dispatch
  └─ State management (JSON)
  ↓
.forge2/config.ts (project config)
  ├─ Command definitions
  ├─ Module imports
  └─ Configuration
```

## Comparison to v1 (Bash)

### What's Better
- ✅ Real function returns (no OUTPUT_PATTERN hack)
- ✅ Type safety catches errors at dev time
- ✅ Native async/await for complex workflows
- ✅ Better data handling (JSON, APIs)
- ✅ Modern error handling (try/catch)
- ✅ XDG-compliant paths
- ✅ npm ecosystem available

### Trade-offs
- ⚠️ Requires Bun installation (can auto-install)
- ⚠️ ~3x more boilerplate than Bash
- ⚠️ TypeScript learning curve
- ⚠️ 10ms slower startup (60ms vs 50ms - negligible)

## Next Steps

1. **Get feedback** - Does this feel good? Love it or hate it?
2. **Add modules** - Create example AWS/Terraform modules
3. **Polish install** - Auto-install Bun, better bootstrap
4. **Add completion** - Shell completion support
5. **Documentation** - User guide, module authoring

## Alternative Approaches

If Bun doesn't feel right, we have documented alternatives:

1. **Pure Bash 5** - Use nameref pattern to solve OUTPUT_PATTERN
2. **Bash + Bun Hybrid** - Framework in Bash, helpers in Bun
3. **Pure Bun** - Current prototype (recommended)

See `docs/answers-to-questions.md` for detailed comparison.

## References

- **Bun Documentation**: https://bun.sh/docs
- **XDG Base Directory**: https://specifications.freedesktop.org/basedir-spec/
- **Original Analysis**: See `initial` branch

## License

TBD
