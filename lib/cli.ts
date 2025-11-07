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
import { resolve } from "node:path";
import { isColorSupported } from "colorette";
import { exit, FatalError, ExitNotification } from "./helpers";
import { exit as runtimeExit } from "./runtime";
import { initLogging, getGlobalLogger, isLoggingInitialized } from "./logging";
import { getForgePaths } from "./xdg";
import { findProjectRoot } from "./project-discovery";
import type { FilePath, ProjectConfig, ColorMode } from "./types";
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

/**
 * Create ProjectConfig with fully resolved paths
 * All paths are resolved to absolute paths (no ./ or ../ segments)
 */
function createProjectConfig(
  projectRoot: FilePath,
  userDir: FilePath,
): ProjectConfig {
  return {
    projectRoot: resolve(projectRoot),
    forgeDir: resolve(projectRoot, ".forge2"),
    userDir: resolve(userDir),
  };
}

// ============================================================================
// Real CLI Phase
// ============================================================================

/**
 * Build full CLI with subcommands
 * Strict parsing - Commander validates everything naturally
 */
async function buildRealCLI(
  bootstrapConfig: BootstrapConfig,
  projectConfig: ProjectConfig | null,
): Promise<Command> {
  const program = new Command();

  program
    .name("forge")
    .description("Modern CLI framework for deployments")
    .version(pkg.version);

  // Add top-level options (same as bootstrap)
  addTopLevelOptions(program);

  // Determine if color should be enabled using colorette detection
  const useColor = resolveColorMode(bootstrapConfig.colorMode);

  // Previously suppressed Commander's error output to show our own terse errors
  // But this also suppressed help output when command groups are invoked without subcommands
  // Commented out for now - may need selective suppression in the future
  // program.configureOutput({
  //   writeErr: () => {}, // Suppress
  // });

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

  // NO .allowUnknownOption() - let Commander validate naturally
  // NO .allowExcessArguments() - let Commander validate naturally
  program.exitOverride(); // Don't exit, throw instead

  // Action for main program - fires ONLY when no subcommand is provided
  program.action(() => {
    console.error("ERROR: subcommand required");
    console.error(); // Blank line
    program.outputHelp();
    exit(1); // Exit with error code (user didn't provide command)
  });

  // Load core module dynamically (after logging initialized)
  const { Forge } = await import("./core");

  // Create Forge instance, load config, and register commands with Commander
  const forge = new Forge(projectConfig, bootstrapConfig);

  await forge.loadConfig();
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

  // Phase 1: Bootstrap - extract config (permissive)
  const config = bootstrap(cliArgs);

  // FIXME: sort out where we change dirs
  // if (config.userDir !== process.cwd()) {
  //   process.chdir(config.userDir);
  // }

  // Initialize logger before loading modules (modules create loggers at import time)
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
  log.debug(`FORGE_USER_DIR: ${process.env.FORGE_USER_DIR}`);
  log.debug(`FORGE_NODE_MODULES: ${process.env.FORGE_NODE_MODULES}`);
  log.debug(`NODE_PATH: ${process.env.NODE_PATH}`);

  // Phase 1.5: Project discovery
  const projectRoot = await findProjectRoot({
    rootPath: config.root,
    startDir: config.userDir,
  });
  log.debug(`Project root: ${projectRoot}`);

  // Create ProjectConfig with fully resolved paths
  let projectConfig: ProjectConfig | null = null;
  if (projectRoot) {
    projectConfig = createProjectConfig(projectRoot, config.userDir);
    log.debug(`Project config created: ${projectConfig.projectRoot}`);

    // Create symlink for .forge2 directory in node_modules
    // This allows user commands to import forge with correct module instance
    const { symlinkForgeDir } = await import("./module-symlink");
    await symlinkForgeDir(projectConfig.forgeDir);

    // Load minimal config to check dependencies
    const { loadLayeredConfig } = await import("./config-loader");
    const { config: userConfigDir } = getForgePaths();
    const forgeConfig = await loadLayeredConfig(
      projectConfig.projectRoot,
      userConfigDir,
    );

    log.debug({ dependencies: forgeConfig.dependencies }, "Config loaded");

    // Auto-install dependencies if needed
    const { autoInstallDependencies, RESTART_EXIT_CODE } = await import(
      "./auto-install"
    );
    const needsRestart = await autoInstallDependencies(
      forgeConfig,
      projectConfig.forgeDir,
      config.isRestarted,
    );

    log.debug({ needsRestart }, "Dependency sync complete");

    if (needsRestart) {
      // Exit with magic code - wrapper will restart us
      exit(RESTART_EXIT_CODE);
    }
  }

  // Phase 2: Build and run real CLI (strict)
  const program = await buildRealCLI(config, projectConfig);

  log.debug(
    { commandNames: program.commands.map((c) => c.name()), cliArgs },
    "About to parse CLI args",
  );

  try {
    await program.parseAsync(cliArgs, { from: "user" });
  } catch (err: any) {
    // Handle Commander errors
    log.debug(
      { errorCode: err.code, errorMessage: err.message },
      "Commander error caught",
    );

    // All help/version requests are successful exits (code 0)
    // - commander.helpDisplayed = explicit --help flag
    // - commander.help = implicit help (e.g., command group without subcommand)
    // - commander.version = --version flag
    if (
      err.code === "commander.help" ||
      err.code === "commander.helpDisplayed" ||
      err.code === "commander.version"
    ) {
      exit(0);
    }
    if (err.code === "commander.missingArgument") {
      showError(err.message);
    }
    if (err.code === "commander.unknownOption") {
      showError(err.message);
    }
    if (err.code === "commander.excessArguments") {
      // Unknown command - extract from program.args (which has unparsed args)
      // program.args still contains the excess arguments that caused the error
      const excessArgs = program.args || [];
      // Find first arg that doesn't start with '-' and isn't a known option value
      const unknownCmd = excessArgs.find(
        (arg) =>
          !arg.startsWith("-") &&
          arg !== process.argv[0] &&
          arg !== process.argv[1],
      );
      if (unknownCmd) {
        showError(`unknown command '${unknownCmd}'`);
      } else {
        showError(
          "unknown command. Run 'forge --help' to see available commands",
        );
      }
    }

    // Other Commander errors - rethrow
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
