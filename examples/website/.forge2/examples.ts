/**
 * Example command bundle showing different command definition styles
 *
 * Demonstrates:
 * 1. Simple inline object (no typing)
 * 2. Typed ForgeCommand export
 * 3. Inline with Commander options
 * 4. Minimal one-liner
 */

import {
  $,
  Command,
  chalk,
  ora,
  createLogger,
  exit,
  type ForgeCommand,
  type ForgeContext
} from '@forge/command';

const log = createLogger('examples');

// ============================================================================
// Style 1: Simple inline object (like forge v1)
// No options - just uses positional args
// ============================================================================

export const hello = {
  description: 'Simple hello world command',
  execute: async (options, args, context) => {
    const name = args[0] || 'World';
    console.log(chalk.green(`Hello, ${name}!`));
    log.info({ name }, 'Greeted user');
  }
};

// ============================================================================
// Style 2: Typed ForgeCommand with options and arguments
// ============================================================================

export const deploy: ForgeCommand = {
  description: 'Deploy to environment',

  defineCommand: (cmd) => {
    cmd
      .argument('<environment>', 'Environment to deploy to')
      .option('-s, --skip-tests', 'Skip running tests')
      .option('-f, --force', 'Force deploy even if checks fail');

  },

  execute: async (options, args, context) => {
    const environment = args[0];

    log.info({ environment, options }, 'Starting deploy');

    const spinner = ora(`Deploying to ${chalk.cyan(environment)}...`).start();

    await Bun.sleep(1000);

    if (options.skipTests) {
      spinner.info(chalk.yellow('Tests skipped'));
    } else {
      spinner.text = 'Running tests...';
      await Bun.sleep(500);
      spinner.text = `Deploying to ${environment}...`;
    }

    spinner.succeed(chalk.green(`Deployed to ${environment}!`));
    log.info({ environment, skippedTests: options.skipTests }, 'Deploy succeeded');
  }
};

// ============================================================================
// Style 3: Inline with minimal logic
// ============================================================================

export const status = {
  description: 'Show current status',
  execute: async (options, args, context) => {
    console.log(chalk.bold('\n📊 Status:\n'));
    console.log('  ' + chalk.gray('Environment: ') + chalk.cyan('development'));
    console.log('  ' + chalk.gray('Version: ') + chalk.cyan('2.0.0-prototype'));
    console.log('  ' + chalk.gray('Status: ') + chalk.green('✓ Running'));
    console.log();
  }
};

// ============================================================================
// Style 4: One-liner command (super simple)
// ============================================================================

export const version = {
  description: 'Show version',
  execute: async (options, args, context) => console.log('v2.0.0-prototype')
};

// ============================================================================
// Style 5: Command that calls shell tools
// ============================================================================

export const logs: ForgeCommand = {
  description: 'Show recent logs',

  defineCommand: (cmd) => {
    cmd
      .option('-n, --lines <number>', 'Number of lines to show', '20')
      .option('-f, --follow', 'Follow log output');

  },

  execute: async (options, args, context) => {
    log.debug({ options }, 'Showing logs');

    // Example: tail logs
    if (options.follow) {
      await $`tail -f -n ${options.lines} /tmp/forge.log`.catch(() => {
        console.log(chalk.yellow('No logs found'));
      });
    } else {
      await $`tail -n ${options.lines} /tmp/forge.log`.catch(() => {
        console.log(chalk.yellow('No logs found'));
      });
    }
  }
};

// ============================================================================
// Style 6: Command with validation
// ============================================================================

export const connect: ForgeCommand = {
  description: 'Connect to a service',

  defineCommand: (cmd) => {
    cmd.argument('<service>', 'Service to connect to (db, redis, api)');

  },

  execute: async (options, args, context) => {
    const service = args[0];

    // Validation
    const validServices = ['db', 'redis', 'api'];
    if (!validServices.includes(service)) {
      console.error(chalk.red(`✗ Error: Unknown service: ${service}`));
      console.log(chalk.gray(`Available: ${validServices.join(', ')}`));
      exit(1);
    }

    log.info({ service }, 'Connecting to service');

    const spinner = ora(`Connecting to ${service}...`).start();
    await Bun.sleep(800);
    spinner.succeed(chalk.green(`Connected to ${service}`));

    log.info({ service }, 'Connected successfully');
  }
};

// ============================================================================
// Style 7: Command that returns data (for composition)
// ============================================================================

export const getConfig: ForgeCommand = {
  description: 'Get configuration value',

  defineCommand: (cmd) => {
    cmd.argument('<key>', 'Configuration key to retrieve');

  },

  execute: async (options, args, context) => {
    const key = args[0];

    const config = {
      'api.url': 'https://api.example.com',
      'api.timeout': '30s',
      'db.host': 'localhost:5432',
      'cache.ttl': '3600'
    };

    const value = config[key];

    if (value) {
      console.log(value);
      log.debug({ key, value }, 'Config value retrieved');
    } else {
      console.error(chalk.red(`Config key not found: ${key}`));
      log.warn({ key }, 'Config key not found');
      exit(1);
    }
  }
};

// ============================================================================
// Style 8: Dangerous command with confirmation
// ============================================================================

export const cleanup: ForgeCommand = {
  description: 'Clean up old files',

  defineCommand: (cmd) => {
    cmd
      .option('-f, --force', 'Skip confirmation')
      .option('-d, --days <number>', 'Files older than N days', '30');

  },

  execute: async (options, args, context) => {
    log.info({ options }, 'Starting cleanup');

    // Confirmation (unless --force)
    if (!options.force) {
      const { confirm } = await import('enquirer');
      const proceed = await confirm({
        message: chalk.yellow(`Delete files older than ${options.days} days?`),
        initial: false
      });

      if (!proceed) {
        console.log(chalk.gray('Cancelled'));
        return;
      }
    }

    const spinner = ora('Cleaning up...').start();
    await Bun.sleep(1000);
    spinner.succeed(chalk.green('Cleaned up 42 files'));

    log.info({ filesDeleted: 42 }, 'Cleanup complete');
  }
};

// ============================================================================
// Style 9: Command with sub-actions (like git add/commit/push)
// ============================================================================

export const cache = {
  description: 'Cache operations',

  defineCommand: (cmd) => {
    cmd.argument('<action>', 'Action to perform (clear, show, set, get)');

  },

  execute: async (options, args, context) => {
    const action = args[0];
    const restArgs = args.slice(1);

    log.debug({ action }, 'Cache command');

    switch (action) {
      case 'clear':
        const spinner = ora('Clearing cache...').start();
        await Bun.sleep(500);
        spinner.succeed(chalk.green('Cache cleared'));
        log.info('Cache cleared');
        break;

      case 'show':
        console.log(chalk.bold('\n💾 Cache Status:\n'));
        console.log('  ' + chalk.gray('Size: ') + chalk.cyan('42 MB'));
        console.log('  ' + chalk.gray('Items: ') + chalk.cyan('1,234'));
        console.log();
        break;

      case 'set': {
        const key = restArgs[0];
        const value = restArgs[1];
        if (!key || !value) {
          console.error(chalk.red('Usage: forge2 cache set <key> <value>'));
          exit(1);
        }
        console.log(chalk.green(`Set ${key} = ${value}`));
        log.info({ key, value }, 'Cache set');
        break;
      }

      case 'get': {
        const key = restArgs[0];
        if (!key) {
          console.error(chalk.red('Usage: forge2 cache get <key>'));
          exit(1);
        }
        console.log('value-for-' + key);
        break;
      }

      default:
        console.error(chalk.red(`Unknown action: ${action}`));
        console.log(chalk.gray('Available: clear, show, set, get'));
        exit(1);
    }
  }
};

// ============================================================================
// All commands exported as object (for easy spreading)
// ============================================================================

export default {
  hello,
  deploy,
  status,
  version,
  logs,
  connect,
  'get-config': getConfig,
  cleanup,
  cache
};
