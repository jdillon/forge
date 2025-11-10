# Forge - Modern CLI Framework

**Philosophy**: *"It's for me mostly, so I like awesome."*

A delightful, type-safe framework for building project-specific deployment tools using Bun and TypeScript.

---

## Quick Start

```bash
# Try the example
cd examples/website
../../forge2 help
../../forge2 build
../../forge2 publish --dry-run

# Works from subdirectories!
cd dist
../../../forge2 info
```

---

## Features

### Core

- ✅ **CWD-aware** - Run from any subdirectory (like git)
- ✅ **Type-safe** - Full TypeScript with minimal boilerplate
- ✅ **Auto-discovery** - Export a command, it's available
- ✅ **Module system** - Shared modules across projects
- ✅ **State management** - Project and user-scoped state
- ✅ **Beautiful UI** - Colors, spinners, task lists, boxes
- ✅ **Structured logging** - Pino (JSON + pretty mode)
- ✅ **XDG compliant** - Modern directory standards

### Command Execution

Bun's `$` operator makes shell commands almost as easy as Bash:

```typescript
// Clean and type-safe
await $`aws s3 sync dist/ s3://${bucket}/`;

// Capture output
const distId = await $`aws cloudfront list...`.text();

// Conditional
if (dryRun) {
  await $`terraform plan`;
}
```

---

## Example

```typescript
// .forge2/config.yml
modules:
  - ./website

// .forge2/website.ts
export const publish: ForgeCommand = {
  description: 'Publish website',

  defineCommand: (cmd) => {
    cmd.option('--dry-run', 'Preview only');
  },

  execute: async (options, args, context) => {
    const tasks = new Listr([
      { title: 'Building', task: async () => await build() },
      { title: 'Uploading', task: async () => await upload() },
      { title: 'Invalidating CDN', task: async () => await invalidate() }
    ]);

    await tasks.run();

    console.log(boxen(
      chalk.green('✓ Published!'),
      { padding: 1, borderColor: 'green' }
    ));
  }
};
```

**Output:**
```
✔ Building
✔ Uploading
✔ Invalidating CDN

╭──────────────╮
│              │
│ ✓ Published! │
│              │
╰──────────────╯
```

---

## Installation

### Requirements

- Bun >= 1.0.0

### Install Bun

```bash
curl -fsSL https://bun.sh/install | bash
```

### Try Forge

```bash
git clone <repo> forge-v2
cd forge-v2
git checkout v2-prototype
bun install
cd examples/website
../../forge2 help
```

---

## Directory Structure

### System (XDG-Compliant)

```
~/.local/bin/forge2              # Executable
~/.local/share/forge2/           # Modules, runtime
~/.config/forge2/                # User config (optional)
~/.cache/forge2/                 # Cache (safe to delete)
~/.local/state/forge2/           # Logs, history
```

### Project

```
project/
├── .forge2/
│   ├── config.yml              # Module list
│   ├── website.ts              # Commands
│   ├── state.json              # Project state (tracked)
│   └── state.local.json        # User state (gitignored)
└── ...
```

---

## Writing Commands

See **[docs/command-patterns.md](docs/command-patterns.md)** for complete guide.

### Simple
```typescript
export const version = {
  description: 'Show version',
  execute: async () => console.log('v2.0.0')
};
```

### With Options
```typescript
export const deploy: ForgeCommand = {
  description: 'Deploy to environment',

  defineCommand: (cmd) => {
    cmd
      .argument('<env>', 'Environment')
      .option('-s, --skip-tests', 'Skip tests');
  },

  execute: async (options, args) => {
    const env = args[0];
    if (!options.skipTests) await runTests();
    await deploy(env);
  }
};
```

---

## Why TypeScript/Bun?

| Feature | Bash | Bun/TypeScript |
|---------|------|----------------|
| Shell commands | ✅ Native | ✅ `$` operator |
| Function returns | ❌ OUTPUT_PATTERN hack | ✅ Native |
| Type safety | ❌ | ✅ |
| Error handling | ⚠️ Verbose | ✅ try/catch |
| JSON/data | ⚠️ jq/sed/awk | ✅ Native |
| Startup | ~50ms | ~60ms |

**Winner**: Bun for everything except raw startup time (negligible 10ms difference)

---

## CLI Libraries Used

- **commander** - CLI framework and arg parsing
- **chalk** - Terminal colors
- **ora** - Spinners
- **listr2** - Task lists
- **boxen** - Boxes
- **cli-table3** - Tables
- **pino** - Structured logging
- **enquirer** - Interactive prompts

See **[docs/libraries/](docs/libraries/)** for individual library docs.

---

## Testing

```bash
bun test                # Run all tests
bun test --watch        # Watch mode
bun run test:junit      # Generate JUnit XML
bun run typecheck       # Type check
```

**Status**: 39 tests passing

---

## Documentation

- **[docs/](docs/)** - All documentation
- **[docs/command-patterns.md](docs/command-patterns.md)** - How to write commands
- **[docs/features/](docs/features/)** - Feature documentation
- **[docs/libraries/](docs/libraries/)** - Library reference
- **[docs/reference/](docs/reference/)** - System reference (XDG, dependencies, etc.)
- **[examples/website/](examples/website/)** - Working example (tested!)

---

## Status

🚧 **Prototype Phase** - v2-prototype branch

**Implemented**:
- Core framework with auto-discovery
- Commander.js integration
- Beautiful terminal UI
- State management
- Module system
- CWD-aware project discovery
- Test suite (39 passing)

**Next**:
1. Module distribution (`forge2 module add/list/update`)
2. Shell completion
3. Real-world testing

---

## License

Apache-2.0

---

## Contributing

See **[CLAUDE.md](CLAUDE.md)** for development workflow and conventions.
