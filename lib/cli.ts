/**
 * Forge v2 - CLI Implementation
 *
 * Main CLI setup and command registration
 */

import { Command } from 'commander';
import chalk from 'chalk';
import updateNotifier from 'update-notifier';
import { join, dirname } from 'path';
import { existsSync } from 'fs';
import { Forge } from './core';
import { die, exit } from './helpers';
import { configureLogger } from './logger';
import pkg from '../package.json' assert { type: 'json' };

// ============================================================================
// Project Discovery (CLI Bootstrapping)
// ============================================================================

/**
 * Walk up directory tree to find .forge2/ directory
 * Similar to how git finds .git/
 */
async function discoverProject(startDir?: string): Promise<string | null> {
  let dir = startDir || process.cwd();

  // Walk up to root
  while (dir !== '/' && dir !== '.') {
    const forgeDir = join(dir, '.forge2');

    if (existsSync(forgeDir)) {
      return dir;
    }

    const parent = dirname(dir);
    if (parent === dir) break; // Reached root
    dir = parent;
  }

  return null;
}

/**
 * Check for FORGE_PROJECT env var override
 */
function getProjectRoot(): string | null {
  // Env var override
  if (process.env.FORGE_PROJECT) {
    const envPath = process.env.FORGE_PROJECT;
    if (existsSync(join(envPath, '.forge2'))) {
      return envPath;
    }
    die(`FORGE_PROJECT=${envPath} but .forge2/ not found`);
  }

  return null;
}

// ============================================================================
// Main Entry Point
// ============================================================================

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
    .option('--log-format <format>', 'Set log format: color (default), plain, json')
    .allowUnknownOption(true)  // Allow subcommand names to pass through
    .exitOverride()
    .configureOutput({
      // Fancy error output with colors
      writeErr: (str) => process.stderr.write(chalk.red(str)),
      outputError: (str, write) => write(chalk.red(str)),
    });

  // Parse parent-level options early (before loading modules)
  // This is necessary because modules create loggers at import time
  // We use parseOptions() which parses options but doesn't execute commands
  const { operands, unknown } = program.parseOptions(process.argv.slice(2));
  const earlyOpts = program.opts();

  // Check for unknown options before subcommand names
  // unknown array contains unparsed args that could be subcommands or invalid options
  // Invalid options start with - or --
  const invalidOptions = unknown.filter(arg => arg.startsWith('-'));
  if (invalidOptions.length > 0) {
    console.error(chalk.red(`ERROR: unknown option '${invalidOptions[0]}'`));
    console.error(); // blank line
    program.outputHelp();
    exit(1);
  }

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

  // Determine log format
  const logFormat = earlyOpts.logFormat as 'plain' | 'json' | 'color' | undefined;

  // Configure logger before loading modules (modules create loggers at import time)
  configureLogger({
    level: logLevel,
    format: logFormat,
  });

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

  // Create Forge instance and let it register commands with Commander
  const forge = new Forge(projectRoot, globalOpts);
  await forge.registerCommands(program);

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
