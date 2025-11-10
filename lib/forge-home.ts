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
  const log = createLogger('forge-home');
  const forgeHome = getForgeHomePath();

  log.debug({ forgeHome }, 'Ensuring forge home exists');

  if (!existsSync(forgeHome)) {
    log.debug({ forgeHome }, 'Creating forge home directory');
    mkdirSync(forgeHome, { recursive: true });
  } else {
    log.debug({ forgeHome }, 'Forge home already exists');
  }

  const pkgPath = join(forgeHome, 'package.json');
  if (!existsSync(pkgPath)) {
    log.debug({ pkgPath }, 'Initializing package.json');
    // Initialize minimal package.json
    const initialPkg = {
      name: 'forge-home',
      private: true,
      description: 'Forge shared dependencies',
      dependencies: {},
    };
    writeFileSync(pkgPath, JSON.stringify(initialPkg, null, 2) + '\n');
    log.debug({ pkgPath }, 'Package.json created');
  } else {
    log.debug({ pkgPath }, 'Package.json already exists');
  }

  // Ensure bunfig.toml exists for bun runtime config
  ensureBunConfig();
}

/**
 * Ensure forge-home has bunfig.toml for bun runtime configuration
 */
export function ensureBunConfig(): void {
  const log = createLogger('forge-home');
  const forgeHome = getForgeHomePath();
  const bunfigPath = join(forgeHome, 'bunfig.toml');

  // Don't overwrite if exists (user may have customized)
  if (existsSync(bunfigPath)) {
    log.debug({ bunfigPath }, 'Bunfig already exists, skipping');
    return;
  }

  log.debug({ bunfigPath }, 'Creating bunfig.toml');

  const bunfig = `[install]
exact = true
dev = false
peer = true
optional = false
auto = "disable"
`;

  writeFileSync(bunfigPath, bunfig);
  log.debug({ bunfigPath }, 'Bunfig created');
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

  log.debug({
    forgeHome,
    count: dependencies.length,
    mode
  }, 'Starting dependency sync');
  log.debug({ dependencies }, 'Declared dependencies');

  await ensureForgeHome();

  // Find missing dependencies
  const checkStart = Date.now();
  const missing = dependencies.filter((dep) => {
    const installed = isInstalled(dep);
    log.debug({ dep, installed }, 'Dependency check');
    return !installed;
  });
  const checkDuration = Date.now() - checkStart;

  log.debug({
    durationMs: checkDuration,
    total: dependencies.length,
    missing: missing.length
  }, 'Dependency check complete');

  if (missing.length === 0) {
    log.debug('All dependencies already installed');
    return false; // Nothing to install
  }

  // Handle based on mode
  if (mode === 'manual') {
    log.debug({ mode, missing }, 'Manual mode, not auto-installing');
    throw new Error(
      `Missing dependencies: ${missing.join(', ')}\n` +
        `Run: forge module install`,
    );
  }

  if (mode === 'ask') {
    // TODO: Implement prompt (Phase 2.4+)
    // For now, fall through to auto mode
    log.warn({ fallback: 'auto' }, 'Ask mode not implemented, using auto');
  }

  // Auto mode: Install all missing
  log.info({ count: missing.length, dependencies: missing }, 'Installing missing dependencies');

  const installStart = Date.now();
  let anyChanged = false;

  for (const dep of missing) {
    const depStart = Date.now();
    const changed = await installDependency(dep);
    const depDuration = Date.now() - depStart;

    log.debug({
      dep,
      changed,
      durationMs: depDuration
    }, 'Dependency install result');

    if (changed) anyChanged = true;
  }

  const installDuration = Date.now() - installStart;

  log.debug({
    durationMs: installDuration,
    packagesChanged: anyChanged
  }, 'Install phase complete');

  if (anyChanged) {
    log.info('Dependencies installed successfully');
  }

  return anyChanged;
}
