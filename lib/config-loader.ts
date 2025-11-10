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
import { cosmiconfig } from "cosmiconfig";
import { join } from "path";
import type { ForgeConfig } from "./types";
import { getForgeHomePath } from "./forge-home";

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
 * Note: userConfigDir parameter is deprecated, now uses FORGE_HOME/config
 */
export async function loadLayeredConfig(
  projectRoot: string,
  userConfigDir?: string, // Deprecated, kept for compatibility
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

  // 2. User config (~/.forge/config/)
  let userConfig: LayeredForgeConfig | null = null;
  try {
    const forgeConfigDir = join(getForgeHomePath(), "config");
    const result = await explorer.search(forgeConfigDir);
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
