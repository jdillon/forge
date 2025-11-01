/**
 * Forge v2 - CLI Implementation
 *
 * Implements the CLI option handling specification in docs/planning/cli-option-handling.md
 *
 * Two-pass approach:
 * 1. Bootstrap: Parse ONLY to extract top-level config (permissive)
 * 2. Real CLI: Parse with full validation (strict, Commander handles it)
 */

import { Command } from 'commander';
import { styleText } from 'node:util';
import chalk from 'chalk';
import updateNotifier from 'update-notifier';
import { join, dirname } from 'path';
import { existsSync } from 'fs';
import { Forge } from './core';
import { die, exit } from './helpers';
import { configureLogger } from './logger';
import pkg from '../package.json' assert { type: 'json' };

// ============================================================================
// Project Discovery
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
// Shared Configuration
// ============================================================================

/**
 * Add top-level options to a Commander program
 * Used by both bootstrap and real program to ensure consistency
 */
function addTopLevelOptions(program: Command): Command {
  return program
    .option('-r, --root <path>', 'Project root directory')
    .option('-d, --debug', 'Debug output (sets log level to debug)')
    .option('-q, --quiet', 'Quiet mode (sets log level to warn)')
    .option('-s, --silent', 'Silent mode (disables all logging)')
    .addOption(
      program.createOption('--log-level <level>', 'Set log level')
        .choices(['silent', 'trace', 'debug', 'info', 'warn', 'error', 'fatal'])
    )
    .addOption(
      program.createOption('--log-format <format>', 'Set log format (default: pretty)')
        .choices(['json', 'pretty'])
    )
    .option('--no-color', 'Disable colored output (respects NO_COLOR env var)');
}

// ============================================================================
// Bootstrap Phase
// ============================================================================

interface BootstrapConfig {
  debug: boolean;
  logLevel: string;
  logFormat: 'json' | 'pretty' | undefined;
  color: boolean;
  root: string | undefined;
}

/**
 * Bootstrap: Extract top-level config only
 * Permissive parsing - don't care about validation
 */
function bootstrap(cliArgs: string[]): BootstrapConfig {
  const bootProgram = new Command();

  bootProgram.name('forge');
  // Note: Don't call .version() - we'll let real CLI handle --version

  addTopLevelOptions(bootProgram)
    .allowUnknownOption(true)     // Don't care about unknown options
    .allowExcessArguments(true)   // Don't care about extra args
    .exitOverride();              // Don't exit, throw instead

  // Parse just to extract options - ignore everything else
  bootProgram.parseOptions(cliArgs);
  const opts = bootProgram.opts();

  // Return extracted config - that's it!
  return {
    debug: opts.debug || false,
    logLevel: opts.logLevel,
    logFormat: opts.logFormat as 'json' | 'pretty' | undefined,
    color: opts.color !== false,
    root: opts.root,
  };
}

// ============================================================================
// Real CLI Phase
// ============================================================================

/**
 * Build full CLI with subcommands
 * Strict parsing - Commander validates everything naturally
 */
async function buildRealCLI(config: BootstrapConfig): Promise<Command> {
  const program = new Command();

  program
    .name('forge')
    .description('Modern CLI framework for deployments')
    .version(pkg.version);

  // Add top-level options (same as bootstrap)
  addTopLevelOptions(program);

  // Determine if color should be enabled
  const useColor = !process.env.NO_COLOR && config.color;

  // Suppress Commander's error output - we'll show our own terse errors
  program.configureOutput({
    writeErr: () => {}, // Suppress
  });

  const helpConfig: any = {
    sortSubcommands: true,
    sortOptions: true,
  };

  // Only add style functions if colors are enabled
  if (useColor) {
    helpConfig.styleTitle = (str: string) => styleText('bold', str);
    helpConfig.styleCommandText = (str: string) => styleText('cyan', str);
    helpConfig.styleCommandDescription = (str: string) => styleText('gray', str);
    helpConfig.styleDescriptionText = (str: string) => styleText('italic', str);
    helpConfig.styleOptionText = (str: string) => styleText('green', str);
    helpConfig.styleArgumentText = (str: string) => styleText('yellow', str);
    helpConfig.styleSubcommandText = (str: string) => styleText('blue', str);
  }

  program.configureHelp(helpConfig);

  // NO .allowUnknownOption() - let Commander validate naturally
  // NO .allowExcessArguments() - let Commander validate naturally
  program.exitOverride(); // Don't exit, throw instead

  // Action for main program - fires ONLY when no subcommand is provided
  program.action(() => {
    console.error('ERROR: subcommand required');
    console.error();  // Blank line
    program.outputHelp();
    exit(1);  // Exit with error code (user didn't provide command)
  });

  // Find project root
  let projectRoot = config.root || getProjectRoot();

  if (!projectRoot) {
    projectRoot = await discoverProject();
  }

  // Create Forge instance and let it register commands with Commander
  const forge = new Forge(projectRoot, config);
  await forge.registerCommands(program);

  return program;
}

// ============================================================================
// Error Handling
// ============================================================================

/**
 * Show terse error message with hint
 */
function showError(message: string): never {
  // Strip "error: " prefix from Commander messages
  const cleanMessage = message.replace(/^error:\s*/i, '');
  console.error(`ERROR: ${cleanMessage}`);
  console.error(`Try 'forge --help' for more information.`);
  exit(1);
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
    // Don't print error for Commander's help/version (they already printed their output)
    if (err.code && (err.code === 'commander.helpDisplayed' || err.code === 'commander.version')) {
      exit(err.exitCode ?? 0);
    }
    die(err.message);
  }
}

async function run(): Promise<void> {
  // Extract CLI arguments (slice off runtime executable and script path)
  // Example: ['bun', 'cli.ts', 'website', 'ping'] → ['website', 'ping']
  const cliArgs = process.argv.slice(2);

  // Phase 1: Bootstrap - extract config (permissive)
  const config = bootstrap(cliArgs);

  // Configure logger before loading modules (modules create loggers at import time)
  configureLogger({
    level: config.logLevel || (config.debug ? 'debug' : config.quiet ? 'warn' : undefined),
    format: config.logFormat,
    color: config.color,
  });

  // Phase 2: Build and run real CLI (strict)
  const program = await buildRealCLI(config);

  try {
    await program.parseAsync(cliArgs, { from: 'user' });
  } catch (err: any) {
    // Handle Commander errors
    if (err.code === 'commander.helpDisplayed') {
      exit(0);  // Help was shown successfully (explicit --help)
    }
    if (err.code === 'commander.version') {
      exit(0);  // Version was shown successfully
    }
    if (err.code === 'commander.missingArgument') {
      showError(err.message);
    }
    if (err.code === 'commander.unknownOption') {
      showError(err.message);
    }
    if (err.code === 'commander.excessArguments') {
      // Unknown command - extract from program.args (which has unparsed args)
      // program.args still contains the excess arguments that caused the error
      const excessArgs = program.args || [];
      // Find first arg that doesn't start with '-' and isn't a known option value
      const unknownCmd = excessArgs.find(arg =>
        !arg.startsWith('-') &&
        arg !== process.argv[0] &&
        arg !== process.argv[1]
      );
      if (unknownCmd) {
        showError(`unknown command '${unknownCmd}'`);
      } else {
        showError('unknown command. Run \'forge --help\' to see available commands');
      }
    }

    // Other Commander errors - rethrow
    throw err;
  }
}
