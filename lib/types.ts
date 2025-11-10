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
  config: ForgeConfig;
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
 * Forge configuration
 * Contains all runtime configuration: bootstrap options, project info, and config file contents
 */
export interface ForgeConfig {
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

  // From .forge2/config.yml (if project present)
  modules?: string[];
  dependencies?: string[];
  settings?: Record<string, Record<string, any>>;
  installMode?: "auto" | "manual" | "ask";
  offline?: boolean;
  defaultCommand?: string;
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
