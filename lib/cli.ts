/**
 * Forge v2 - CLI Implementation
 *
 * Main CLI setup and command registration
 */

import { Command } from 'commander';
import chalk from 'chalk';
import updateNotifier from 'update-notifier';
import { Forge, discoverProject, getProjectRoot, buildCommanderCommand } from './core';
import pkg from '../package.json' assert { type: 'json' };

export async function main(): Promise<void> {
  // Check for updates (once per day)
  updateNotifier({
    pkg,
    updateCheckInterval: 1000 * 60 * 60 * 24
  }).notify();

  try {
    await run();
  } catch (err: any) {
    console.error(chalk.red('✗ ERROR:'), err.message);
    process.exit(1);
  }
}

async function run(): Promise<void> {

  const program = new Command();

  program
    .name('forge2')
    .description('Modern CLI framework for deployments')
    .version(pkg.version)
    .option('-r, --root <path>', 'Project root directory')
    .option('-v, --verbose', 'Verbose output')
    .exitOverride();  // Override exit to cleanup first

  // Find project root
  const globalOpts = program.opts();
  let projectRoot = globalOpts.root || getProjectRoot();

  if (!projectRoot) {
    projectRoot = await discoverProject();
  }

  if (!projectRoot) {
    console.error(chalk.red('✗') + ' ERROR: No .forge2/ directory found\n');
    console.error('Run this command from within a forge project directory,');
    console.error('or set ' + chalk.cyan('FORGE_PROJECT') + ' environment variable,');
    console.error('or use ' + chalk.cyan('--root') + ' flag: ' + chalk.gray('forge2 --root=/path/to/project'));
    process.exit(1);
  }

  // Load project config and auto-discover commands
  const forge = new Forge(projectRoot, globalOpts);
  await forge.loadConfig();

  // Register command groups as subcommands
  for (const [groupName, group] of Object.entries(forge.commandGroups)) {
    // Create group subcommand
    const groupCmd = new Command(groupName);
    groupCmd.exitOverride();  // Inherit exitOverride

    // Set description if provided
    if (group.description) {
      groupCmd.description(group.description);
    }

    // Add each command to the group
    for (const [cmdName, forgeCmd] of Object.entries(group.commands)) {
      const cmd = buildCommanderCommand(cmdName, forgeCmd);
      cmd.exitOverride();  // Make subcommands throw
      groupCmd.addCommand(cmd);
    }

    program.addCommand(groupCmd);
  }

  // Parse args - will throw on errors
  try {
    await program.parseAsync();
  } catch (err: any) {
    // Commander error - exit immediately
    if (err.code) {
      process.exit(err.exitCode || 1);
    }
    throw err;  // Re-throw non-Commander errors
  }
}
