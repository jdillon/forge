/**
 * Forge v2 - Configuration Resolver
 *
 * Discovers project, loads config, and returns ResolvedConfig.
 * This module runs before logger initialization, so uses private log() for tracing.
 *
 * Future: Full config merge strategy (user → project → forge-home → defaults)
 * Future: Extended ENV var support beyond current FORGE_* vars
 */

import { resolve } from "node:path";
import { cosmiconfig } from "cosmiconfig";
import { findProjectRoot } from "./project-discovery";
import type { FilePath, ColorMode, ForgeConfig } from "./types";

// ============================================================================
// Types
// ============================================================================

/**
 * Resolved configuration containing all data needed to initialize Forge
 * Combines bootstrap options, project discovery, and loaded config
 */
export interface ResolvedConfig {
  // Project information
  projectPresent: boolean;
  projectRoot?: FilePath;
  forgeDir?: FilePath;
  userDir: FilePath;

  // Bootstrap options (from CLI args)
  debug: boolean;
  quiet: boolean;
  silent: boolean;
  logLevel: string;
  logFormat: "json" | "pretty";
  colorMode: ColorMode;
  isRestarted: boolean;

  // From .forge/config.yml (if project present)
  modules?: string[];
  dependencies?: string[];
  settings?: Record<string, Record<string, any>>;
  installMode?: "auto" | "manual" | "ask";
  offline?: boolean;
}

/**
 * Bootstrap configuration from CLI argument parsing
 * This is what cli.ts passes to us
 */
export interface BootstrapConfig {
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

// ============================================================================
// Private Logging
// ============================================================================

/**
 * Private log function for pre-logger-init tracing
 * Simple console wrapper - will be replaced with bootstrap logger in future
 */
const log = {
  debug: (message: string, ...args: any[]) => {
    // Only log if DEBUG env var is set (before --debug flag is processed)
    if (process.env.DEBUG || process.env.FORGE_DEBUG) {
      console.log(`[config-resolver] ${message}`, ...args);
    }
  },
  warn: (message: string, ...args: any[]) => {
    console.warn(`[config-resolver] ${message}`, ...args);
  },
};

// ============================================================================
// TypeScript Loader
// ============================================================================

/**
 * TypeScript loader for cosmiconfig using Bun's native TS support
 */
async function bunTypescriptLoader(filepath: string): Promise<any> {
  const module = await import(filepath);
  return module.default || module;
}

// ============================================================================
// Config Resolution
// ============================================================================

/**
 * Resolve full configuration from bootstrap config
 *
 * Steps:
 * 1. Discover project root (.forge2 directory)
 * 2. Load .forge/config.yml if project exists
 * 3. DEFERRED: Merge with user config (~/.forge/config) and defaults
 * 4. DEFERRED: Apply ENV var overrides beyond existing FORGE_* vars
 * 5. Return ResolvedConfig
 *
 * @param bootstrapConfig - Bootstrap options from CLI args
 * @returns ResolvedConfig with all data needed for Forge initialization
 * @throws Error on critical failures (e.g., YAML parse error)
 */
export async function resolveConfig(
  bootstrapConfig: BootstrapConfig,
): Promise<ResolvedConfig> {
  log.debug("Starting config resolution");
  log.debug(`userDir: ${bootstrapConfig.userDir}`);
  log.debug(`root: ${bootstrapConfig.root}`);

  // 1. Discover project root
  const projectRoot = await findProjectRoot({
    rootPath: bootstrapConfig.root,
    startDir: bootstrapConfig.userDir,
  });

  log.debug(`Project root: ${projectRoot || "(none)"}`);

  // 2. Load project config if present
  let forgeConfig: Partial<ForgeConfig> = {};

  if (projectRoot) {
    try {
      // Configure cosmiconfig to search for config files
      const explorer = cosmiconfig("forge2", {
        searchPlaces: [
          "config.yml",
          "config.yaml",
          "config.json",
          "config.js",
          "config.ts",
        ],
        loaders: {
          ".ts": bunTypescriptLoader,
        },
      });

      // Search in .forge2 directory
      const forgeDir = resolve(projectRoot, ".forge2");
      const result = await explorer.search(forgeDir);

      if (result?.config) {
        forgeConfig = result.config;
        log.debug(`Loaded config from ${result.filepath}`);
      } else {
        log.warn("No config file found in .forge2 directory");
      }
    } catch (err: any) {
      // Config parse error - throw to let CLI error handler deal with it
      throw new Error(
        `Failed to load .forge2/config: ${err.message}`,
        { cause: err },
      );
    }
  }

  // 3. DEFERRED: Full config merge strategy
  // TODO: Implement layered config merge:
  //   - Defaults
  //   - User config (~/.forge/config)
  //   - Project config (.forge2/config)
  //   - Local overrides (.forge2/config.local)
  //   - ENV vars (FORGE_*)
  // For now: Just use .forge2/config directly

  // 4. DEFERRED: Extended ENV var support
  // TODO: Support ENV var overrides for config values
  //   - FORGE_INSTALL_MODE=manual
  //   - FORGE_OFFLINE=true
  //   - etc.
  // Current: Only FORGE_PROJECT, FORGE_HOME supported

  // 5. Build ResolvedConfig
  const resolved: ResolvedConfig = {
    // Project info
    projectPresent: !!projectRoot,
    projectRoot: projectRoot ? resolve(projectRoot) : undefined,
    forgeDir: projectRoot ? resolve(projectRoot, ".forge2") : undefined,
    userDir: resolve(bootstrapConfig.userDir),

    // Bootstrap options
    debug: bootstrapConfig.debug,
    quiet: bootstrapConfig.quiet,
    silent: bootstrapConfig.silent,
    logLevel: bootstrapConfig.logLevel,
    logFormat: bootstrapConfig.logFormat || "pretty",
    colorMode: bootstrapConfig.colorMode,
    isRestarted: bootstrapConfig.isRestarted,

    // Forge config (from .forge2/config.yml)
    modules: forgeConfig.modules,
    dependencies: forgeConfig.dependencies,
    settings: forgeConfig.settings,
    installMode: forgeConfig.installMode,
    offline: forgeConfig.offline,
  };

  log.debug(`Config resolved: ${JSON.stringify(resolved, null, 2)}`);

  return resolved;
}
