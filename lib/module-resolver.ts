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
  const debug = process.env.FORGE_DEBUG === '1' || process.argv.includes('--debug');

  if (debug) {
    console.error('\n=== Module Resolution Debug ===');
    console.error('Resolving:', modulePath);
    console.error('From:', forgeDir);
  }

  // 1. Local modules (relative paths starting with ./ or ../)
  if (modulePath.startsWith('.')) {
    const localPath = resolve(forgeDir, modulePath);

    if (debug) console.error('Trying local paths...');

    // Try with and without extensions
    for (const ext of ['', '.ts', '.js', '.mjs']) {
      const fullPath = localPath + ext;
      if (debug) console.error(`  Checking: ${fullPath}`);
      if (existsSync(fullPath)) {
        if (debug) console.error(`  ✓ Found: ${fullPath}`);
        console.error('===============================\n');
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

  if (debug) {
    console.error('Trying shared path...');
    console.error(`  Checking: ${sharedPath}`);
  }

  if (existsSync(sharedPath)) {
    if (debug) console.error(`  ✓ Found: ${sharedPath}`);
    console.error('===============================\n');
    // Return the path and let Node.js/Bun module resolution handle it
    return sharedPath;
  }

  if (debug) console.error('  ✗ Not found');
  console.error('===============================\n');

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
