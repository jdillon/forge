/**
 * Forge Home Management
 *
 * Manages the forge home directory where shared dependencies and configuration live.
 *
 * Location: ~/.forge/ (or $FORGE_HOME)
 * Structure:
 *   - package.json (managed by bun)
 *   - bun.lockb (managed by bun)
 *   - node_modules/ (installed dependencies)
 *   - config/ (user-level configuration)
 *   - state/ (user-level state)
 *   - cache/ (cache data)
 *   - logs/ (global logs)
 */

import process from 'node:process';
import { join } from 'path';
import { homedir } from 'os';
import { createLogger } from './logging';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { packageManager } from './package-manager';

/**
 * Get forge home path
 * Default: ~/.forge
 * Override with FORGE_HOME environment variable
 */
export function getForgeHomePath(): string {
  return process.env.FORGE_HOME || join(homedir(), '.forge');
}

/**
 * Get the node_modules directory for Forge
 * This is where Forge looks for installed modules
 *
 * Derived from FORGE_HOME/node_modules
 */
export function getNodeModulesPath(): string {
  return join(getForgeHomePath(), 'node_modules');
}

/**
 * Ensure forge home exists with package.json and bunfig.toml initialized
 */
export async function ensureForgeHome(): Promise<void> {
  const forgeHome = getForgeHomePath();

  if (!existsSync(forgeHome)) {
    mkdirSync(forgeHome, { recursive: true });
  }

  const pkgPath = join(forgeHome, 'package.json');
  if (!existsSync(pkgPath)) {
    // Initialize minimal package.json
    const initialPkg = {
      name: 'forge-home',
      private: true,
      description: 'Forge shared dependencies',
      dependencies: {},
    };
    writeFileSync(pkgPath, JSON.stringify(initialPkg, null, 2) + '\n');
  }

  // Ensure bunfig.toml exists for bun runtime config
  ensureBunConfig();
}

/**
 * Ensure forge-home has bunfig.toml for bun runtime configuration
 */
export function ensureBunConfig(): void {
  const forgeHome = getForgeHomePath();
  const bunfigPath = join(forgeHome, 'bunfig.toml');

  // Don't overwrite if exists (user may have customized)
  if (existsSync(bunfigPath)) {
    return;
  }

  const bunfig = `[install]
exact = true
dev = false
peer = true
optional = false
auto = "disable"
`;

  writeFileSync(bunfigPath, bunfig);
}

/**
 * Parse dependency string to extract package name
 * Examples:
 *   "lodash@^4.0.0" → "lodash"
 *   "@aws-sdk/client-s3@^3.0.0" → "@aws-sdk/client-s3"
 *   "github:lodash/lodash" → "github:lodash/lodash" (git URL, keep as-is)
 */
export function parseDependencyName(dep: string): string {
  return packageManager.parseDependencyName(dep);
}

/**
 * Check if a dependency is already installed in forge home
 *
 * Handles different dependency types:
 * - Local paths: file:/path, /path, ../path - checks if value matches
 * - Git URLs: github:user/repo, git+https://... - checks if value matches
 * - Package names: lodash@1.0.0, @scope/pkg - checks if key exists
 */
export function isInstalled(dep: string): boolean {
  return packageManager.isInstalled(dep);
}

/**
 * Install a single dependency using bun add
 * Returns true if package.json changed (restart needed)
 */
export async function installDependency(dep: string): Promise<boolean> {
  await ensureForgeHome();
  return packageManager.installDependency(dep);
}

/**
 * Sync dependencies from config
 *
 * Installs missing dependencies based on the install mode.
 * Returns true if restart is needed (package.json changed).
 *
 * @param dependencies - Array of dependency strings from config
 * @param mode - Installation mode (auto, manual, ask)
 * @returns Promise<boolean> - True if restart needed
 */
export async function syncDependencies(
  dependencies: string[],
  mode: 'auto' | 'manual' | 'ask' = 'auto',
): Promise<boolean> {
  const log = createLogger('forge-home');
  const forgeHome = getForgeHomePath();

  log.debug({ forgeHome, dependencies, mode }, 'Dependency sync');

  await ensureForgeHome();

  // Find missing dependencies
  const missing = dependencies.filter((dep) => !isInstalled(dep));

  log.debug({ missing }, 'Missing dependencies check');

  if (missing.length === 0) {
    return false; // Nothing to install
  }

  // Handle based on mode
  if (mode === 'manual') {
    throw new Error(
      `Missing dependencies: ${missing.join(', ')}\n` +
        `Run: forge module install`,
    );
  }

  if (mode === 'ask') {
    // TODO: Implement prompt (Phase 2.4+)
    // For now, fall through to auto mode
    log.warn('Ask mode not yet implemented, using auto mode');
  }

  // Auto mode: Install all missing
  log.info({ count: missing.length, dependencies: missing }, 'Installing dependencies');

  let anyChanged = false;
  for (const dep of missing) {
    const changed = await installDependency(dep);
    log.debug({ dep, changed }, 'Dependency install result');
    if (changed) anyChanged = true;
  }

  if (anyChanged) {
    log.info('Dependencies installed');
  }

  log.debug({ anyChanged }, 'Dependency sync result');

  return anyChanged;
}
