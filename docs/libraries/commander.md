# commander

**Complete solution for Node.js command-line interfaces**

- npm: https://www.npmjs.com/package/commander
- GitHub: https://github.com/tj/commander.js
- Downloads: 200M+ weekly
- Battle-tested since 2011

---

## Installation

```bash
bun add commander
```

**Current version in forge2**: `14.0.2`

---

## Basic Usage

```typescript
import { Command } from 'commander';

const program = new Command();

program
  .name('forge2')
  .description('Modern CLI framework')
  .version('2.0.0');

program.parse();
```

---

## Options

```typescript
program
  .option('-d, --debug', 'Output extra debugging')
  .option('-s, --small', 'Small pizza size')
  .option('-p, --pizza-type <type>', 'Flavour of pizza');

program.parse();

const options = program.opts();
if (options.debug) console.log(options);
```

---

## Commands

```typescript
program
  .command('deploy')
  .description('Deploy to environment')
  .argument('<environment>', 'Environment name')
  .option('-s, --skip-tests', 'Skip tests')
  .action((environment, options) => {
    console.log(`Deploying to ${environment}`);
    if (options.skipTests) {
      console.log('Skipping tests');
    }
  });
```

---

## Forge Integration Pattern

Forge uses Commander to build commands from config:

```typescript
// lib/core.ts
export function buildCommanderCommand(
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

---

## Defining Commands in Forge

### Simple (No Options)
```typescript
export const version: ForgeCommand = {
  description: 'Show version',
  execute: async (options, args) => {
    console.log('v2.0.0');
  }
};
```

### With Options
```typescript
export const build: ForgeCommand = {
  description: 'Build website',

  defineCommand: (cmd) => {
    cmd
      .option('-c, --clean', 'Clean build directory first')
      .option('--no-optimize', 'Skip optimization');
  },

  execute: async (options, args) => {
    if (options.clean) {
      await $`rm -rf dist`;
    }
    // options.optimize is boolean (auto-negated from --no-optimize)
  }
};
```

### With Arguments
```typescript
export const deploy: ForgeCommand = {
  description: 'Deploy to environment',

  defineCommand: (cmd) => {
    cmd
      .argument('<environment>', 'Target environment')
      .option('-s, --skip-tests', 'Skip tests');
  },

  execute: async (options, args) => {
    const environment = args[0];  // Required positional arg
    console.log(`Deploying to ${environment}`);
  }
};
```

---

## Automatic Help

Commander generates help automatically:

```bash
$ forge2 deploy --help
Usage: forge2 deploy [options] <environment>

Deploy to environment

Arguments:
  environment           Target environment

Options:
  -s, --skip-tests      Skip tests
  -h, --help           display help for command
```

---

## Validation

```typescript
program
  .command('deploy')
  .argument('<environment>', 'Environment', (value) => {
    const valid = ['staging', 'production'];
    if (!valid.includes(value)) {
      throw new Error(`Invalid environment. Use: ${valid.join(', ')}`);
    }
    return value;
  });
```

---

## Default Values

```typescript
cmd
  .option('-b, --bucket <name>', 'S3 bucket', 'default-bucket')
  .option('--region <region>', 'AWS region', 'us-east-1');
```

---

## Choices

```typescript
import { Option } from 'commander';

cmd.addOption(
  new Option('-r, --region <region>', 'AWS region')
    .choices(['us-east-1', 'us-west-2', 'eu-west-1'])
);
```

---

## Boolean Negation

```typescript
// --no-optimize sets options.optimize = false
cmd.option('--no-optimize', 'Skip optimization');

// --no-color sets options.color = false
cmd.option('--no-color', 'Disable colors');
```

---

## Variadic Arguments

```typescript
cmd
  .argument('<files...>', 'Files to process')
  .action((files) => {
    console.log(`Processing: ${files.join(', ')}`);
  });

// Usage: forge2 process file1.txt file2.txt file3.txt
```

---

## Subcommands

```typescript
const cache = program
  .command('cache')
  .description('Cache operations');

cache
  .command('clear')
  .description('Clear cache')
  .action(() => {
    console.log('Clearing cache...');
  });

cache
  .command('show')
  .description('Show cache status')
  .action(() => {
    console.log('Cache status...');
  });

// Usage: forge2 cache clear
```

---

## Error Handling

```typescript
program.exitOverride();  // Throw instead of process.exit()

try {
  program.parse();
} catch (error) {
  console.error('Command failed:', error.message);
  process.exit(1);
}
```

---

## TypeScript Support

```typescript
import { Command } from 'commander';

// Get typed options
interface DeployOptions {
  skipTests?: boolean;
  dryRun?: boolean;
}

const options = program.opts<DeployOptions>();
```

---

## References

- Documentation: https://github.com/tj/commander.js#readme
- Examples: https://github.com/tj/commander.js/tree/master/examples
