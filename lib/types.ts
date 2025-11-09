/**
 * Forge v2 - Types
 *
 * Extensible types and interfaces for Forge commands and modules
 */

import type { Command } from 'commander';

// ============================================================================
// Path types
// ============================================================================

/**
 * A filesystem path (file or directory) - string for documentation purposes
 */
export type FilePath = string;

// ============================================================================
// Color mode
// ============================================================================

/**
 * Color output mode
 * - auto: Detect based on terminal capabilities (TTY, color support, etc.)
 * - always: Force colors on
 * - never: Force colors off
 */
export type ColorMode = 'auto' | 'always' | 'never';

// ============================================================================
// Forward declarations
// ============================================================================
export interface Forge {
  config: ForgeConfig | null;
  state: any; // StateManager
  globalOptions: Record<string, any>;
}

/**
 * Context passed to command execute functions
 * Provides access to forge instance, config, settings, and state
 */
export interface ForgeContext {
  forge: Forge;                      // Main forge instance
  config: ForgeConfig;               // Merged layered config
  settings: Record<string, any>;     // Command-specific settings
  state: any;                        // StateManager instance (avoid circular dep for now)
  groupName?: string;                // Which group this command is in
  commandName: string;               // This command's name
  logLevel: string;                  // Current log level (info, debug, etc.)
  logFormat: 'json' | 'pretty';      // Log format (pretty = human-readable)
  colorMode: ColorMode;              // Color output mode
}

/**
 * Command interface that modules export
 */
export interface ForgeCommand {
  description: string;
  usage?: string;

  // Optional: Let command customize Commander Command object
  // Just mutate cmd directly, no need to return
  defineCommand?: (cmd: Command) => void;

  // Execute with parsed options from Commander
  // options: parsed flags/options object from Commander
  // args: positional arguments array (always present, may be empty)
  // context: forge instance, config, and command-specific settings
  execute: (options: any, args: string[], context: ForgeContext) => Promise<void>;
}

/**
 * Module metadata for customizing group behavior
 * Export as __module__ from your module
 */
export interface ForgeModuleMetadata {
  group?: string | false;  // Custom group name, or false for top-level
  description?: string;     // Group description for help
}

/**
 * Forge configuration structure (.forge2/config.ts)
 */
export interface ForgeConfig {
  // Module paths to auto-discover commands from
  modules: string[];

  // Optional default command when none specified
  defaultCommand?: string;

  // Command-specific settings (layered config)
  // Example: { 'basic.greet': { defaultName: 'World' } }
  settings?: Record<string, Record<string, any>>;

  // Phase 2: Dependencies to install to forge home
  dependencies?: string[];  // e.g., ["@aws-sdk/client-s3@^3.0.0", "lodash@^4.0.0"]

  // Phase 2: Dependency installation mode
  installMode?: 'auto' | 'manual' | 'ask';  // Default: 'auto'

  // Phase 2: Offline mode
  offline?: boolean;  // Default: false
}

/**
 * Project configuration with fully resolved paths
 * Created early during CLI initialization after project discovery
 * All paths are resolved to absolute paths (no ./ or ../ segments)
 */
export interface ProjectConfig {
  projectRoot: FilePath;  // Fully resolved project root directory
  forgeDir: FilePath;     // Fully resolved .forge2/ directory
  userDir: FilePath;      // Fully resolved user's working directory
}
