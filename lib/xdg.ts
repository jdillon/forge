/**
 * XDG Base Directory Specification
 * https://specifications.freedesktop.org/basedir-spec/
 *
 * Provides standard paths for user data, config, cache, and state
 */

import { join } from 'path';
import { homedir } from 'os';

/**
 * Get XDG data home directory
 * Default: ~/.local/share
 */
export function getXDGDataHome(): string {
  return process.env.XDG_DATA_HOME || join(homedir(), '.local', 'share');
}

/**
 * Get XDG config home directory
 * Default: ~/.config
 */
export function getXDGConfigHome(): string {
  return process.env.XDG_CONFIG_HOME || join(homedir(), '.config');
}

/**
 * Get XDG cache home directory
 * Default: ~/.cache
 */
export function getXDGCacheHome(): string {
  return process.env.XDG_CACHE_HOME || join(homedir(), '.cache');
}

/**
 * Get XDG state home directory
 * Default: ~/.local/state
 */
export function getXDGStateHome(): string {
  return process.env.XDG_STATE_HOME || join(homedir(), '.local', 'state');
}

/**
 * Get forge2 installation paths (XDG-compliant)
 */
export function getForgePaths() {
  return {
    data: join(getXDGDataHome(), 'forge2'),
    config: join(getXDGConfigHome(), 'forge2'),
    cache: join(getXDGCacheHome(), 'forge2'),
    state: join(getXDGStateHome(), 'forge2'),
    modules: join(getXDGDataHome(), 'forge2', 'modules'),
    runtime: join(getXDGDataHome(), 'forge2', 'runtime'),
  };
}
