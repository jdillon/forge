/**
 * Forge v2 - CLI Implementation
 *
 * Implements the CLI option handling specification in docs/planning/cli-option-handling.md
 *
 * Two-pass approach:
 * 1. Bootstrap: Parse ONLY to extract top-level config (permissive)
 * 2. Real CLI: Parse with full validation (strict, Commander handles it)
 */

import { Command } from "commander";
import { styleText } from "node:util";
import { isColorSupported } from "colorette";
import { exit, FatalError, ExitNotification } from "./helpers";
import { exit as runtimeExit } from "./runtime";
import { initLogging, getGlobalLogger, isLoggingInitialized } from "./logging";
import { resolveConfig } from "./config-resolver";
import type { ResolvedConfig } from "./config-resolver";
import type { FilePath, ColorMode } from "./types";
import pkg from "../package.json";

// ============================================================================
// Shared Configuration
// ============================================================================

/**
 * Resolve color mode to a boolean for use with libraries
 * Uses colorette for auto-detection when mode is 'auto'
 */
function resolveColorMode(mode: ColorMode): boolean {
  if (mode === "always") return true;
  if (mode === "never") return false;

  // Auto-detect using colorette (same library pino-pretty uses)
  // This handles TTY detection, terminal capabilities, CI/CD environments, etc.
  return isColorSupported;
}

/**
 * Normalize user-provided color value to internal ColorMode
 * Accepts aliases: on, off, true, false, disable, etc.
 */
function normalizeColorMode(value: string | undefined): ColorMode {
  if (!value) return "auto";

  const normalized = value.toLowerCase();
  switch (normalized) {
    case "on":
    case "true":
    case "always":
      return "always";
    case "off":
    case "false":
    case "never":
    case "disable":
      return "never";
    case "auto":
    default:
      return "auto";
  }
}

/**
 * Add top-level options to a Commander program
 * Used by both bootstrap and real program to ensure consistency
 */
function addTopLevelOptions(program: Command): Command {
  return program
    .option("-r, --root <path>", "Project root directory")
    .option("-d, --debug", "Debug output")
    .option("-q, --quiet", "Quiet mode")
    .option("-s, --silent", "Silent mode")
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
          "Set log format",
        )
        .choices(["json", "pretty"])
        .default("pretty"),
    )
    .option(
      "--color <mode>",
      "Color output: auto (default), always, never, on, off, true, false",
    );
}

// ============================================================================
// Bootstrap Phase
// ============================================================================

interface BootstrapConfig {
  debug: boolean;
  quiet: boolean;
  silent: boolean;
  logLevel: string;
  logFormat: "json" | "pretty" | undefined;
  colorMode: ColorMode;
  root: FilePath | undefined;
  userDir: FilePath;
  isRestarted: boolean;
}

/**
 * Bootstrap: Extract top-level config only
 * Permissive parsing - don't care about validation
 */
function bootstrap(cliArgs: string[]): BootstrapConfig {
  const bootProgram = new Command();

  bootProgram.name("forge");
  // Note: Don't call .version() - we'll let real CLI handle --version

  addTopLevelOptions(bootProgram)
    .allowUnknownOption(true) // Don't care about unknown options
    .allowExcessArguments(true) // Don't care about extra args
    .exitOverride(); // Don't exit, throw instead

  // Parse just to extract options - ignore everything else
  bootProgram.parseOptions(cliArgs);
  const opts = bootProgram.opts();

  // Check if this is a restarted process (via env var from wrapper)
  const isRestarted = process.env.FORGE_RESTARTED === "1";

  // Determine color mode with priority: NO_COLOR env > --color option > 'auto'
  // Normalize user input (accepts: auto, always, never, on, off, true, false, disable)
  let colorMode: ColorMode = normalizeColorMode(opts.color);
  if (process.env.NO_COLOR) {
    // NO_COLOR env var is set - force never
    colorMode = "never";
  }

  // Return extracted config - that's it!
  return {
    debug: opts.debug || false,
    quiet: opts.quiet || false,
    silent: opts.silent || false,
    logLevel: opts.logLevel,
    logFormat: opts.logFormat as "json" | "pretty" | undefined,
    colorMode,
    root: opts.root,
    userDir: process.env.FORGE_USER_DIR || process.cwd(),
    isRestarted,
  };
}


// ============================================================================
// Real CLI Phase
// ============================================================================

/**
 * Build full CLI with subcommands
 * Strict parsing - Commander validates everything naturally
 */
async function buildRealCLI(config: ResolvedConfig): Promise<Command> {
  const program = new Command();

  program
    .name("forge")
    .description("Modern CLI framework for deployments")
    .version(pkg.version);

  // Add top-level options (same as bootstrap)
  addTopLevelOptions(program);

  // Determine if color should be enabled using colorette detection
  const useColor = resolveColorMode(config.colorMode);

  // Configure help formatting
  const helpConfig: any = {
    sortSubcommands: true,
    sortOptions: true,
  };

  // Only add style functions if colors are enabled
  if (useColor) {
    helpConfig.styleTitle = (str: string) => styleText("bold", str);
    helpConfig.styleCommandText = (str: string) => styleText("cyan", str);
    helpConfig.styleCommandDescription = (str: string) => styleText("gray", str);
    helpConfig.styleDescriptionText = (str: string) => styleText("italic", str);
    helpConfig.styleOptionText = (str: string) => styleText("green", str);
    helpConfig.styleArgumentText = (str: string) => styleText("yellow", str);
    helpConfig.styleSubcommandText = (str: string) => styleText("blue", str);
  }

  program.configureHelp(helpConfig);
  program.exitOverride(); // Don't exit, throw instead

  // Action for main program - fires ONLY when no subcommand is provided
  program.action(() => {
    console.error("ERROR: subcommand required");
    console.error(); // Blank line
    program.outputHelp();
    exit(1);
  });

  // Load core module dynamically (after logging initialized)
  const { Forge } = await import("./core");

  // Create Forge instance and initialize
  // Forge handles: builtin loading, module loading, dependency installation
  // Throws ExitNotification if restart needed
  const forge = new Forge(config);
  await forge.initialize();

  // Register commands with Commander
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
  const cleanMessage = message.replace(/^error:\s*/i, "");
  console.error(`ERROR: ${cleanMessage}`);
  console.error(`Try 'forge --help' for more information.`);
  exit(1);
}

// ============================================================================
// Main Entry Point
// ============================================================================

export async function main(): Promise<void> {
  try {
    await run();
  } catch (err: any) {
    // Commander help/version - clean exit
    if (
      err.code &&
      (err.code === "commander.helpDisplayed" ||
        err.code === "commander.version")
    ) {
      runtimeExit(err.exitCode ?? 0);
    }

    // Handle errors with logging if available, otherwise stderr
    handleError(err);
  }
}

async function run(): Promise<void> {
  // Extract CLI arguments (slice off runtime executable and script path)
  // Example: ['bun', 'cli.ts', 'website', 'ping'] → ['website', 'ping']
  const cliArgs = process.argv.slice(2);

  // Phase 1: Bootstrap - extract CLI options (permissive)
  const bootstrapConfig = bootstrap(cliArgs);

  // Phase 2: Config Resolution - discover project, load config
  const config = await resolveConfig(bootstrapConfig);

  // Phase 3: Initialize Logging
  const logLevel =
    config.logLevel ||
    (config.debug ? "debug" : config.quiet ? "warn" : "info");
  initLogging({
    level: logLevel,
    format: config.logFormat,
    colorMode: config.colorMode,
  });

  // Now safe to use logger
  const log = getGlobalLogger();

  // Log environment details for debugging
  log.debug(`cwd: ${process.cwd()}`);
  log.debug(`projectPresent: ${config.projectPresent}`);
  log.debug(`projectRoot: ${config.projectRoot || "(none)"}`);
  log.debug(`FORGE_USER_DIR: ${process.env.FORGE_USER_DIR}`);

  // Phase 4: Build and execute CLI
  // Forge handles initialization, dependencies, restart signaling
  try {
    const program = await buildRealCLI(config);

    log.debug(
      { commandNames: program.commands.map((c) => c.name()), cliArgs },
      "About to parse CLI args",
    );

    await program.parseAsync(cliArgs, { from: "user" });
  } catch (err: any) {
    // Handle Commander errors
    if (err.code === "commander.help" ||
        err.code === "commander.helpDisplayed" ||
        err.code === "commander.version") {
      exit(0);
    }
    if (err.code === "commander.missingArgument") {
      showError(err.message);
    }
    if (err.code === "commander.unknownOption") {
      showError(err.message);
    }
    if (err.code === "commander.excessArguments") {
      // Unknown command - extract from error
      const program = err.parent || { args: [] };
      const excessArgs = program.args || [];
      const unknownCmd = excessArgs.find(
        (arg: string) =>
          !arg.startsWith("-") &&
          arg !== process.argv[0] &&
          arg !== process.argv[1],
      );
      if (unknownCmd) {
        showError(`unknown command '${unknownCmd}'`);
      } else {
        showError("unknown command. Run 'forge --help' to see available commands");
      }
    }

    // Other errors - rethrow
    throw err;
  }
}

/**
 * Handle errors at top level
 * Uses logger if initialized, otherwise stderr
 */
function handleError(err: any): never {
  // Clean exit - no error message needed
  if (err instanceof ExitNotification) {
    runtimeExit(err.exitCode);
  }

  // Fatal error or unexpected exception
  const isFatal = err instanceof FatalError;
  const message = err.message || String(err);
  const exitCode = isFatal ? err.exitCode : 1;

  // Try to use logger if initialized, otherwise fall back to stderr
  if (isLoggingInitialized()) {
    const log = getGlobalLogger();
    log.error({ error: err }, message);
  } else {
    // Logging not initialized - use primordial error handling
    console.error("ERROR:", message);
    if (err.stack) {
      console.error("\nStack trace:");
      console.error(err.stack);
    }
  }

  runtimeExit(exitCode);
}

// ============================================================================
// MAIN
// ============================================================================

if (import.meta.main) {
  try {
    await main();
  } catch (err: any) {
    // Unhandled error during module loading or main execution
    // This catches errors that happen before main()'s try/catch
    console.error("FATAL:", err.message);
    if (err.stack) {
      console.error("\nStack trace:");
      console.error(err.stack);
    }
    runtimeExit(1);
  }
}
