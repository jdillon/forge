/**
 * Module Symlink Manager
 *
 * Creates symlinks to user .forge2 directories in forge-home/node_modules/.forge-project/
 * This allows user commands to import from '@planet57/forge' and get the correct module instance.
 *
 * Requires bun --preserve-symlinks to work correctly.
 */

import { join, dirname } from 'node:path';
import { createHash } from 'node:crypto';
import { symlink, mkdir, readlink } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { createLogger } from './logging/logger';

const log = createLogger('module-symlink');

/**
 * Create a symlink to the .forge2 directory in node_modules/.forge-project/
 * Returns the path to import through the symlink
 */
export async function symlinkForgeDir(forgeDir: string): Promise<string> {
  // Generate hash from absolute forge dir path (16 chars = 64 bits)
  const hash = createHash('sha256').update(forgeDir).digest('hex').slice(0, 16);

  // Bucket by first 2 chars to avoid flat directory (like git objects)
  const bucket = hash.slice(0, 2);
  const hashSuffix = hash.slice(2);

  // Symlink location in forge-home node_modules
  const forgeHome = process.env.FORGE_NODE_MODULES;
  if (!forgeHome) {
    throw new Error('FORGE_NODE_MODULES environment variable not set');
  }

  const symlinkDir = join(dirname(forgeHome), 'node_modules', '.forge-project', bucket);
  const symlinkPath = join(symlinkDir, hashSuffix);

  // Create .forge-project directory if it doesn't exist
  if (!existsSync(symlinkDir)) {
    await mkdir(symlinkDir, { recursive: true });
    log.debug({ symlinkDir }, 'Created .forge-project directory');
  }

  // Check if symlink already exists and points to the right place
  if (existsSync(symlinkPath)) {
    try {
      const target = await readlink(symlinkPath);
      if (target === forgeDir) {
        log.debug({ symlinkPath, target }, 'Symlink already exists');
        return symlinkPath;
      } else {
        log.warn({ symlinkPath, target, expected: forgeDir }, 'Symlink exists but points to wrong location');
        // Could delete and recreate, but for now just use it
      }
    } catch (e) {
      // Readlink failed, probably not a symlink
      log.warn({ symlinkPath, error: e }, 'Path exists but is not a symlink');
    }
  } else {
    // Create the symlink
    try {
      await symlink(forgeDir, symlinkPath, 'dir');
      log.debug({ forgeDir, symlinkPath }, 'Created symlink');
    } catch (e: any) {
      log.error({ forgeDir, symlinkPath, error: e.message }, 'Failed to create symlink');
      throw e;
    }
  }

  return symlinkPath;
}

/**
 * Convert a module path within .forge2 to go through the symlink
 *
 * Input: /path/to/user/project/.forge2/commands.ts
 * Output: /forge-home/node_modules/.forge-project/abc123/commands.ts
 *
 * If the path is NOT in .forge2, returns it unchanged.
 *
 * Note: The symlink should already exist (created during project setup in cli.ts)
 */
export async function rewriteModulePath(fullPath: string, forgeDir: string): Promise<string> {
  // Only rewrite paths that are actually in the .forge2 directory
  if (!fullPath.startsWith(forgeDir)) {
    return fullPath;
  }

  // Symlink should already exist, just compute the path (16 chars = 64 bits)
  const hash = createHash('sha256').update(forgeDir).digest('hex').slice(0, 16);

  // Bucket by first 2 chars (matching symlinkForgeDir structure)
  const bucket = hash.slice(0, 2);
  const hashSuffix = hash.slice(2);

  const forgeHome = process.env.FORGE_NODE_MODULES;
  if (!forgeHome) {
    throw new Error('FORGE_NODE_MODULES environment variable not set');
  }

  const symlinkPath = join(dirname(forgeHome), 'node_modules', '.forge-project', bucket, hashSuffix);

  // Replace the .forge2 directory with the symlink path
  const relativePath = fullPath.substring(forgeDir.length);
  const rewrittenPath = join(symlinkPath, relativePath);

  log.debug({ original: fullPath, rewritten: rewrittenPath }, 'Rewrote module path');

  return rewrittenPath;
}
