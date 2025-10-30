/**
 * Forge v2 - Configuration Loader
 *
 * Layered configuration system using cosmiconfig
 * Priority (highest to lowest):
 * 1. Environment variables (FORGE_*)
 * 2. Local project config (.forge2/config.local.*) - gitignored
 * 3. Project config (.forge2/config.*)
 * 4. User config (~/.config/forge2/config.*)
 * 5. Defaults
 *
 * Supports multiple formats via cosmiconfig:
 * - .forge2/config.yml (YAML - recommended for pure data)
 * - .forge2/config.ts (TypeScript - for type safety)
 * - .forge2/config.json (JSON)
 * - .forge2/config.js (JavaScript)
 * - .forge2rc (various formats)
 */

import { cosmiconfig } from "cosmiconfig";
import { join } from "path";
import type { ForgeConfig } from "./core";

/**
 * TypeScript loader for cosmiconfig using Bun's native TS support
 * Note: Cosmiconfig has built-in TS support for Node.js, but we use
 * Bun's native import() which handles TypeScript directly.
 */
async function bunTypescriptLoader(filepath: string): Promise<any> {
  const module = await import(filepath);
  return module.default || module;
}

export interface LayeredForgeConfig extends ForgeConfig {
  // Command-specific settings
  // Example: { 'basic.greet': { defaultName: 'World' } }
  settings?: Record<string, Record<string, any>>;
}

/**
 * Deep merge objects (later values override earlier)
 */
function deepMerge<T extends Record<string, any>>(
  target: T,
  source: Partial<T>,
): T {
  const result = { ...target };

  for (const key in source) {
    const sourceValue = source[key];
    const targetValue = result[key];

    if (
      sourceValue &&
      typeof sourceValue === "object" &&
      !Array.isArray(sourceValue) &&
      targetValue &&
      typeof targetValue === "object" &&
      !Array.isArray(targetValue)
    ) {
      // Recursively merge nested objects
      result[key] = deepMerge(targetValue, sourceValue);
    } else if (sourceValue !== undefined) {
      // Override with source value
      result[key] = sourceValue as T[Extract<keyof T, string>];
    }
  }

  return result;
}

/**
 * Load and merge configs from all layers
 */
export async function loadLayeredConfig(
  projectRoot: string,
  userConfigDir: string,
): Promise<LayeredForgeConfig> {
  // 1. Defaults
  const defaults: LayeredForgeConfig = {
    modules: [],
    settings: {},
  };

  const explorer = cosmiconfig("forge2", {
    searchPlaces: [
      // Prefer config.* naming since we're already in .forge2/ or forge2/ directories
      "config.yml",
      "config.yaml",
      "config.json",
      "config.js",
      "config.ts",
    ],
    loaders: {
      // Override default TS loader with Bun-compatible version
      ".ts": bunTypescriptLoader,
    },
  });

  // 2. User config (~/.config/forge2/)
  let userConfig: LayeredForgeConfig | null = null;
  try {
    const result = await explorer.search(join(userConfigDir, "forge2"));
    userConfig = result?.config || null;
  } catch (err) {
    // User config is optional
  }

  // 3. Project config (.forge2/)
  let projectConfig: LayeredForgeConfig | null = null;
  try {
    const result = await explorer.search(join(projectRoot, ".forge2"));
    projectConfig = result?.config || null;
  } catch (err) {
    console.warn(`Warning: Failed to load project config:`, err);
  }

  // 4. Local overrides (.forge2/config.local.*)
  let localConfig: LayeredForgeConfig | null = null;
  const localExtensions = ["yml", "yaml", "json", "js", "ts"];
  for (const ext of localExtensions) {
    try {
      const localResult = await explorer.load(
        join(projectRoot, ".forge2", `config.local.${ext}`),
      );
      if (localResult?.config) {
        localConfig = localResult.config;
        break; // Use first found
      }
    } catch (err) {
      // Try next extension
    }
  }

  // Merge in order (each overrides previous)
  let merged = defaults;

  if (userConfig) {
    merged = deepMerge(merged, userConfig);
  }

  if (projectConfig) {
    merged = deepMerge(merged, projectConfig);
  }

  if (localConfig) {
    merged = deepMerge(merged, localConfig);
  }

  // 5. Environment variables (FORGE_*)
  // TODO: Implement env var parsing if needed

  return merged;
}

/**
 * Get setting value for a command
 * commandPath format: "groupName.commandName" (e.g., "basic.greet")
 */
export function getSetting<T = any>(
  config: LayeredForgeConfig,
  commandPath: string,
  settingKey: string,
  defaultValue?: T,
): T {
  const commandSettings = config.settings?.[commandPath];
  if (commandSettings && settingKey in commandSettings) {
    return commandSettings[settingKey] as T;
  }
  return defaultValue as T;
}
