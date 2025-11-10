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

import { resolve, join } from 'path';
import { existsSync } from 'fs';
import { getNodeModulesPath } from './forge-home';
import { createLogger } from './logging';

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
  const log = createLogger('module-resolver');

  log.debug({ modulePath, forgeDir }, 'Starting module resolution');

  // 1. Local modules (relative paths starting with ./ or ../)
  if (modulePath.startsWith('.')) {
    log.debug({ strategy: 'local', modulePath }, 'Using local module strategy');
    const localPath = resolve(forgeDir, modulePath);
    const attemptedPaths: string[] = [];

    // Try with and without extensions
    for (const ext of ['', '.ts', '.js', '.mjs']) {
      const fullPath = localPath + ext;
      attemptedPaths.push(fullPath);
      log.debug(`Trying extension: ${fullPath}`);

      if (existsSync(fullPath)) {
        log.debug({ fullPath, attemptedCount: attemptedPaths.length }, 'Module resolved (local)');
        return fullPath;
      }
    }

    log.debug({ attemptedPaths }, 'Local module not found');
    throw new Error(
      `Local module not found: ${modulePath}\n` +
        `Searched in: ${forgeDir}\n` +
        `Attempted paths:\n  ${attemptedPaths.join('\n  ')}`,
    );
  }

  // 2. Package modules (from node_modules)
  // Examples: "@jdillon/forge-standard/hello", "cowsay"
  log.debug({ strategy: 'package', modulePath }, 'Using package module strategy');
  const nodeModules = getNodeModulesPath();

  // For scoped packages with subpaths like "@jdillon/forge-standard/hello"
  // we need to resolve the full path including the submodule
  const packagePath = join(nodeModules, modulePath);
  const attemptedPaths: string[] = [];

  // Try with extensions for the package module
  for (const ext of ['', '.ts', '.js', '.mjs']) {
    const fullPath = packagePath + ext;
    attemptedPaths.push(fullPath);
    log.debug(`Trying extension: ${fullPath}`);

    if (existsSync(fullPath)) {
      log.debug({ fullPath, attemptedCount: attemptedPaths.length }, 'Module resolved (package)');
      return fullPath;
    }
  }

  // If no extension worked, check if it's a directory (package without submodule)
  if (existsSync(packagePath)) {
    log.debug({ packagePath, isDirectory: true }, 'Module resolved (package directory)');
    return packagePath;
  }

  // 3. Not found anywhere
  log.debug({ attemptedPaths, nodeModules }, 'Package module not found');
  throw new Error(
    `Module not found: ${modulePath}\n` +
      `Searched:\n` +
      `  - Local: ${forgeDir}\n` +
      `  - Package: ${join(nodeModules, modulePath)}\n` +
      `Attempted paths:\n  ${attemptedPaths.join('\n  ')}\n\n` +
      `Suggestions:\n` +
      `  1. Add to config.yml dependencies section\n` +
      `  2. Run: forge module install`,
  );
}
