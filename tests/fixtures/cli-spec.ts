#!/usr/bin/env bun
/*
 * Copyright 2025 Jason Dillon
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
/**
 * CLI Specification Reference Implementation (Clean Version)
 *
 * This implementation demonstrates the CLI option handling specification
 * defined in docs/planning/cli-option-handling.md
 *
 * Two-pass approach:
 * 1. Bootstrap: Parse ONLY to extract top-level config (permissive)
 * 2. Real CLI: Parse with full validation (strict, Commander handles it)
 */

import { Command } from 'commander';

// ============================================================================
// Configuration
// ============================================================================

const VERSION = '1.0.0';
const PROGRAM_NAME = 'example';
const PROGRAM_DESCRIPTION = 'Example CLI demonstrating spec compliance';

// Simulated config defaults (would come from config file in real implementation)
const CONFIG = {
  greet: {
    defaultName: 'World'
  }
};

// ============================================================================
// Shared Configuration
// ============================================================================

/**
 * Add top-level options to a Commander program
 * Used by both bootstrap and real program to ensure consistency
 */
function addTopLevelOptions(program: Command): Command {
  return program
    .option('-d, --debug', 'Debug output')
    .option('--log-level <level>', 'Set log level', 'info');
}

// ============================================================================
// Bootstrap Phase
// ============================================================================

interface BootstrapConfig {
  debug: boolean;
  logLevel: string;
}

/**
 * Bootstrap: Extract top-level config only
 * Permissive parsing - don't care about validation
 */
function bootstrap(cliArgs: string[]): BootstrapConfig {
  const bootProgram = new Command();

  bootProgram
    .name(PROGRAM_NAME);
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
  };
}

// ============================================================================
// Real CLI Phase
// ============================================================================

/**
 * Build full CLI with subcommands
 * Strict parsing - Commander validates everything naturally
 */
function buildRealCLI(config: BootstrapConfig): Command {
  const program = new Command();

  program
    .name(PROGRAM_NAME)
    .description(PROGRAM_DESCRIPTION)
    .version(VERSION);

  // Add top-level options (same as bootstrap)
  addTopLevelOptions(program);

  // Suppress Commander's error output - we'll show our own terse errors
  program.configureOutput({
    writeErr: () => {}, // Suppress
  });

  // NO .allowUnknownOption() - let Commander validate naturally
  // NO .allowExcessArguments() - let Commander validate naturally
  program.exitOverride(); // Don't exit, throw instead

  // Action for main program - fires ONLY when no subcommand is provided
  program.action(() => {
    console.error(`ERROR: subcommand required`);
    console.error();  // Blank line
    program.outputHelp();
    process.exit(1);  // Exit with error code (user didn't provide command)
  });

  // ========================================
  // Subcommand: greet
  // ========================================
  program
    .command('greet [name]')
    .description('Greet someone')
    .option('-l, --loud', 'Use uppercase')
    .action((name, options) => {
      if (config.debug) {
        console.log('[DEBUG] greet command');
        console.log(`  name: ${JSON.stringify(name)}`);
        console.log(`  options: ${JSON.stringify(options)}`);
        console.log(`  config: ${JSON.stringify(config)}`);
        console.log(`  debug: ${config.debug}`);
        console.log(`  logLevel: ${JSON.stringify(config.logLevel)}`);
      }

      const finalName = name || CONFIG.greet.defaultName;
      const greeting = `Hello, ${finalName}!`;
      console.log(options.loud ? greeting.toUpperCase() : greeting);
    });

  // ========================================
  // Subcommand: ping
  // ========================================
  program
    .command('ping')
    .description('Ping the server')
    .action(() => {
      if (config.debug) {
        console.log('[DEBUG] ping command');
        console.log(`  debug: ${config.debug}`);
      }
      console.log('pong');
    });

  // ========================================
  // Subcommand: deploy (demonstrates required arg)
  // ========================================
  program
    .command('deploy <environment>')
    .description('Deploy to an environment')
    .option('--force', 'Force deployment')
    .action((environment, options) => {
      if (config.debug) {
        console.log('[DEBUG] deploy command');
        console.log(`  environment: ${JSON.stringify(environment)}`);
        console.log(`  options: ${JSON.stringify(options)}`);
        console.log(`  debug: ${config.debug}`);
      }
      console.log(`Deploying to ${environment}${options.force ? ' (forced)' : ''}...`);
      console.log('Deployment complete!');
    });

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
  console.error(`Try '${PROGRAM_NAME} --help' for more information.`);
  process.exit(1);
}

// ============================================================================
// Main
// ============================================================================

async function main() {
  try {
    // Extract CLI arguments (slice off runtime executable and script path)
    // Example: ['bun', 'cli-spec.ts', 'greet', 'Alice'] → ['greet', 'Alice']
    const cliArgs = process.argv.slice(2);

    // Phase 1: Bootstrap - extract config (permissive)
    const config = bootstrap(cliArgs);

    // Phase 2: Build and run real CLI (strict)
    const program = buildRealCLI(config);

    try {
      await program.parseAsync(cliArgs, { from: 'user' });
    } catch (err: any) {
      // Handle Commander errors
      if (err.code === 'commander.helpDisplayed') {
        process.exit(0);  // Help was shown successfully (explicit --help)
      }
      if (err.code === 'commander.version') {
        process.exit(0);  // Version was shown successfully
      }
      if (err.code === 'commander.missingArgument') {
        showError(err.message);
      }
      if (err.code === 'commander.unknownOption') {
        showError(err.message);
      }

      // Other Commander errors - rethrow
      throw err;
    }

  } catch (err: any) {
    // Internal errors (our fault)
    console.error('ERROR: Internal error occurred');
    if (config.debug) {
      console.error(err.stack || err.message);
    } else {
      console.error(err.message);
      console.error(`Run with --debug for more information.`);
    }
    process.exit(2);
  }
}

// Declare config for catch block
let config: BootstrapConfig = { debug: false, logLevel: 'info' };

main();
