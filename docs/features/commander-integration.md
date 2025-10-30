# Commander Integration

Forge uses Commander.js for rich CLI features while keeping command definitions simple.

---

## Architecture

**Forge commands** (simple) → **Framework bridge** → **Commander** (rich CLI)

```
┌──────────────────┐
│ ForgeCommand     │  Simple command definition
│ - description    │
│ - execute()      │
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│ Framework        │  Translates to Commander
│ buildCommander() │
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│ Commander.js     │  Handles parsing, help, validation
│ - parse()        │
│ - help()         │
└──────────────────┘
```

---

## How It Works

### 1. Define Command (Simple)

```typescript
export const deploy: ForgeCommand = {
  description: 'Deploy website',
  execute: async (options, args, context) => {
    console.log('Deploying...');
  }
};
```

### 2. Framework Translates

```typescript
// lib/core.ts
function buildCommanderCommand(
  name: string,
  forgeCmd: ForgeCommand,
  context: ForgeContext
): Command {
  const cmd = new Command(name);
  cmd.description(forgeCmd.description);

  // Let command customize if needed
  if (forgeCmd.defineCommand) {
    forgeCmd.defineCommand(cmd);
  }

  // Install action handler
  cmd.action(async (...args) => {
    const options = args[args.length - 2];
    const positionalArgs = args.slice(0, -2);
    await forgeCmd.execute(options, positionalArgs, context);
  });

  return cmd;
}
```

### 3. Commander Parses

User runs: `forge2 deploy staging --skip-tests`

Commander:
- Matches `deploy` command
- Parses `staging` as argument
- Parses `--skip-tests` as flag
- Invokes action handler

### 4. Forge Command Executes

```typescript
execute: async (options, args, context) => {
  // options.skipTests = true
  // args[0] = 'staging'
  // Already parsed!
}
```

---

## Custom Options

Use `defineCommand()` for Commander-specific options:

```typescript
export const deploy: ForgeCommand = {
  description: 'Deploy website',

  defineCommand: (cmd) => {
    cmd
      .argument('<environment>', 'Target environment')
      .option('-s, --skip-tests', 'Skip tests')
      .option('--dry-run', 'Preview only');
  },

  execute: async (options, args) => {
    const env = args[0];              // 'staging'
    if (options.skipTests) { ... }    // true/false
    if (options.dryRun) { ... }       // true/false
  }
};
```

---

## Features You Get

### Auto-Generated Help

```bash
forge2 deploy --help
```

Output:
```
Usage: forge2 deploy [options] <environment>

Deploy website

Arguments:
  environment         Target environment

Options:
  -s, --skip-tests   Skip tests
  --dry-run          Preview only
  -h, --help         display help
```

### Validation

```bash
forge2 deploy  # Missing required argument
# Error: missing required argument 'environment'
```

### Type Safety

```typescript
import { Command } from 'commander';

defineCommand: (cmd: Command) => {
  cmd.option('--count <n>', 'Count', parseInt);
  //                         ^^^^^^^ Type coercion
}
```

---

## Global Flags

Framework adds global flags automatically:

```bash
forge2 --version              # Show version
forge2 --root /path/to/proj   # Override project root
forge2 -d                     # Debug mode (verbose logging)
forge2 -q                     # Quiet mode
forge2 -s                     # Silent mode
forge2 --no-color             # Disable colors
forge2 --log-format json      # JSON logs
```

These are configured in `lib/cli.ts` before commands load.

---

## Subcommand Groups

Groups are Commander subcommands:

```typescript
// Framework creates:
const program = new Command('forge2');

const websiteCmd = new Command('website');
websiteCmd.addCommand(buildCommand('build', ...));
websiteCmd.addCommand(buildCommand('deploy', ...));

program.addCommand(websiteCmd);
```

**Result**: `forge2 website build`, `forge2 website deploy`

---

## When To Use defineCommand()

**You need it if**:
- Custom arguments (required, optional, variadic)
- Options with choices/validation
- Default values
- Type coercion (parse numbers, dates)

**You don't need it if**:
- Simple command with no options
- Just needs description and execute

---

## Examples

### Simple (No defineCommand)
```typescript
export const version = {
  description: 'Show version',
  execute: async () => console.log('v2.0.0')
};
```

### With Options
```typescript
export const build: ForgeCommand = {
  description: 'Build website',

  defineCommand: (cmd) => {
    cmd
      .option('-c, --clean', 'Clean first')
      .option('--no-optimize', 'Skip optimization');
  },

  execute: async (options) => {
    if (options.clean) await clean();
    if (options.optimize) await optimize();  // --no-optimize negates
    await build();
  }
};
```

### With Arguments
```typescript
export const deploy: ForgeCommand = {
  description: 'Deploy to environment',

  defineCommand: (cmd) => {
    cmd.argument('<env>', 'Environment name');
  },

  execute: async (options, args) => {
    const env = args[0];  // Required
    await deploy(env);
  }
};
```

---

## Benefits

✅ **Simple commands stay simple** - Just description + execute
✅ **Rich features available** - Full Commander power when needed
✅ **Auto-help** - Generated from definitions
✅ **Type-safe** - TypeScript validates everything
✅ **Separation** - Forge commands don't know about Commander

---

## See Also

- [Auto-Discovery](auto-discovery.md) - How commands are discovered
- [Commander.js docs](https://github.com/tj/commander.js#readme) - Full Commander API
- [docs/libraries/commander.md](../libraries/commander.md) - Commander reference
