# Command Patterns - Quick Reference

**Multiple ways to define commands, choose what fits!**

---

## Pattern 1: Simple Inline Object ⭐

**Best for:** Quick one-off commands

```typescript
export const hello = {
  description: 'Say hello',
  execute: async (args) => {
    console.log(`Hello, ${args[0] || 'World'}!`);
  }
};
```

**Pros:**
- ✅ Minimal boilerplate
- ✅ No typing needed
- ✅ Perfect for simple commands

---

## Pattern 2: Typed ForgeCommand

**Best for:** Complex commands with options

```typescript
import type { ForgeCommand } from '@forge/core';

export const deploy: ForgeCommand = {
  description: 'Deploy to environment',
  usage: 'deploy <environment> [options]',

  execute: async (args) => {
    const cmd = new Command();
    cmd
      .argument('<environment>')
      .option('-s, --skip-tests', 'Skip tests')
      .parse(['node', 'forge2', ...args], { from: 'user' });

    // Full type safety!
    const env = cmd.args[0];
    const options = cmd.opts();

    // ... implementation
  }
};
```

**Pros:**
- ✅ Full type safety
- ✅ Commander integration
- ✅ Self-documenting

---

## Pattern 3: One-Liner

**Best for:** Trivial commands

```typescript
export const version = {
  description: 'Show version',
  execute: async () => console.log('v2.0.0')
};
```

---

## Pattern 4: With Validation

**Best for:** Commands that need arg checking

```typescript
export const connect = {
  description: 'Connect to service',

  execute: async (args) => {
    const service = args[0];

    if (!service) {
      console.error('Error: Service name required');
      process.exit(1);
    }

    const valid = ['db', 'redis', 'api'];
    if (!valid.includes(service)) {
      console.error(`Unknown service: ${service}`);
      console.log(`Available: ${valid.join(', ')}`);
      process.exit(1);
    }

    // ... connect logic
  }
};
```

---

## Pattern 5: Sub-Actions (Git Style)

**Best for:** Commands with multiple actions

```typescript
export const cache = {
  description: 'Cache operations',

  execute: async (args) => {
    const action = args[0];

    switch (action) {
      case 'clear':
        // clear cache
        break;

      case 'show':
        // show status
        break;

      case 'set':
        const [key, value] = args.slice(1);
        // set key=value
        break;

      default:
        console.error(`Unknown action: ${action}`);
        console.log('Available: clear, show, set, get');
        process.exit(1);
    }
  }
};
```

**Usage:**
```bash
forge2 cache clear
forge2 cache show
forge2 cache set foo bar
forge2 cache get foo
```

---

## Pattern 6: With Confirmation

**Best for:** Dangerous operations

```typescript
export const cleanup = {
  description: 'Delete old files',

  execute: async (args) => {
    const cmd = new Command();
    cmd
      .option('-f, --force', 'Skip confirmation')
      .parse(['node', 'forge2', ...args], { from: 'user' });

    const options = cmd.opts();

    if (!options.force) {
      const { confirm } = await import('enquirer');
      const proceed = await confirm({
        message: 'Delete files?',
        initial: false
      });

      if (!proceed) {
        console.log('Cancelled');
        return;
      }
    }

    // ... cleanup logic
  }
};
```

---

## Loading Commands in config.ts

### Style 1: Inline

```typescript
export default {
  commands: {
    help: {
      description: 'Show help',
      execute: async () => console.log('Help!')
    }
  }
};
```

### Style 2: Individual Imports

```typescript
import * as website from './website';

export default {
  commands: {
    build: website.build,
    sync: website.sync,
    publish: website.publish
  }
};
```

### Style 3: Spread Module

```typescript
import examples from './examples';

export default {
  commands: {
    ...examples  // Gets all exports
  }
};
```

### Style 4: Mix and Match

```typescript
import * as website from './website';
import examples from './examples';

export default {
  commands: {
    // Inline
    help: { ... },

    // Individual
    build: website.build,

    // Spread
    ...examples,

    // Override if needed
    hello: {
      description: 'Custom hello',
      execute: async () => console.log('Custom!')
    }
  }
};
```

---

## Common Patterns

### With Spinner

```typescript
import ora from 'ora';

export const deploy = {
  description: 'Deploy',
  execute: async (args) => {
    const spinner = ora('Deploying...').start();

    try {
      await doWork();
      spinner.succeed('Deployed!');
    } catch (err) {
      spinner.fail('Deploy failed');
      throw err;
    }
  }
};
```

### With Logging

```typescript
import { createLogger } from '@forge/logger';

const log = createLogger('my-command');

export const deploy = {
  description: 'Deploy',
  execute: async (args) => {
    log.info({ env: 'staging' }, 'Starting deploy');

    try {
      await doWork();
      log.info('Deploy succeeded');
    } catch (err) {
      log.error({ err }, 'Deploy failed');
      throw err;
    }
  }
};
```

### With listr2 (Multi-Step)

```typescript
import { Listr } from 'listr2';

export const publish = {
  description: 'Publish',
  execute: async (args) => {
    const tasks = new Listr([
      {
        title: 'Building',
        task: async () => await build()
      },
      {
        title: 'Syncing',
        task: async () => await sync()
      },
      {
        title: 'Invalidating',
        task: async () => await invalidate()
      }
    ]);

    await tasks.run();
  }
};
```

---

## Complete Example

```typescript
// commands/deploy.ts
import { Command } from 'commander';
import { $ } from 'bun';
import chalk from 'chalk';
import ora from 'ora';
import { createLogger } from '@forge/logger';
import type { ForgeCommand } from '@forge/core';

const log = createLogger('deploy');

export const deploy: ForgeCommand = {
  description: 'Deploy to environment',
  usage: 'deploy <environment> [options]',

  execute: async (args) => {
    // Parse options
    const cmd = new Command();
    cmd
      .argument('<environment>', 'Environment to deploy to')
      .option('-s, --skip-tests', 'Skip running tests')
      .option('-f, --force', 'Force deploy')
      .parse(['node', 'forge2', ...args], { from: 'user' });

    const environment = cmd.args[0];
    const options = cmd.opts();

    // Log structured data
    log.info({ environment, options }, 'Starting deploy');

    // Show spinner
    const spinner = ora(`Deploying to ${chalk.cyan(environment)}...`).start();

    try {
      // Do work
      if (!options.skipTests) {
        spinner.text = 'Running tests...';
        await $`npm test`;
      }

      spinner.text = `Deploying to ${environment}...`;
      await $`./deploy.sh ${environment}`;

      // Success
      spinner.succeed(chalk.green(`Deployed to ${environment}!`));
      log.info({ environment }, 'Deploy succeeded');

    } catch (error) {
      // Failure
      spinner.fail(chalk.red('Deploy failed'));
      log.error({ err: error, environment }, 'Deploy failed');
      throw error;
    }
  }
};
```

---

## Summary

**Use what fits:**

- **Simple command?** → Inline object
- **Complex options?** → Typed ForgeCommand + Commander
- **One-liner?** → Minimal export
- **Multiple actions?** → Switch on first arg
- **Dangerous?** → Add confirmation
- **Multi-step?** → Use listr2

**Mix and match in config.ts:**
- Inline for one-offs
- Import for organization
- Spread for command groups

**Just like forge v1 - flexible and easy!** ✨
