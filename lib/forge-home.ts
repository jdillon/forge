/**
 * Forge Home Management
 *
 * Manages the forge home directory (XDG data directory) where shared
 * dependencies are installed.
 *
 * Location: ~/.local/share/forge2/ (or $XDG_DATA_HOME/forge2/)
 * Structure:
 *   - package.json (managed by bun)
 *   - bun.lockb (managed by bun)
 *   - node_modules/ (installed dependencies)
 */

import { getForgePaths } from './xdg';
import { log } from './logger';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';
import { createHash } from 'crypto';

/**
 * Get forge home path (XDG data directory)
 */
export function getForgeHomePath(): string {
  return getForgePaths().data;
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
 * Get current package.json content hash for change detection
 */
function getPackageHash(): string {
  const pkgPath = join(getForgeHomePath(), 'package.json');
  if (!existsSync(pkgPath)) return '';

  const content = readFileSync(pkgPath, 'utf8');
  return createHash('sha256').update(content).digest('hex');
}

/**
 * Parse dependency string to extract package name
 * Examples:
 *   "lodash@^4.0.0" → "lodash"
 *   "@aws-sdk/client-s3@^3.0.0" → "@aws-sdk/client-s3"
 *   "github:lodash/lodash" → "github:lodash/lodash" (git URL, keep as-is)
 */
export function parseDependencyName(dep: string): string {
  // Git URLs (github:, git+https://, etc.) - keep as-is for now
  if (dep.startsWith('github:') || dep.startsWith('git+')) {
    return dep;
  }

  // Scoped package: @scope/name@version → @scope/name
  if (dep.startsWith('@')) {
    const parts = dep.split('@');
    // parts = ['', 'scope/name', 'version']
    if (parts.length >= 3) {
      return `@${parts[1]}`;
    }
    return dep; // Malformed, return as-is
  }

  // Regular package: name@version → name
  return dep.split('@')[0];
}

/**
 * Check if a dependency is already installed in forge home
 */
export function isInstalled(dep: string): boolean {
  const pkgPath = join(getForgeHomePath(), 'package.json');
  if (!existsSync(pkgPath)) return false;

  try {
    const pkg = JSON.parse(readFileSync(pkgPath, 'utf8'));
    const deps = pkg.dependencies || {};

    const depName = parseDependencyName(dep);
    return depName in deps;
  } catch (err) {
    // Corrupted package.json
    return false;
  }
}

/**
 * Install a single dependency using bun add
 * Returns true if package.json changed (restart needed)
 */
export async function installDependency(dep: string): Promise<boolean> {
  await ensureForgeHome();

  const forgeHome = getForgeHomePath();
  const beforeHash = getPackageHash();

  // Run bun add from forge home directory
  const proc = Bun.spawn(['bun', 'add', dep], {
    cwd: forgeHome,
    stdout: 'pipe',
    stderr: 'pipe',
  });

  const exitCode = await proc.exited;

  if (exitCode !== 0) {
    const stderr = await new Response(proc.stderr).text();
    throw new Error(`Failed to install ${dep}: ${stderr}`);
  }

  const afterHash = getPackageHash();
  return beforeHash !== afterHash;
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
  const debug = process.env.FORGE_DEBUG === '1' || process.argv.includes('--debug');
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
