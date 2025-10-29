# CLI Framework Comparison

**Goal:** Rich subcommands, auto-help, shell completion, minimal complexity

---

## The Contenders

### 1. Commander.js ⭐⭐⭐⭐⭐

**The industry standard**

```typescript
import { Command } from 'commander';

const program = new Command();

program
  .name('forge2')
  .description('Modern CLI framework')
  .version('2.0.0');

program
  .command('sync')
  .description('Sync to S3')
  .option('-d, --dry-run', 'Preview changes')
  .option('-b, --bucket <name>', 'S3 bucket')
  .action(async (options) => {
    await $`aws s3 sync . s3://${options.bucket}/`;
  });

program
  .command('deploy <environment>')
  .description('Deploy to environment')
  .option('-s, --skip-tests', 'Skip tests')
  .action(async (env, options) => {
    console.log(`Deploying to ${env}`);
  });

program.parse();
```

**Auto-generated help:**
```bash
$ forge2 --help
Usage: forge2 [options] [command]

Modern CLI framework

Options:
  -V, --version              output the version number
  -h, --help                 display help for command

Commands:
  sync [options]             Sync to S3
  deploy [options] <environment>  Deploy to environment
  help [command]             display help for command

$ forge2 sync --help
Usage: forge2 sync [options]

Sync to S3

Options:
  -d, --dry-run        Preview changes
  -b, --bucket <name>  S3 bucket
  -h, --help          display help for command
```

**Pros:**
- ✅ Battle-tested (13+ years, 7M+ weekly downloads)
- ✅ Auto-generated help
- ✅ Subcommands with nested options
- ✅ Type-safe with TypeScript
- ✅ Shell completion (via separate package)
- ✅ Familiar to most devs
- ✅ Excellent docs

**Cons:**
- ⚠️ Slightly verbose for simple cases
- ⚠️ Completion requires extra setup

**Verdict:** **Best overall choice** ⭐

---

### 2. Cleye ⭐⭐⭐⭐

**TypeScript-first, modern alternative**

```typescript
import { cli } from 'cleye';

const argv = cli({
  name: 'forge2',
  version: '2.0.0',

  flags: {
    dryRun: {
      type: Boolean,
      description: 'Preview changes',
      alias: 'd'
    }
  },

  commands: [
    {
      name: 'sync',
      flags: {
        bucket: {
          type: String,
          description: 'S3 bucket',
          alias: 'b'
        }
      },
      handler: async ({ flags }) => {
        await $`aws s3 sync . s3://${flags.bucket}/`;
      }
    }
  ]
});
```

**Pros:**
- ✅ Modern, TypeScript-native
- ✅ Smaller than commander (~15KB vs 30KB)
- ✅ Auto-generated help
- ✅ Clean API

**Cons:**
- ⚠️ Newer (less battle-tested)
- ⚠️ Smaller community
- ⚠️ No built-in completion

**Verdict:** Good alternative if you want modern/minimal

---

### 3. Cliffy (Deno-style) ⭐⭐⭐

**Feature-rich, Deno ecosystem**

```typescript
import { Command } from 'cliffy';

await new Command()
  .name('forge2')
  .version('2.0.0')
  .command('sync', 'Sync to S3')
    .option('-d, --dry-run', 'Preview')
    .option('-b, --bucket <name:string>', 'S3 bucket')
    .action(async ({ dryRun, bucket }) => {
      await $`aws s3 sync . s3://${bucket}/`;
    })
  .parse(Bun.argv);
```

**Pros:**
- ✅ Very feature-rich (prompts, tables, colors built-in)
- ✅ Shell completion built-in
- ✅ TypeScript-native

**Cons:**
- ⚠️ From Deno ecosystem (less Bun testing)
- ⚠️ Heavier (includes prompts, etc.)

**Verdict:** Interesting but maybe overkill

---

### 4. CAC ⭐⭐⭐

**Minimal, Vue ecosystem**

```typescript
import cac from 'cac';

const cli = cac('forge2');

cli
  .command('sync', 'Sync to S3')
  .option('--dry-run', 'Preview')
  .option('--bucket <name>', 'S3 bucket')
  .action(async (options) => {
    await $`aws s3 sync . s3://${options.bucket}/`;
  });

cli.parse();
```

**Pros:**
- ✅ Tiny (~10KB)
- ✅ Simple API
- ✅ Used by Vite

**Cons:**
- ⚠️ Less features than commander
- ⚠️ No completion
- ⚠️ Less mature

**Verdict:** Good for minimal CLIs

---

### 5. Oclif ⭐⭐

**Full framework (Heroku/Salesforce)**

```typescript
import { Command } from '@oclif/core';

export class Sync extends Command {
  static description = 'Sync to S3';

  static flags = {
    dryRun: Flags.boolean({ char: 'd' }),
    bucket: Flags.string({ char: 'b' })
  };

  async run() {
    const { flags } = await this.parse(Sync);
    await $`aws s3 sync . s3://${flags.bucket}/`;
  }
}
```

**Pros:**
- ✅ Full-featured (plugins, themes, etc.)
- ✅ Used by Heroku CLI
- ✅ Auto-completion built-in

**Cons:**
- ❌ **WAY too heavy** (~100+ dependencies)
- ❌ Complex file structure
- ❌ Overkill for our needs

**Verdict:** **Avoid** - too bloated

---

## Recommendation: Commander.js

**Use commander for:**
1. Rich subcommands ✅
2. Auto-generated help ✅
3. Type-safe options ✅
4. Battle-tested stability ✅

**Add completion with:**
```bash
bun add commander
bun add --dev @commander-js/extra-typings  # Better TS types
```

---

## Shell Completion Options

### Option 1: omelette (Recommended)

```bash
bun add omelette
```

```typescript
import omelette from 'omelette';

const completion = omelette('forge2 <command> <subcommand>');

completion.on('command', ({ reply }) => {
  reply(['sync', 'deploy', 'publish', 'module']);
});

completion.on('sync', ({ reply }) => {
  reply(['--dry-run', '--bucket']);
});

completion.init();
```

**Setup:**
```bash
forge2 completion >> ~/.bashrc
# or
forge2 completion >> ~/.zshrc
```

**Usage:**
```bash
forge2 <TAB>       # → sync, deploy, publish, module
forge2 sync --<TAB> # → --dry-run, --bucket
```

---

### Option 2: fig (Modern, macOS)

Fig provides IDE-like autocomplete for terminal (macOS only).

**Create completion spec:**
```typescript
// .fig/forge2.ts
const completionSpec = {
  name: "forge2",
  description: "Modern CLI framework",
  subcommands: [
    {
      name: "sync",
      description: "Sync to S3",
      options: [
        { name: ["--dry-run", "-d"], description: "Preview changes" },
        { name: ["--bucket", "-b"], description: "S3 bucket" }
      ]
    }
  ]
};

export default completionSpec;
```

---

### Option 3: Auto-generate from commander

```typescript
import { Command } from 'commander';
import { createCompletion } from 'commander-completion';

const program = new Command();
// ... define commands ...

// Generate completion
program
  .command('completion')
  .description('Generate shell completion')
  .action(() => {
    console.log(createCompletion(program));
  });
```

---

## Example: Full Commander Setup

```typescript
// forge2
#!/usr/bin/env bun
import { Command } from 'commander';
import { $ } from 'bun';
import pc from 'picocolors';

const program = new Command();

program
  .name('forge2')
  .description('Modern CLI framework for deployments')
  .version('2.0.0');

// Global options
program
  .option('-v, --verbose', 'Verbose output')
  .option('--root <path>', 'Project root directory');

// Website commands
const website = program
  .command('website')
  .description('Website deployment commands');

website
  .command('sync')
  .description('Sync to S3')
  .option('-d, --dry-run', 'Preview changes without uploading')
  .option('-b, --bucket <name>', 'S3 bucket name')
  .action(async (options, command) => {
    const { dryRun, bucket } = options;
    const verbose = command.parent.parent.opts().verbose;

    if (verbose) {
      console.log(pc.gray(`Syncing to s3://${bucket}/...`));
    }

    const args = ['aws', 's3', 'sync', 'dist/', `s3://${bucket}/`, '--delete'];
    if (dryRun) args.push('--dryrun');

    await $`${args}`;

    console.log(pc.green('✓') + ' Sync complete');
  });

website
  .command('publish')
  .description('Full publish (build + sync + invalidate)')
  .option('-d, --dry-run', 'Preview changes')
  .action(async (options) => {
    console.log(pc.blue('Publishing website...'));

    // Run other commands
    await website.parseAsync(['node', 'forge2', 'build'], { from: 'user' });
    await website.parseAsync(['node', 'forge2', 'sync', ...(options.dryRun ? ['--dry-run'] : [])], { from: 'user' });

    console.log(pc.green('✓') + ' Published!');
  });

// Module commands
const module = program
  .command('module')
  .description('Module management');

module
  .command('add <name>')
  .description('Install a module')
  .option('-g, --global', 'Install globally')
  .action(async (name, options) => {
    console.log(`Installing module: ${name}`);
    await $`bun add @forge-modules/${name}`;
    console.log(pc.green('✓') + ' Installed');
  });

module
  .command('list')
  .description('List installed modules')
  .action(async () => {
    const result = await $`bun pm ls --depth=0`.text();
    console.log(result);
  });

module
  .command('update [name]')
  .description('Update modules')
  .action(async (name) => {
    if (name) {
      await $`bun update @forge-modules/${name}`;
    } else {
      await $`bun update`;
    }
    console.log(pc.green('✓') + ' Updated');
  });

// Completion
program
  .command('completion')
  .description('Generate shell completion')
  .action(() => {
    // Generate completion script
    console.log('# Add to ~/.bashrc or ~/.zshrc:');
    console.log('eval "$(forge2 completion)"');
  });

// Parse
await program.parseAsync(process.argv);
```

**Usage:**
```bash
$ forge2 --help
Usage: forge2 [options] [command]

Modern CLI framework for deployments

Options:
  -V, --version       output the version number
  -v, --verbose       Verbose output
  --root <path>       Project root directory
  -h, --help         display help for command

Commands:
  website            Website deployment commands
  module             Module management
  completion         Generate shell completion
  help [command]     display help for command

$ forge2 website --help
Usage: forge2 website [options] [command]

Website deployment commands

Commands:
  sync [options]     Sync to S3
  publish [options]  Full publish (build + sync + invalidate)
  help [command]     display help for command

$ forge2 module add aws
Installing module: aws
✓ Installed
```

---

## Logging with Pino

### Simple Setup

```typescript
import pino from 'pino';

// Create logger
const log = pino({
  level: process.env.LOG_LEVEL || 'info',
  transport: {
    target: 'pino-pretty',
    options: {
      colorize: true,
      translateTime: 'HH:MM:ss',
      ignore: 'pid,hostname'
    }
  }
});

// Use it
log.info({ bucket: 'my-bucket' }, 'Starting sync');
log.error({ err: error }, 'Sync failed');
```

### Advanced Usage

```typescript
// Child loggers (add context)
const deployLog = log.child({ env: 'staging' });
deployLog.info('Deploying...');
// Output: {"level":30,"env":"staging","msg":"Deploying..."}

// Structured data
log.info({
  event: 'deployment',
  duration: 1234,
  status: 'success',
  files: 42
}, 'Deployment complete');

// Log levels
log.trace('Very detailed');  // 10
log.debug('Debug info');     // 20
log.info('Info message');    // 30
log.warn('Warning');         // 40
log.error('Error');          // 50
log.fatal('Fatal error');    // 60
```

### Production Mode

```bash
# JSON logs for production (parseable)
NODE_ENV=production forge2 deploy > logs.json

# Pretty logs for development
forge2 deploy

# Pipe to analysis
forge2 deploy | jq 'select(.level >= 50)'  # Errors only
```

---

## Proposed Package.json

```json
{
  "name": "forge2",
  "version": "2.0.0-prototype",
  "type": "module",
  "dependencies": {
    "commander": "^12.0.0",
    "picocolors": "^1.0.0",
    "pino": "^8.19.0",
    "omelette": "^0.4.17"
  },
  "devDependencies": {
    "bun-types": "latest",
    "pino-pretty": "^11.0.0",
    "@commander-js/extra-typings": "^12.0.0"
  }
}
```

**Just 4 dependencies:**
- `commander` - CLI framework
- `picocolors` - Colors
- `pino` - Logging
- `omelette` - Shell completion

---

## Summary

**Use Commander for:**
- ✅ Rich subcommands with options
- ✅ Auto-generated help
- ✅ Type-safe arguments
- ✅ Battle-tested reliability

**Add Pino for:**
- ✅ Structured logging (JSON)
- ✅ Pretty dev mode
- ✅ Production log parsing

**Add Omelette for:**
- ✅ Shell completion

**Total:** 4 dependencies, all well-vetted.

---

Want me to implement this? 🚀
