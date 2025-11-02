/**
 * Module Resolver
 *
 * Resolves module paths with priority: local → shared
 *
 * Priority order:
 * 1. Local modules: .forge2/modulename.ts (or path in config)
 * 2. Shared modules: ~/.local/share/forge2/node_modules/package-name
 *
 * Note: Project node_modules/ is intentionally NOT in resolution path.
 * Forge modules should not depend on project build tooling.
 */

import { resolve, join } from 'path';
import { existsSync } from 'fs';
import { getForgeHomePath } from './forge-home';

/**
 * Resolve module path with priority: local → shared
 *
 * @param modulePath - Module name or path from config (e.g., "./website", "@aws-sdk/client-s3")
 * @param forgeDir - Project's .forge2/ directory
 * @returns Absolute path to module file
 * @throws Error if module not found
 */
export async function resolveModule(
  modulePath: string,
  forgeDir: string,
): Promise<string> {
  const { log } = await import('./logger');

  log.debug({ modulePath, forgeDir }, 'Resolving module');

  // 1. Local modules (relative paths starting with ./ or ../)
  if (modulePath.startsWith('.')) {
    const localPath = resolve(forgeDir, modulePath);

    // Try with and without extensions
    for (const ext of ['', '.ts', '.js', '.mjs']) {
      const fullPath = localPath + ext;
      if (existsSync(fullPath)) {
        log.debug({ fullPath }, 'Module resolved (local)');
        return fullPath;
      }
    }

    throw new Error(
      `Local module not found: ${modulePath}\n` +
        `Searched in: ${forgeDir}`,
    );
  }

  // 2. Shared modules (package names, from forge home node_modules)
  const forgeHome = getForgeHomePath();
  const sharedPath = join(forgeHome, 'node_modules', modulePath);

  if (existsSync(sharedPath)) {
    log.debug({ sharedPath }, 'Module resolved (shared)');
    // Return the path and let Node.js/Bun module resolution handle it
    return sharedPath;
  }

  // 3. Not found anywhere
  throw new Error(
    `Module not found: ${modulePath}\n` +
      `Searched:\n` +
      `  - Local: ${forgeDir}\n` +
      `  - Shared: ${join(forgeHome, 'node_modules')}\n\n` +
      `Suggestions:\n` +
      `  1. Add to config.yml dependencies section\n` +
      `  2. Run: forge module install`,
  );
}
