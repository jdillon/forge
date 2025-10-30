# Commander Integration Design

## Core Concept

**Use Commander for what it's good at (parsing), keep Forge simple for command definition**

The framework acts as a bridge:
1. Forge commands define structure in simple terms
2. Framework translates this into Commander configuration
3. Commander handles all parsing/validation/help
4. Commander invokes our Forge command execute functions

---

## Architecture Flow

```
┌─────────────────────────────────────────────────────────────────┐
│ 1. USER DEFINES COMMANDS (Simple!)                              │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
              ┌───────────────────────────────┐
              │  config.ts exports commands   │
              │                               │
              │  commands: {                  │
              │    build: {                   │
              │      description: '...',      │
              │      options: [...],          │
              │      execute: (opts) => {}    │
              │    }                          │
              │  }                            │
              └───────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│ 2. FORGE FRAMEWORK STARTUP (forge2 entry point)                 │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
              ┌───────────────────────────────┐
              │  Load config.ts               │
              │  Get all commands             │
              └───────────────────────────────┘
                              │
                              ▼
              ┌───────────────────────────────┐
              │  FOR EACH COMMAND:            │
              │  1. Create Commander Command  │
              │  2. Let command enrich it     │
              │     (if defineCommand exists) │
              │  3. Install .action() handler │
              │     that calls execute()      │
              │  4. Register with main program│
              └───────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│ 3. COMMANDER PARSES (program.parse())                           │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
              ┌───────────────────────────────┐
              │  User runs: forge2 build -c   │
              │                               │
              │  Commander:                   │
              │  - Matches 'build' command    │
              │  - Parses '-c' flag           │
              │  - Validates arguments        │
              │  - Generates help if --help   │
              └───────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│ 4. COMMANDER INVOKES ACTION                                     │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
              ┌───────────────────────────────┐
              │  .action() handler runs       │
              │  (installed by framework)     │
              │                               │
              │  Calls:                       │
              │  command.execute(options)     │
              └───────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│ 5. FORGE COMMAND EXECUTES                                       │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
              ┌───────────────────────────────┐
              │  execute: (options) => {      │
              │    // options.clean = true    │
              │    // Already parsed!         │
              │    console.log('Building...')│
              │  }                            │
              └───────────────────────────────┘
```

---

## Command Definition Patterns

### Pattern 1: Simple (Minimal Boilerplate)

```typescript
export const version = {
  description: 'Show version',
  execute: async (options) => {
    console.log('v2.0.0');
  }
};
```

**Result:** Basic command, works, minimal help.

---

### Pattern 2: With Options (Declarative)

```typescript
export const build = {
  description: 'Build website',
  options: [
    { flags: '-c, --clean', description: 'Clean build directory first' },
    { flags: '--no-optimize', description: 'Skip optimization' }
  ],
  execute: async (options) => {
    if (options.clean) {
      await $`rm -rf dist`;
    }
    // options.optimize is boolean (negated from --no-optimize)
  }
};
```

**Result:** Framework creates Commander command with these options.
Full `--help` works automatically.

---

### Pattern 3: With Arguments (Positional)

```typescript
export const deploy = {
  description: 'Deploy to environment',
  arguments: [
    { name: '<environment>', description: 'Target environment (staging/prod)' },
    { name: '[version]', description: 'Optional version tag' }
  ],
  options: [
    { flags: '-s, --skip-tests', description: 'Skip tests' }
  ],
  execute: async (options, args) => {
    const [environment, version] = args;
    console.log(`Deploying ${environment} ${version || 'latest'}`);
    if (options.skipTests) {
      console.log('Skipping tests');
    }
  }
};
```

**Result:** Framework sets up arguments and options.
Commander validates required args.

---

### Pattern 4: Custom Enrichment (Advanced)

For complex cases where declarative isn't enough:

```typescript
export const sync = {
  description: 'Sync to S3',

  // Optional: Customize the Commander Command object
  defineCommand: (cmd: Command) => {
    cmd
      .option('-b, --bucket <name>', 'S3 bucket name', 'default-bucket')
      .option('-d, --dry-run', 'Preview changes')
      .option('--delete', 'Delete removed files', true)  // default true
      .addOption(
        new Option('-r, --region <region>', 'AWS region')
          .choices(['us-east-1', 'us-west-2', 'eu-west-1'])
      );
    return cmd;
  },

  execute: async (options) => {
    console.log(`Syncing to ${options.bucket} in ${options.region}`);
  }
};
```

**Result:** Framework calls `defineCommand()` to let command do custom setup.
Still installs `.action()` handler automatically.

---

## Framework Implementation

### Type Definitions

```typescript
export interface CommandOption {
  flags: string;                    // '-c, --clean'
  description?: string;             // 'Clean build directory'
  defaultValue?: any;               // Default value
  choices?: string[];               // Valid choices
}

export interface CommandArgument {
  name: string;                     // '<environment>' or '[optional]'
  description?: string;             // 'Target environment'
}

export interface ForgeCommand {
  description: string;
  usage?: string;                   // Optional usage string

  // Declarative setup (simple)
  options?: CommandOption[];
  arguments?: CommandArgument[];

  // OR custom setup (advanced)
  defineCommand?: (cmd: Command) => Command;

  // Execution
  execute: (options: any, args?: string[]) => Promise<void>;
}

export interface ForgeConfig {
  commands: Record<string, ForgeCommand>;
  modules?: string[];
  defaultCommand?: string;
}
```

---

### Framework Startup (forge2 entry point)

```typescript
#!/usr/bin/env bun
import { Command } from 'commander';
import { Forge } from './lib/core';

const program = new Command();

program
  .name('forge2')
  .description('Modern CLI framework')
  .version('2.0.0')
  .option('-r, --root <path>', 'Project root directory')
  .option('-v, --verbose', 'Verbose output');

// Find and load project config
const projectRoot = await discoverProject();
const forge = new Forge(projectRoot);
await forge.loadConfig();

// Register all commands with Commander
for (const [name, forgeCmd] of Object.entries(forge.config.commands)) {
  const cmd = buildCommanderCommand(name, forgeCmd);
  program.addCommand(cmd);
}

program.parse();
```

---

### Command Builder (The Magic!)

```typescript
function buildCommanderCommand(name: string, forgeCmd: ForgeCommand): Command {
  // 1. Create Commander Command
  const cmd = new Command(name);
  cmd.description(forgeCmd.description);

  if (forgeCmd.usage) {
    cmd.usage(forgeCmd.usage);
  }

  // 2. Setup via declarative config OR custom function
  if (forgeCmd.defineCommand) {
    // Advanced: Let command customize
    forgeCmd.defineCommand(cmd);

  } else {
    // Simple: Build from declarative config

    // Add arguments
    if (forgeCmd.arguments) {
      for (const arg of forgeCmd.arguments) {
        cmd.argument(arg.name, arg.description || '');
      }
    }

    // Add options
    if (forgeCmd.options) {
      for (const opt of forgeCmd.options) {
        if (opt.choices) {
          // Use Option class for choices
          const option = new Option(opt.flags, opt.description);
          option.choices(opt.choices);
          if (opt.defaultValue !== undefined) {
            option.default(opt.defaultValue);
          }
          cmd.addOption(option);
        } else {
          cmd.option(opt.flags, opt.description, opt.defaultValue);
        }
      }
    }
  }

  // 3. Install action handler (ALWAYS)
  cmd.action(async (...args) => {
    // Commander passes: (arg1, arg2, ..., options, command)
    const command = args[args.length - 1];  // Last arg is Command object
    const options = args[args.length - 2];   // Second-to-last is options
    const positionalArgs = args.slice(0, -2); // Everything else is positional

    try {
      await forgeCmd.execute(options, positionalArgs);
    } catch (err) {
      console.error(`ERROR: Command failed: ${name}`);
      console.error(err);
      process.exit(1);
    }
  });

  return cmd;
}
```

---

## Benefits of This Design

### ✅ Simple Commands Stay Simple
```typescript
export const version = {
  description: 'Show version',
  execute: async () => console.log('v2.0')
};
```
One-liner commands still work!

### ✅ No Manual Parsing
Framework handles all parsing via Commander. Commands receive parsed `options` object.

### ✅ Automatic Help
Commander generates help from metadata:
```bash
forge2 build --help
# Shows all options, descriptions, defaults automatically
```

### ✅ Commander Features for Free
- Partial option matching (`--hel` → `--help`)
- Type coercion (numbers, booleans)
- Validation (required args, choices)
- Error messages
- Version flag (`-V`)

### ✅ Flexibility When Needed
`defineCommand()` escape hatch for complex cases.

### ✅ Framework Controls Structure
Config is still simple POJO, framework orchestrates Commander.

---

## Migration Path

### Current Code
```typescript
export const sync: ForgeCommand = {
  description: 'Sync to S3',
  execute: async (args) => {
    const cmd = new Command();
    cmd.option('-d, --dry-run').parse(['node', 'forge2', ...args]);
    const options = cmd.opts();
    // Use options.dryRun
  }
};
```

### New Pattern (Simple)
```typescript
export const sync: ForgeCommand = {
  description: 'Sync to S3',
  options: [
    { flags: '-d, --dry-run', description: 'Preview changes' },
    { flags: '-b, --bucket <name>', description: 'S3 bucket', defaultValue: 'my-bucket' }
  ],
  execute: async (options) => {
    // options.dryRun and options.bucket already parsed!
    console.log(`Syncing to ${options.bucket}`);
  }
};
```

### New Pattern (Advanced)
```typescript
export const sync: ForgeCommand = {
  description: 'Sync to S3',
  defineCommand: (cmd) => {
    cmd
      .option('-d, --dry-run', 'Preview changes')
      .option('-b, --bucket <name>', 'S3 bucket', 'my-bucket')
      .option('--delete', 'Delete removed files', true);
    return cmd;
  },
  execute: async (options) => {
    console.log(`Syncing to ${options.bucket}`);
  }
};
```

---

## Open Questions

### 1. How to handle global options?
Should commands see `--verbose` from main program?

**Option A:** Pass as second parameter
```typescript
execute: async (options, args, globalOptions) => {
  if (globalOptions.verbose) { ... }
}
```

**Option B:** Merge into options
```typescript
execute: async (options) => {
  // options.verbose comes from global flag
}
```

### 2. Context passing?
Commands might need project root, state manager, etc.

**Option A:** Pass context object
```typescript
execute: async (options, args, context) => {
  console.log(context.projectRoot);
  await context.state.set('lastBuild', Date.now());
}
```

**Option B:** Commands import from framework
```typescript
import { getContext } from '@forge/core';

execute: async (options) => {
  const ctx = getContext();
}
```

### 3. Positional args vs options?
Some commands take positional args:
```bash
forge2 deploy staging  # 'staging' is positional
forge2 deploy --env staging  # '--env staging' is option
```

Both patterns? User choice?

---

## Next Steps

1. **Prototype `buildCommanderCommand()` function**
2. **Update `ForgeCommand` interface** with new fields
3. **Modify forge2 entry point** to register commands
4. **Convert one command** (e.g., `sync`) to new pattern
5. **Test `--help` works automatically**
6. **Decide on context passing pattern**
7. **Document patterns** for users

---

## Summary

**The Big Idea:** Framework translates simple Forge command definitions into full Commander configurations, then lets Commander do the heavy lifting (parsing, validation, help). Commands just define structure and implement logic.

**Key Insight:** We control the abstraction level. Simple commands stay simple. Complex commands can use full Commander power via `defineCommand()`.

**Result:** Best of both worlds - simple config-driven commands with full Commander features.
