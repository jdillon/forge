/**
 * Forge v2 - CLI Implementation
 *
 * Main CLI setup and command registration
 */

import { Command } from "commander";
import { styleText } from "node:util";
import chalk from "chalk";
import updateNotifier from "update-notifier";
import { join, dirname } from "path";
import { existsSync } from "fs";
import { Forge } from "./core";
import { die, exit } from "./helpers";
import { configureLogger } from "./logger";
import pkg from "../package.json" assert { type: "json" };

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
  while (dir !== "/" && dir !== ".") {
    const forgeDir = join(dir, ".forge2");

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
    if (existsSync(join(envPath, ".forge2"))) {
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
 * Used by both boot program (for config extraction) and real program (for execution)
 */
function addTopLevelOptions(program: Command): Command {
  return program
    .option("-r, --root <path>", "Project root directory")
    .option("-d, --debug", "Debug output (sets log level to debug)")
    .option("-q, --quiet", "Quiet mode (sets log level to warn)")
    .option("-s, --silent", "Silent mode (disables all logging)")
    .addOption(
      program
        .createOption("--log-level <level>", "Set log level")
        .choices([
          "silent",
          "trace",
          "debug",
          "info",
          "warn",
          "error",
          "fatal",
        ]),
    )
    .addOption(
      program
        .createOption(
          "--log-format <format>",
          "Set log format (default: pretty)",
        )
        .choices(["json", "pretty"]),
    )
    .option("--no-color", "Disable colored output (respects NO_COLOR env var)");
}

// ============================================================================
// Main Entry Point
// ============================================================================

export async function main(): Promise<void> {
  // Check for updates (once per day)
  updateNotifier({
    pkg,
    updateCheckInterval: 1000 * 60 * 60 * 24,
  }).notify();

  try {
    await run();
  } catch (err: any) {
    // Don't print error for Commander's help/version (they already printed their output)
    if (
      err.code &&
      (err.code === "commander.helpDisplayed" ||
        err.code === "commander.version")
    ) {
      exit(err.exitCode ?? 0);
    }
    die(err.message);
  }
}

async function run(): Promise<void> {
  // ============================================================================
  // STEP 1: Boot program - Extract logger configuration
  // ============================================================================
  // We need to parse top-level options early (before loading modules) because
  // modules create loggers at import time and need the config values.
  // Use a separate Commander instance just for extracting these options.

  const bootProgram = new Command();
  addTopLevelOptions(bootProgram)
    .allowUnknownOption(true) // Ignore everything else (subcommands, their options, etc.)
    .exitOverride();

  const { operands, unknown } = bootProgram.parseOptions(process.argv.slice(2));
  const earlyOpts = bootProgram.opts();

  // // Check for help/version flags - these should work without a project
  // const isHelpOrVersion = process.argv.includes('--help') ||
  //                         process.argv.includes('-h') ||
  //                         process.argv.includes('--version') ||
  //                         process.argv.includes('-V') ||
  //                         operands.includes('help');

  // Validate top-level options (only if not showing help/version)
  // Unknown options that appear before the first subcommand name are invalid
  // if (!isHelpOrVersion) {
  //   const firstSubcommandIndex = operands.findIndex(arg => !arg.startsWith('-'));
  //   const optionsBeforeSubcommand = unknown.slice(0,
  //     firstSubcommandIndex >= 0 ? firstSubcommandIndex : unknown.length
  //   );

  //   const invalidOptions = optionsBeforeSubcommand.filter(arg =>
  //     arg.startsWith('-') &&
  //     arg !== '-h' &&
  //     arg !== '--help' &&
  //     arg !== '-V' &&
  //     arg !== '--version'
  //   );

  //   if (invalidOptions.length > 0) {
  //     // Show error and help, then exit
  //     console.error(chalk.red(`ERROR: unknown option '${invalidOptions[0]}'`));
  //     console.error(); // blank line

  //     // Create a minimal program just to show help
  //     const helpProgram = new Command();
  //     helpProgram
  //       .name('forge2')
  //       .description('Modern CLI framework for deployments')
  //       .version(pkg.version);
  //     addTopLevelOptions(helpProgram);
  //     helpProgram.outputHelp();
  //     exit(1);
  //   }
  // }

  // Determine if color should be enabled
  // Respect NO_COLOR env var (https://no-color.org/) or --no-color flag
  const useColor = !process.env.NO_COLOR && earlyOpts.color !== false;

  // Determine log level from parsed options
  let logLevel: string | undefined;
  if (earlyOpts.silent) {
    logLevel = "silent";
  } else if (earlyOpts.quiet) {
    logLevel = "warn";
  } else if (earlyOpts.debug) {
    logLevel = "debug";
  } else if (earlyOpts.logLevel) {
    logLevel = earlyOpts.logLevel;
  }

  // Determine log format ('json' or 'pretty', default is pretty)
  const logFormat = earlyOpts.logFormat as "json" | "pretty" | undefined;

  // Configure logger before loading modules (modules create loggers at import time)
  configureLogger({
    level: logLevel,
    format: logFormat,
    color: useColor,
  });

  // ============================================================================
  // STEP 2: Real program - Full CLI with subcommands
  // ============================================================================

  const program = new Command();

  // Set up full program configuration
  program
    .name("forge2")
    .description("Modern CLI framework for deployments")
    .version(pkg.version);

  // Add top-level options (same as boot program)
  addTopLevelOptions(program);

  // Configure output and help with color settings
  program.configureOutput({
    writeErr: (str) => process.stderr.write(useColor ? chalk.red(str) : str),
    outputError: (str, write) => write(useColor ? chalk.red(str) : str),
  });

  const helpConfig: any = {
    sortSubcommands: true,
    sortOptions: true,
  };

  // Only add style functions if colors are enabled
  if (useColor) {
    helpConfig.styleTitle = (str: string) => styleText("bold", str);
    helpConfig.styleCommandText = (str: string) => styleText("cyan", str);
    helpConfig.styleCommandDescription = (str: string) =>
      styleText("gray", str);
    helpConfig.styleDescriptionText = (str: string) => styleText("italic", str);
    helpConfig.styleOptionText = (str: string) => styleText("green", str);
    helpConfig.styleArgumentText = (str: string) => styleText("yellow", str);
    helpConfig.styleSubcommandText = (str: string) => styleText("blue", str);
  }

  program.configureHelp(helpConfig);

  program
    .allowUnknownOption(true) // Allow subcommand options to pass through
    .exitOverride();

  // Find project root (only required if not asking for help/version)
  // isHelpOrVersion was determined in boot phase above
  const globalOpts = earlyOpts;
  let projectRoot = globalOpts.root || getProjectRoot();

  if (!projectRoot) {
    projectRoot = await discoverProject();
  }

  // if (!projectRoot && !isHelpOrVersion) {
  //   die(
  //     "No .forge2/ directory found\n" +
  //       "Run this command from within a forge project directory,\n" +
  //       "or set FORGE_PROJECT environment variable,\n" +
  //       "or use --root flag: forge2 --root=/path/to/project",
  //   );
  // }

  // Create Forge instance and let it register commands with Commander
  const forge = new Forge(projectRoot, globalOpts);
  await forge.registerCommands(program);

  // Parse args - will throw on errors
  try {
    await program.parseAsync();
  } catch (err: any) {
    // Commander error - exit immediately
    if (err.code) {
      // Use ?? instead of || to handle exitCode=0 correctly
      exit(err.exitCode ?? 1);
    }
    throw err; // Re-throw non-Commander errors
  }
}
