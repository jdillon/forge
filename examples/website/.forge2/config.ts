/**
 * Forge v2 Configuration
 *
 * This file loads modules and defines which commands are available.
 * Command implementations are in separate files for organization.
 *
 * Shows different ways to load commands:
 * 1. Inline simple object
 * 2. Individual named imports
 * 3. Spread entire module
 */

import type { ForgeConfig } from '@forge/core';
import chalk from 'chalk';

// Import command modules
import * as website from './website';
import examples from './examples';  // Default export (object with all commands)

export default {
  // Default command when no command specified
  defaultCommand: 'help',

  // Modules to load (future - from npm/git)
  // modules: ['@forge/aws', '@mycompany/terraform'],

  // Commands available in this project
  commands: {
    // ========================================================================
    // Style 1: Inline simple object (good for one-off commands)
    // ========================================================================

    help: {
      description: 'Show available commands',
      execute: async () => {
        console.log(chalk.bold('\n📦 Available Commands:\n'));
        console.log(chalk.cyan('Website:'));
        console.log('  build, sync, invalidate, publish, info');
        console.log(chalk.cyan('\nExamples:'));
        console.log('  hello, deploy, status, version, logs, connect, cleanup, cache');
        console.log('\n' + chalk.gray('Usage: forge2 <command> [options]'));
        console.log(chalk.gray('Try: forge2 <command> --help (future)'));
      }
    },

    // ========================================================================
    // Style 2: Individual named imports (explicit, clear what you're getting)
    // ========================================================================

    build: website.build,
    sync: website.sync,
    invalidate: website.invalidate,
    publish: website.publish,
    info: website.info,

    // ========================================================================
    // Style 3: Spread entire module (good for related command groups)
    // ========================================================================

    ...examples,

    // This gives you all commands from examples.ts:
    // hello, deploy, status, version, logs, connect, get-config, cleanup, cache

    // ========================================================================
    // Style 4: Mix and match - you can even override
    // ========================================================================

    // If you spread a module but want to override one command:
    // 'hello': {
    //   description: 'Custom hello',
    //   execute: async () => console.log('Different implementation!')
    // }

    // ========================================================================
    // Could also add more command modules:
    // ========================================================================
    // ...terraform,
    // ...kubernetes,
    // ...monitoring,
  }
} satisfies ForgeConfig;
