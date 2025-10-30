/**
 * Forge v2 - CLI Implementation
 *
 * Main CLI setup and command registration
 */

import { Command } from 'commander';
import chalk from 'chalk';
import updateNotifier from 'update-notifier';
import { Forge, discoverProject, getProjectRoot, buildCommanderCommand } from './core';
import { die, exit } from './helpers';
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
    die(err.message);
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
    die(
      'No .forge2/ directory found\n' +
      'Run this command from within a forge project directory,\n' +
      'or set FORGE_PROJECT environment variable,\n' +
      'or use --root flag: forge2 --root=/path/to/project'
    );
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
      const cmd = buildCommanderCommand(cmdName, forgeCmd, groupName, forge);
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
      exit(err.exitCode || 1);
    }
    throw err;  // Re-throw non-Commander errors
  }
}
