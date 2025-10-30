/**
 * Forge v2 - Configuration Loader
 *
 * Layered configuration system inspired by .gitconfig
 * Priority (highest to lowest):
 * 1. Environment variables (FORGE_*)
 * 2. Local project config (.forge2/config.local.ts) - gitignored
 * 3. Project config (.forge2/config.ts)
 * 4. User config (~/.config/forge2/config.ts)
 * 5. Defaults
 */

import { cosmiconfig } from 'cosmiconfig';
import { join } from 'path';
import { existsSync } from 'fs';
import type { ForgeConfig } from './core';

export interface LayeredForgeConfig extends ForgeConfig {
  // Command-specific settings
  // Example: { 'basic.greet': { defaultName: 'World' } }
  settings?: Record<string, Record<string, any>>;
}

/**
 * Deep merge objects (later values override earlier)
 */
function deepMerge<T extends Record<string, any>>(target: T, source: Partial<T>): T {
  const result = { ...target };

  for (const key in source) {
    const sourceValue = source[key];
    const targetValue = result[key];

    if (
      sourceValue &&
      typeof sourceValue === 'object' &&
      !Array.isArray(sourceValue) &&
      targetValue &&
      typeof targetValue === 'object' &&
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
 * Load config from a specific file path
 */
async function loadConfigFile(filePath: string): Promise<LayeredForgeConfig | null> {
  if (!existsSync(filePath)) {
    return null;
  }

  try {
    const module = await import(filePath);
    return module.default || module;
  } catch (err) {
    console.warn(`Warning: Failed to load config from ${filePath}:`, err);
    return null;
  }
}

/**
 * Load and merge configs from all layers
 */
export async function loadLayeredConfig(
  projectRoot: string,
  userConfigDir: string
): Promise<LayeredForgeConfig> {
  // 1. Defaults
  const defaults: LayeredForgeConfig = {
    modules: [],
    settings: {},
  };

  // 2. User config (~/.config/forge2/config.ts)
  const userConfigPath = join(userConfigDir, 'forge2', 'config.ts');
  const userConfig = await loadConfigFile(userConfigPath);

  // 3. Project config (.forge2/config.ts)
  const projectConfigPath = join(projectRoot, '.forge2', 'config.ts');
  const projectConfig = await loadConfigFile(projectConfigPath);

  // 4. Local overrides (.forge2/config.local.ts)
  const localConfigPath = join(projectRoot, '.forge2', 'config.local.ts');
  const localConfig = await loadConfigFile(localConfigPath);

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
  defaultValue?: T
): T {
  const commandSettings = config.settings?.[commandPath];
  if (commandSettings && settingKey in commandSettings) {
    return commandSettings[settingKey] as T;
  }
  return defaultValue as T;
}
