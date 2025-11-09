/**
 * Auto-Install Flow
 *
 * Coordinates dependency installation and restart mechanism.
 *
 * Restart Flow:
 * 1. First run: Missing deps → install → exit 42
 * 2. Wrapper detects 42 → re-run with --forge-restarted flag
 * 3. Second run: If deps still missing → FAIL (not exit 42)
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

  log.debug({ isRestarted, hasDependencies: !!config.dependencies }, 'Auto-install check');

  // No dependencies declared
  if (!config.dependencies || config.dependencies.length === 0) {
    log.debug('No dependencies declared');
    return false;
  }

  const mode = config.installMode || 'auto';
  const offline = config.offline || false;

  log.debug({ mode, offline }, 'Install settings');

  // Offline mode check
  if (offline && mode === 'auto') {
    // In offline mode with auto install, we can't install
    // Just check if dependencies are available, fail if not
    const missing = config.dependencies.filter((dep) => !isInstalled(dep));

    if (missing.length > 0) {
      throw new Error(
        `Offline mode is enabled but ${missing.length === 1 ? 'dependency is' : 'dependencies are'} missing\n\n` +
          `Missing: ${missing.join(', ')}\n\n` +
          `Suggestions:\n` +
          `  1. Disable offline mode and retry\n` +
          `  2. Install dependencies on a connected machine first\n` +
          `  3. Pre-install all dependencies before working offline`,
      );
    }

    return false;
  }

  try {
    const needsRestart = await syncDependencies(config.dependencies, mode);

    if (needsRestart) {
      // If this is already a restarted process, something went wrong
      if (isRestarted) {
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
      log.info('Restarting to pick up dependency changes');
      return true;
    }

    return false;
  } catch (err) {
    // Handle errors based on mode
    if (mode === 'manual') {
      // Manual mode error - already has good message from syncDependencies
      throw err;
    }

    // Auto/ask mode: Show error and suggest manual install
    if (err instanceof Error) {
      throw new Error(
        `Failed to install dependencies: ${err.message}\n\n` +
          `Try running: forge module install`,
      );
    }

    throw err;
  }
}
