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
/**
 * Shared test environment setup
 *
 * Installs forge package once for entire test suite to speed up tests.
 * Tests use an installed version (not dev mode) to match real usage.
 */

import { spawnSync } from 'bun';
import { mkdir, rm } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';
import { homedir } from 'os';
import { TEST_DIRS } from './utils';
import { createLogger } from './logger';

const log = createLogger('test-env');

// Test installation paths
const TEST_INSTALL_DIR = join(TEST_DIRS.build, 'test-forge-installation');
const TEST_FORGE_HOME = join(TEST_INSTALL_DIR, '.local', 'share', 'forge');
const TEST_FORGE_BIN = join(TEST_INSTALL_DIR, '.local', 'bin', 'forge');
const TEST_TARBALL_DIR = join(TEST_DIRS.build, 'test-tmp', 'env');
const TEST_TARBALL_PATH = join(TEST_TARBALL_DIR, 'forge-test-env.tgz');

// Use real user's Bun cache to speed up installs
const realUserHome = homedir();
const bunCacheDir = join(realUserHome, '.bun', 'install', 'cache');

let isInstalled = false;

/**
 * Test environment configuration
 */
export interface TestEnvironment {
  /** Path to test forge home */
  forgeHome: string;
  /** Path to installed forge command */
  forgeCmd: string;
  /** Path to node_modules for module resolution */
  nodeModules: string;
  /** Base directory for installation */
  installDir: string;
}

/**
 * Get or create shared test environment
 *
 * Installs forge once and reuses for all tests.
 * Call this at the start of each test file that needs forge.
 */
export async function setupTestEnvironment(force = false): Promise<TestEnvironment> {
  // Already set up and not forcing reinstall
  if (isInstalled && !force && existsSync(TEST_FORGE_BIN)) {
    log.debug('Using existing test environment');
    return getTestEnvironment();
  }

  log.info({ installDir: TEST_INSTALL_DIR }, 'Setting up test environment');

  // Clean up old installation if forcing
  if (force && existsSync(TEST_INSTALL_DIR)) {
    log.info('Removing old test installation');
    await rm(TEST_INSTALL_DIR, { recursive: true, force: true });
  }

  // Create tarball if it doesn't exist
  if (!existsSync(TEST_TARBALL_PATH)) {
    await createTestTarball();
  }

  // Install forge to test directory
  await installForgeForTests();

  isInstalled = true;
  return getTestEnvironment();
}

/**
 * Get test environment paths (assumes already set up)
 */
export function getTestEnvironment(): TestEnvironment {
  return {
    forgeHome: TEST_FORGE_HOME,
    forgeCmd: TEST_FORGE_BIN,
    nodeModules: join(TEST_FORGE_HOME, 'node_modules'),
    installDir: TEST_INSTALL_DIR,
  };
}

/**
 * Create tarball for testing
 */
async function createTestTarball(): Promise<void> {
  log.info({ tarballPath: TEST_TARBALL_PATH }, 'Creating test tarball');

  // Create directory
  await mkdir(TEST_TARBALL_DIR, { recursive: true });

  // Run bun pm pack
  const packResult = spawnSync([
    'bun',
    'pm',
    'pack',
    '--filename', TEST_TARBALL_PATH,
  ], {
    cwd: TEST_DIRS.root,
    stdout: 'pipe',
    stderr: 'pipe',
  });

  if (packResult.exitCode !== 0) {
    log.error({ stderr: packResult.stderr.toString() }, 'Failed to create tarball');
    throw new Error('Tarball creation failed');
  }

  log.info('Tarball created successfully');
}

/**
 * Install forge package for testing
 */
async function installForgeForTests(): Promise<void> {
  log.info({ installDir: TEST_INSTALL_DIR }, 'Installing forge for tests');

  const installScript = join(TEST_DIRS.root, 'bin', 'install.sh');

  // Run install script with test HOME
  const installResult = spawnSync([
    'bash',
    installScript,
    '-y', // Skip confirmation
  ], {
    env: {
      ...process.env,
      HOME: TEST_INSTALL_DIR,
      FORGE_REPO: `file://${TEST_TARBALL_PATH}`,
      FORGE_BRANCH: '',
      BUN_INSTALL_CACHE_DIR: bunCacheDir,
    },
    stdout: 'pipe',
    stderr: 'pipe',
  });

  if (installResult.exitCode !== 0) {
    log.error({
      exitCode: installResult.exitCode,
      stdout: installResult.stdout.toString(),
      stderr: installResult.stderr.toString(),
    }, 'Install failed');
    throw new Error('Failed to install forge for tests');
  }

  // Verify installation
  if (!existsSync(TEST_FORGE_BIN)) {
    throw new Error(`Forge not installed at ${TEST_FORGE_BIN}`);
  }

  log.info('Forge installed successfully for tests');
}

/**
 * Clean up test environment (useful for debugging)
 */
export async function cleanTestEnvironment(): Promise<void> {
  log.info('Cleaning test environment');

  if (existsSync(TEST_INSTALL_DIR)) {
    await rm(TEST_INSTALL_DIR, { recursive: true, force: true });
  }

  if (existsSync(TEST_TARBALL_PATH)) {
    await rm(TEST_TARBALL_PATH, { force: true });
  }

  isInstalled = false;
  log.info('Test environment cleaned');
}
