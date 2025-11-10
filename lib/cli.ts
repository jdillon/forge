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
import process from "node:process";
import { Command } from "commander";
import { styleText } from "node:util";
import { isColorSupported } from "colorette";
import { exit, FatalError, ExitNotification } from "./helpers";
import { exit as runtimeExit } from "./runtime";
import { initLogging, getGlobalLogger, isLoggingInitialized } from "./logging";
import { resolveConfig } from "./config-resolver";
import type { FilePath, ColorMode, ForgeConfig } from "./types";
import pkg from "../package.json";
import { createBootstrapLogger } from "./logging/bootstrap";

const log = createBootstrapLogger("cli");

// ============================================================================
// Main Entry Point
// ============================================================================

/**
 * Main CLI execution
 * Orchestrates all phases and handles all errors in one place
 */
export async function main(): Promise<void> {
  const cliArgs = process.argv.slice(2);
  log.debug("Args: %o", cliArgs);

  // Handle --version early (before config resolution)
  if (cliArgs.includes('--version') || cliArgs.includes('-V')) {
    const { getVersionString } = await import('./version');
    const version = await getVersionString();
    console.log(`forge version ${version}`);
    process.exit(0);
  }

  try {
    // Phase 1: Bootstrap - extract CLI options (permissive)
    const bootstrapConfig = bootstrap(cliArgs);
    log.debug("Bootstrap config: %o", bootstrapConfig);

    // Phase 2: Config Resolution - discover project, load config
    const config = await resolveConfig(bootstrapConfig);
    log.debug("Resolved config: %o", config);

    // Phase 3: Initialize Logging
    initializeLogging(config);

    // Phase 4: Build and execute CLI
    const program = await buildCLI(config);
    log.debug("Args: %o", cliArgs);
    await program.parseAsync(cliArgs, { from: "user" });
  } catch (err: any) {
    handleError(err);
  }
}

// ============================================================================
// Phase 1: Bootstrap
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
 * Permissive parsing - don't validate, just extract options
 */
function bootstrap(cliArgs: string[]): BootstrapConfig {
  const bootProgram = new Command();

  bootProgram.name("forge");
  addTopLevelOptions(bootProgram)
    .allowUnknownOption(true)
    .allowExcessArguments(true)
    .exitOverride();

  bootProgram.parseOptions(cliArgs);
  const opts = bootProgram.opts();

  // Check if this is a restarted process
  const isRestarted = process.env.FORGE_RESTARTED === "1";

  // Determine color mode: NO_COLOR env > --color option > 'auto'
  let colorMode: ColorMode = normalizeColorMode(opts.color);
  if (process.env.NO_COLOR) {
    colorMode = "never";
  }

  return {
    debug: opts.debug || false,
    quiet: opts.quiet || false,
    silent: opts.silent || false,
    logLevel: opts.logLevel,
    logFormat: opts.logFormat as "json" | "pretty" | undefined,
    colorMode,
    root: opts.root,
    userDir: process.cwd(),
    isRestarted,
  };
}

// ============================================================================
// Phase 2: Config Resolution
// ============================================================================
// Handled by config-resolver.ts: resolveConfig(bootstrapConfig)
// See lib/config-resolver.ts for implementation

// ============================================================================
// Phase 3: Logging Initialization
// ============================================================================

/**
 * Initialize logging system with resolved config
 * Determines log level from config options and sets up logger
 */
function initializeLogging(config: ForgeConfig): void {
  const logLevel =
    config.logLevel ||
    (config.debug ? "debug" : config.quiet ? "warn" : "info");

  log.debug(`Initializing logging: level=${logLevel}, format=${config.logFormat}, colorMode=${config.colorMode}`);

  initLogging({
    level: logLevel,
    format: config.logFormat,
    colorMode: config.colorMode,
  });

  // Log environment details for debugging
  const logger = getGlobalLogger();
  logger.debug(
    {
      nodeVersion: process.version,
      platform: process.platform,
      cwd: process.cwd(),
      isRestarted: config.isRestarted,
    },
    "Environment details",
  );
}

// ============================================================================
// Phase 4: CLI Build & Execute
// ============================================================================

/**
 * Build full CLI with subcommands
 * Strict parsing - Commander validates everything
 */
async function buildCLI(config: ForgeConfig): Promise<Command> {
  const program = new Command();

  program
    .name("forge")
    .description("Modern CLI framework for deployments")
    .version(pkg.version);

  addTopLevelOptions(program);
  configureHelp(program, config.colorMode);
  program.exitOverride();

  // Action for main program - fires when no subcommand provided
  program.action(() => {
    console.error("ERROR: subcommand required");
    console.error();
    program.outputHelp();
    exit(1);
  });

  // Initialize Forge and register commands
  const { Forge } = await import("./core");
  const forge = new Forge(config);
  await forge.initialize(); // Throws ExitNotification if restart needed
  await forge.registerCommands(program);

  return program;
}

// ============================================================================
// Error Handling (Single Location)
// ============================================================================

/**
 * Unified error handler for all error types
 * Handles: Commander errors, ExitNotification, FatalError, general exceptions
 */
function handleError(err: any): never {
  log.debug("Handle error:\n----8<----\n%o---->8-----", err);

  // 1. Commander help/version - clean exit (no error)
  if (
    err.code === "commander.help" ||
    err.code === "commander.helpDisplayed" ||
    err.code === "commander.version"
  ) {
    runtimeExit(err.exitCode ?? 0);
  }

  // 2. Commander validation errors - show terse message
  if (err.code === "commander.missingArgument") {
    showCommanderError(err.message);
  }
  if (err.code === "commander.unknownOption") {
    showCommanderError(err.message);
  }
  if (err.code === "commander.excessArguments") {
    const program = err.parent || { args: [] };
    const excessArgs = program.args || [];
    const unknownCmd = excessArgs.find(
      (arg: string) =>
        !arg.startsWith("-") &&
        arg !== process.argv[0] &&
        arg !== process.argv[1],
    );
    if (unknownCmd) {
      showCommanderError(`unknown command '${unknownCmd}'`);
    } else {
      showCommanderError("unknown command. Run 'forge --help' to see available commands");
    }
  }

  // 3. ExitNotification - clean exit with specific code (e.g., restart)
  if (err instanceof ExitNotification) {
    runtimeExit(err.exitCode);
  }

  // 4. FatalError or general exception - show error with details
  const isFatal = err instanceof FatalError;
  const message = err.message || String(err);
  const exitCode = isFatal ? err.exitCode : 1;

  if (isLoggingInitialized()) {
    const log = getGlobalLogger();
    log.error({ error: err }, message);
  } else {
    // Logging not initialized - use console
    console.error("ERROR:", message);
    if (err.stack) {
      console.error("\nStack trace:");
      console.error(err.stack);
    }
  }

  runtimeExit(exitCode);
}

/**
 * Show terse error for Commander validation errors
 */
function showCommanderError(message: string): never {
  const cleanMessage = message.replace(/^error:\s*/i, "");
  console.error(`ERROR: ${cleanMessage}`);
  console.error(`Try 'forge --help' for more information.`);
  exit(1);
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Add top-level options to Commander program
 * Used by both bootstrap and real program for consistency
 */
function addTopLevelOptions(program: Command): Command {
  return program
    .option("-r, --root <path>", "Project directory (containing .forge/)")
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
        .createOption("--log-format <format>", "Set log format")
        .choices(["json", "pretty"])
        .default("pretty"),
    )
    .option(
      "--color <mode>",
      "Color output: auto (default), always, never, on, off, true, false",
    );
}

/**
 * Configure help formatting with colors
 */
function configureHelp(program: Command, colorMode: ColorMode): void {
  const useColor = resolveColorMode(colorMode);

  const helpConfig: any = {
    sortSubcommands: true,
    sortOptions: true,
  };

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
}

/**
 * Resolve color mode to boolean
 * Uses colorette for auto-detection
 */
function resolveColorMode(mode: ColorMode): boolean {
  if (mode === "always") return true;
  if (mode === "never") return false;
  return isColorSupported; // Auto-detect
}

/**
 * Normalize user-provided color value to ColorMode
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

// ============================================================================
// Script Entry Point
// ============================================================================

if (import.meta.main) {
  await main();
}
