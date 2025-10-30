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
import { setGlobalLogLevel } from './logger';
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
    .option('-d, --debug', 'Debug output (sets log level to debug)')
    .option('-q, --quiet', 'Quiet mode (sets log level to warn)')
    .option('-s, --silent', 'Silent mode (disables all logging)')
    .option('--log-level <level>', 'Set log level: silent, trace, debug, info, warn, error, fatal')
    .allowUnknownOption(true)  // Allow subcommand names to pass through
    .exitOverride();

  // Parse parent-level options early (before loading modules)
  // This is necessary because modules create loggers at import time
  // We use parseOptions() which parses options but doesn't execute commands
  const { operands, unknown } = program.parseOptions(process.argv.slice(2));
  const earlyOpts = program.opts();

  // Determine log level from parsed options
  let logLevel: string | undefined;
  if (earlyOpts.silent) {
    logLevel = 'silent';
  } else if (earlyOpts.quiet) {
    logLevel = 'warn';
  } else if (earlyOpts.debug) {
    logLevel = 'debug';
  } else if (earlyOpts.logLevel) {
    logLevel = earlyOpts.logLevel;
  }

  // Set log level before loading modules
  if (logLevel) {
    setGlobalLogLevel(logLevel);
  }

  // Find project root
  const globalOpts = earlyOpts;
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
    groupCmd.copyInheritedSettings(program);  // Copy inherited settings from parent

    // Set description if provided
    if (group.description) {
      groupCmd.description(group.description);
    }

    // Add each command to the group
    for (const [cmdName, forgeCmd] of Object.entries(group.commands)) {
      const cmd = buildCommanderCommand(cmdName, forgeCmd, groupName, forge);
      cmd.copyInheritedSettings(groupCmd);  // Copy from group command
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
