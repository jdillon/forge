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

import { syncDependencies, isInstalled } from './forge-home';
import { createLogger } from './logging';
import type { ForgeConfig } from './types';

/**
 * Magic exit code to signal wrapper that restart is needed
 */
export const RESTART_EXIT_CODE = 42;

/**
 * Sync dependencies and handle restart if needed
 *
 * @param config - Forge configuration
 * @param forgeDir - Project .forge2/ directory path
 * @param isRestarted - True if this is a restarted process (from --forge-restarted flag)
 * @returns True if process should exit for restart
 * @throws Error if dependencies missing on restarted process
 */
export async function autoInstallDependencies(
  config: ForgeConfig,
  forgeDir: string,
  isRestarted: boolean = false,
): Promise<boolean> {
  const log = createLogger('auto-install');

  log.debug({
    isRestarted,
    hasDeps: !!config.dependencies,
    depCount: config.dependencies?.length || 0
  }, 'Starting auto-install check');

  // No dependencies declared
  if (!config.dependencies || config.dependencies.length === 0) {
    log.debug('No dependencies declared, skipping');
    return false;
  }

  const mode = config.installMode || 'auto';
  const offline = config.offline || false;

  log.debug({ mode, offline, isRestarted, depCount: config.dependencies.length }, 'Auto-install settings');

  // Offline mode check
  if (offline && mode === 'auto') {
    log.debug({ mode: 'auto', offline: true }, 'Checking dependencies in offline mode');

    const checkStart = Date.now();
    const missing = config.dependencies.filter((dep) => {
      const installed = !isInstalled(dep);
      log.debug({ dep, missing: installed }, 'Offline dependency check');
      return installed;
    });
    const checkDuration = Date.now() - checkStart;

    log.debug({ durationMs: checkDuration, missing: missing.length, total: config.dependencies.length }, 'Offline check complete');

    if (missing.length > 0) {
      log.debug({ missing }, 'Dependencies missing in offline mode');
      throw new Error(
        `Offline mode is enabled but ${missing.length === 1 ? 'dependency is' : 'dependencies are'} missing\n\n` +
          `Missing: ${missing.join(', ')}\n\n` +
          `Suggestions:\n` +
          `  1. Disable offline mode and retry\n` +
          `  2. Install dependencies on a connected machine first\n` +
          `  3. Pre-install all dependencies before working offline`,
      );
    }

    log.debug('All dependencies available in offline mode');
    return false;
  }

  try {
    log.debug('Calling syncDependencies');
    const syncStart = Date.now();
    const needsRestart = await syncDependencies(config.dependencies, mode);
    const syncDuration = Date.now() - syncStart;

    log.debug({ durationMs: syncDuration, needsRestart }, 'Dependency sync complete');

    if (needsRestart) {
      // If this is already a restarted process, something went wrong
      if (isRestarted) {
        log.debug({ isRestarted: true, needsRestart: true }, 'ERROR: Dependencies still missing after restart');
        throw new Error(
          `Dependencies were installed but still missing after restart\n\n` +
            `This should not happen. Please report this as a bug.\n\n` +
            `Suggestions:\n` +
            `  1. Check forge home: ~/.local/share/forge/\n` +
            `  2. Try manual install: forge module install\n` +
            `  3. Check for errors in bun installation`,
        );
      }

      // First run - signal restart needed
      log.info('Dependencies changed, restart required');
      return true;
    }

    log.debug('No restart needed');
    return false;
  } catch (err) {
    log.debug({ mode, error: err }, 'Dependency sync error');

    // Handle errors based on mode
    if (mode === 'manual') {
      log.debug('Manual mode error, rethrowing');
      // Manual mode error - already has good message from syncDependencies
      throw err;
    }

    // Auto/ask mode: Show error and suggest manual install
    if (err instanceof Error) {
      log.debug({ originalMessage: err.message }, 'Wrapping auto-install error');
      throw new Error(
        `Failed to install dependencies: ${err.message}\n\n` +
          `Try running: forge module install`,
      );
    }

    throw err;
  }
}
