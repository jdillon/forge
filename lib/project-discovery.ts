/**
 * Project Discovery
 *
 * Finds the project root by looking for .forge2/ directory
 * Similar to how git finds .git/
 */

import { join, dirname } from 'node:path';
import { existsSync } from 'node:fs';
import type { FilePath } from './types';

/**
 * Discover project root by walking up directory tree
 *
 * Searches for .forge2/ directory starting from startDir and moving up
 * until it finds one or reaches the filesystem root.
 *
 * @param startDir - Directory to start searching from (defaults to FORGE_USER_DIR or cwd)
 * @returns Project root directory, or null if not found
 */
export async function discoverProject(startDir?: FilePath): Promise<FilePath | null> {
  // Start from explicit dir, or FORGE_USER_DIR (user's actual location), or fall back to cwd
  let dir = startDir || process.env.FORGE_USER_DIR || process.cwd();

  // Walk up to root
  while (dir !== '/' && dir !== '.') {
    const forgeDir = join(dir, '.forge2');

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
 * Get project root from explicit sources
 *
 * Checks in order:
 * 1. Explicit rootPath parameter (from --root flag)
 * 2. FORGE_PROJECT environment variable
 *
 * @param rootPath - Explicit root path from CLI flag
 * @returns Project root directory, or null if not explicitly set
 * @throws Error if FORGE_PROJECT is set but invalid
 */
export function getExplicitProjectRoot(rootPath?: FilePath): FilePath | null {
  // CLI flag takes precedence
  if (rootPath) {
    return rootPath;
  }

  // Env var override
  if (process.env.FORGE_PROJECT) {
    const envPath = process.env.FORGE_PROJECT;
    if (existsSync(join(envPath, '.forge2'))) {
      return envPath;
    }
    throw new Error(`FORGE_PROJECT=${envPath} but .forge2/ not found`);
  }

  return null;
}

/**
 * Find project root using all available methods
 *
 * Tries in order:
 * 1. Explicit root (--root flag or FORGE_PROJECT env var)
 * 2. Discovery (walk up from start directory)
 *
 * @param options - Discovery options
 * @returns Project root directory, or null if not found
 */
export async function findProjectRoot(options: {
  rootPath?: FilePath;
  startDir?: FilePath;
} = {}): Promise<FilePath | null> {
  // Try explicit sources first
  const explicitRoot = getExplicitProjectRoot(options.rootPath);
  if (explicitRoot) {
    return explicitRoot;
  }

  // Fall back to discovery
  return discoverProject(options.startDir);
}
