/**
 * Forge v2 Configuration
 *
 * This file loads modules and defines which commands are available.
 * Command implementations are in separate files for organization.
 */

import type { ForgeConfig } from '@forge/core';
import chalk from 'chalk';

// Import command modules
import * as website from './website';

export default {
  // Default command when no command specified
  defaultCommand: 'help',

  // Modules to load (future - from npm/git)
  // modules: ['@forge/aws', '@mycompany/terraform'],

  // Commands available in this project
  commands: {
    // Help command
    help: {
      description: 'Show available commands',
      execute: async () => {
        console.log(chalk.bold('\n📦 Website Deployment Commands:\n'));
        console.log('  ' + chalk.cyan('build') + '       Build website');
        console.log('  ' + chalk.cyan('sync') + '        Sync dist/ to S3');
        console.log('  ' + chalk.cyan('invalidate') + '  Invalidate CloudFront cache');
        console.log('  ' + chalk.cyan('publish') + '     Full publish (build + sync + invalidate)');
        console.log('  ' + chalk.cyan('info') + '        Show configuration');
        console.log('\n' + chalk.gray('Usage: forge2 <command> [options]'));
        console.log(chalk.gray('Examples:'));
        console.log(chalk.gray('  forge2 build --clean'));
        console.log(chalk.gray('  forge2 sync --dry-run'));
        console.log(chalk.gray('  forge2 publish --skip-build'));
      }
    },

    // Import commands from website module
    build: website.build,
    sync: website.sync,
    invalidate: website.invalidate,
    publish: website.publish,
    info: website.info,

    // Could also add more command modules:
    // ...terraform,
    // ...kubernetes,
    // ...monitoring,
  }
} satisfies ForgeConfig;
