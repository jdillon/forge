/**
 * Minimal Forge CLI for Deno POC
 *
 * Tests:
 * 1. Can Deno execute TypeScript?
 * 2. Do import maps work?
 * 3. Can we use npm packages (commander)?
 */

import { Command } from 'commander';
import { versionCommand } from './commands/version.ts';
import { testLoggerCommand } from './commands/test-logger.ts';

// Create CLI
const program = new Command();

program
  .name('forge-deno-poc')
  .description('Minimal Forge CLI via Deno')
  .version('0.0.1-poc');

// Add test commands
program
  .command('version')
  .description('Show version')
  .action(versionCommand);

program
  .command('test-logger')
  .description('Test import map resolution')
  .action(testLoggerCommand);

// Parse and execute
program.parse();
