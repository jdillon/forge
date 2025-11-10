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
 * Installation script tests
 *
 * Tests the install.sh script in an isolated environment to avoid
 * mutating the user's actual home directory.
 */

import { describe, test } from "./lib/testx";
import { expect, beforeAll } from "bun:test";
import { mkdir, stat, lstat } from "fs/promises";
import { join } from "path";
import { homedir } from "os";
import { spawnSync } from "bun";
import {
  runCommandWithLogs,
  setupTestLogs,
  setupTestHome,
  TEST_DIRS,
} from "./lib/utils";
import { createLogger } from "./lib/logger";
import type { TestContext } from "./lib/testx";

const projectRoot = TEST_DIRS.root;
const log = createLogger('install-test');

// Use the real user's Bun cache to speed up installs
const realUserHome = homedir();
const bunCacheDir = join(realUserHome, ".bun", "install", "cache");

// Fresh tarball location for install tests
const testTmpDir = join(projectRoot, "build/test-tmp/install");
const testTarballFilename = "forge-test.tgz";
let testTarballPath: string;

/**
 * Create a fresh tarball for install tests
 * Uses --filename with full path to avoid version-dependent naming
 */
async function createTestTarball(): Promise<string> {
  log.info('Creating fresh tarball for install tests');

  // Create test-tmp directory
  await mkdir(testTmpDir, { recursive: true });

  const tarballPath = join(testTmpDir, testTarballFilename);

  // Run bun pm pack with full path as filename
  const packResult = spawnSync([
    "bun",
    "pm",
    "pack",
    "--filename", tarballPath,
  ], {
    cwd: projectRoot,
    stdout: "pipe",
    stderr: "pipe",
  });

  if (packResult.exitCode !== 0) {
    log.error({ stderr: packResult.stderr.toString() }, 'Failed to create tarball');
    throw new Error("Tarball creation failed");
  }

  // Verify it exists
  const exists = await stat(tarballPath).then(() => true).catch(() => false);
  if (!exists) {
    throw new Error(`Tarball not created at ${tarballPath}`);
  }

  log.info({ tarballPath }, 'Tarball created');
  return tarballPath;
}

// Helper to run install script
async function runInstall(ctx: TestContext, testHome: string) {
  const installScript = join(projectRoot, "bin/install.sh");
  const logs = await setupTestLogs(ctx);

  log.info({
    testName: ctx.testName,
    testHome,
    tarball: testTarballPath,
    logDir: logs.logDir
  }, 'Running install script');

  const result = await runCommandWithLogs({
    command: "bash",
    args: [installScript, "-y"], // Skip confirmation prompts in tests
    env: {
      ...process.env,
      HOME: testHome,
      FORGE_REPO: `file://${testTarballPath}`,
      FORGE_BRANCH: "",
      BUN_INSTALL_CACHE_DIR: bunCacheDir,
      // Clear FORGE_HOME so install.sh uses HOME-based default
      FORGE_HOME: "",
    },
    logDir: logs.logDir,
    logBaseName: "install",
  });

  if (result.exitCode !== 0) {
    log.error({
      exitCode: result.exitCode,
      stdoutLog: result.stdoutLog,
      stderrLog: result.stderrLog
    }, 'Install failed');
  } else {
    log.info({ exitCode: result.exitCode }, 'Install completed');
  }

  return result;
}

// Helper to run uninstall script
async function runUninstall(ctx: TestContext, testHome: string, purge = false) {
  const uninstallScript = join(projectRoot, "bin/uninstall.sh");
  const logs = await setupTestLogs(ctx);

  log.info({
    testName: ctx.testName,
    testHome,
    purge,
    logDir: logs.logDir
  }, 'Running uninstall script');

  const args = ["-y"];
  if (purge) {
    args.push("--purge");
  }

  const result = await runCommandWithLogs({
    command: "bash",
    args: [uninstallScript, ...args],
    env: {
      ...process.env,
      HOME: testHome,
      // Clear FORGE_HOME so uninstall.sh uses HOME-based default
      FORGE_HOME: "",
    },
    logDir: logs.logDir,
    logBaseName: "uninstall",
  });

  if (result.exitCode !== 0) {
    log.error({
      exitCode: result.exitCode,
      stdoutLog: result.stdoutLog,
      stderrLog: result.stderrLog
    }, 'Uninstall failed');
  } else {
    log.info({ exitCode: result.exitCode }, 'Uninstall completed');
  }

  return result;
}

describe('Installation and Uninstallation', () => {

  // Create fresh tarball before running install tests
  beforeAll(async () => {
    testTarballPath = await createTestTarball();
  });

  test("creates required directories", async (ctx) => {
    const testHome = await setupTestHome(ctx);
    const result = await runInstall(ctx, testHome);

    // Should succeed
    expect(result.exitCode).toBe(0);

    // Check that directories were created
    const forgeHome = join(testHome, ".forge");
    const binDir = join(testHome, ".local/bin");
    const forgeSymlink = join(binDir, "forge");
    const bootstrap = join(
      forgeHome,
      "node_modules/@planet57/forge/bin/forge",
    );

    // Use stat() to check directories exist
    const forgeHomeExists = await stat(forgeHome)
      .then((s) => s.isDirectory())
      .catch(() => false);
    const binDirExists = await stat(binDir)
      .then((s) => s.isDirectory())
      .catch(() => false);

    // Check bootstrap script exists in the package
    const bootstrapExists = await stat(bootstrap)
      .then((s) => s.isFile())
      .catch(() => false);

    // Check symlink exists (use lstat to not follow the link)
    const forgeIsSymlink = await lstat(forgeSymlink)
      .then((s) => s.isSymbolicLink())
      .catch(() => false);

    expect(forgeHomeExists).toBe(true);
    expect(binDirExists).toBe(true);
    expect(bootstrapExists).toBe(true);
    expect(forgeIsSymlink).toBe(true);
  }, 60000);

  test("creates working bootstrap script", async (ctx) => {
    const testHome = await setupTestHome(ctx);
    const result = await runInstall(ctx, testHome);

    // Should succeed
    expect(result.exitCode).toBe(0);

    const forgeCmd = join(testHome, ".local/bin/forge");
    const logs = await setupTestLogs(ctx);

    // Run forge --version through bootstrap
    const versionResult = await runCommandWithLogs({
      command: "bash",
      args: [forgeCmd, "--version"],
      env: { ...process.env, HOME: testHome },
      logDir: logs.logDir,
      logBaseName: "forge-version",
    });

    expect(versionResult.exitCode).toBe(0);

    // Read version output and check format
    const versionOutput = await Bun.file(
      join(logs.logDir, "forge-version-stdout.log"),
    ).text();
    expect(versionOutput.trim()).toMatch(/^forge version \d+\.\d+\.\d+/);
  }, 60000);

  test("creates meta-project package.json", async (ctx) => {
    const testHome = await setupTestHome(ctx);
    const result = await runInstall(ctx, testHome);

    // Should succeed
    expect(result.exitCode).toBe(0);

    const packageJson = join(testHome, ".local/share/forge/package.json");
    const pkg = await Bun.file(packageJson).json();

    expect(pkg.name).toBe("forge-meta");
    expect(pkg.private).toBe(true);
  }, 60000);

  test("is idempotent (can run multiple times)", async (ctx) => {
    const testHome = await setupTestHome(ctx);

    // Run install twice
    const result1 = await runInstall(ctx, testHome);
    const result2 = await runInstall(ctx, testHome);

    // Both should succeed
    expect(result1.exitCode).toBe(0);
    expect(result2.exitCode).toBe(0);

    // Bootstrap should still work
    const forgeCmd = join(testHome, ".local/bin/forge");
    const logs = await setupTestLogs(ctx);

    const versionResult = await runCommandWithLogs({
      command: "bash",
      args: [forgeCmd, "--version"],
      env: { ...process.env, HOME: testHome },
      logDir: logs.logDir,
      logBaseName: "forge-version",
    });

    expect(versionResult.exitCode).toBe(0);
  }, 120000); // 120 second timeout - runs install twice

  test("uninstall removes installation", async (ctx) => {
    const testHome = await setupTestHome(ctx);

    // First install
    const installResult = await runInstall(ctx, testHome);
    expect(installResult.exitCode).toBe(0);

    // Verify things exist
    const forgeHome = join(testHome, ".forge");
    const forgeCmd = join(testHome, ".local/bin/forge");

    expect(await stat(forgeHome).then((s) => s.isDirectory()).catch(() => false)).toBe(true);
    expect(await lstat(forgeCmd).then((s) => s.isSymbolicLink()).catch(() => false)).toBe(true);

    // Uninstall
    const uninstallResult = await runUninstall(ctx, testHome);
    expect(uninstallResult.exitCode).toBe(0);

    // Verify things are removed
    expect(await stat(forgeHome).then(() => true).catch(() => false)).toBe(false);
    expect(await stat(forgeCmd).then(() => true).catch(() => false)).toBe(false);
  }, 60000);

  test("uninstall preserves config by default", async (ctx) => {
    const testHome = await setupTestHome(ctx);

    // Install
    await runInstall(ctx, testHome);

    // Create fake config directory
    const forgeHome = join(testHome, ".forge");
    const configDir = join(forgeHome, "config");
    await mkdir(configDir, { recursive: true });
    await Bun.write(join(configDir, "config.yml"), "test: true\n");

    // Uninstall without --purge
    const result = await runUninstall(ctx, testHome, false);
    expect(result.exitCode).toBe(0);

    // Config should still exist
    expect(await stat(configDir).then((s) => s.isDirectory()).catch(() => false)).toBe(true);
    expect(await Bun.file(join(configDir, "config.yml")).text()).toBe("test: true\n");
  }, 60000);

  test("uninstall --purge removes config", async (ctx) => {
    const testHome = await setupTestHome(ctx);

    // Install
    await runInstall(ctx, testHome);

    // Create fake config directory
    const forgeHome = join(testHome, ".forge");
    const configDir = join(forgeHome, "config");
    await mkdir(configDir, { recursive: true });
    await Bun.write(join(configDir, "config.yml"), "test: true\n");

    // Uninstall with --purge
    const result = await runUninstall(ctx, testHome, true);
    expect(result.exitCode).toBe(0);

    // Config should be removed (entire FORGE_HOME removed with --purge)
    expect(await stat(forgeHome).then(() => true).catch(() => false)).toBe(false);
  }, 60000);

});
