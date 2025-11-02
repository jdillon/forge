/**
 * Installation script tests
 *
 * Tests the install.sh script in an isolated environment to avoid
 * mutating the user's actual home directory.
 */

import { describe, test } from "./lib/testx";
import { expect } from "bun:test";
import { mkdir, stat, lstat } from "fs/promises";
import { join } from "path";
import { homedir } from "os";
import {
  runCommandWithLogs,
  println,
  setupTestLogs,
  setupTestHome,
  TEST_DIRS,
} from "./lib/utils";
import type { TestContext } from "./lib/testx";

const projectRoot = TEST_DIRS.root;

// Use the real user's Bun cache to speed up installs
const realUserHome = homedir();
const bunCacheDir = join(realUserHome, ".bun", "install", "cache");

// Helper to run install script
async function runInstall(ctx: TestContext, testHome: string) {
  const installScript = join(projectRoot, "bin/install.sh");
  const tarballPath = join(
    projectRoot,
    "build/planet57-forge-2.0.0-alpha.1.tgz",
  );

  // Check tarball exists before attempting install
  const tarballExists = await stat(tarballPath).then(() => true).catch(() => false);
  if (!tarballExists) {
    throw new Error(
      `Tarball not found: ${tarballPath}\n` +
      `Run 'bun run pack' to create it before running install tests.`
    );
  }

  const logs = await setupTestLogs(ctx);

  println("\n=== Running install for:", ctx.testName, "===");
  println("Test home:", testHome);
  println("Logs:", logs.logDir);

  const result = await runCommandWithLogs({
    command: "bash",
    args: [installScript, "-y"], // Skip confirmation prompts in tests
    env: {
      ...process.env,
      HOME: testHome,
      FORGE_REPO: `file://${tarballPath}`,
      FORGE_BRANCH: "",
      BUN_INSTALL_CACHE_DIR: bunCacheDir,
    },
    logDir: logs.logDir,
    logBaseName: "install",
  });

  println("Exit code:", result.exitCode);

  if (result.exitCode !== 0) {
    console.error("Install failed - check logs:");
    console.error("  stdout:", result.stdoutLog);
    console.error("  stderr:", result.stderrLog);
  }

  return result;
}

// Helper to run uninstall script
async function runUninstall(ctx: TestContext, testHome: string, purge = false) {
  const uninstallScript = join(projectRoot, "bin/uninstall.sh");
  const logs = await setupTestLogs(ctx);

  println("\n=== Running uninstall for:", ctx.testName, "===");
  println("Test home:", testHome);
  println("Purge:", purge);
  println("Logs:", logs.logDir);

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
    },
    logDir: logs.logDir,
    logBaseName: "uninstall",
  });

  println("Exit code:", result.exitCode);

  if (result.exitCode !== 0) {
    console.error("Uninstall failed - check logs:");
    console.error("  stdout:", result.stdoutLog);
    console.error("  stderr:", result.stderrLog);
  }

  return result;
}

describe('Installation and Uninstallation', () => {

  test("creates required directories", async (ctx) => {
    const testHome = await setupTestHome(ctx);
    const result = await runInstall(ctx, testHome);

    // Should succeed
    expect(result.exitCode).toBe(0);

    // Check that directories were created
    const shareDir = join(testHome, ".local/share/forge");
    const binDir = join(testHome, ".local/bin");
    const forgeSymlink = join(binDir, "forge");
    const bootstrap = join(
      shareDir,
      "node_modules/@planet57/forge/bin/forge",
    );

    // Use stat() to check directories exist
    const shareDirExists = await stat(shareDir)
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

    expect(shareDirExists).toBe(true);
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
    expect(versionOutput.trim()).toMatch(/^\d+\.\d+\.\d+/);
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
    const dataDir = join(testHome, ".local/share/forge");
    const forgeCmd = join(testHome, ".local/bin/forge");

    expect(await stat(dataDir).then((s) => s.isDirectory()).catch(() => false)).toBe(true);
    expect(await lstat(forgeCmd).then((s) => s.isSymbolicLink()).catch(() => false)).toBe(true);

    // Uninstall
    const uninstallResult = await runUninstall(ctx, testHome);
    expect(uninstallResult.exitCode).toBe(0);

    // Verify things are removed
    expect(await stat(dataDir).then(() => true).catch(() => false)).toBe(false);
    expect(await stat(forgeCmd).then(() => true).catch(() => false)).toBe(false);
  }, 60000);

  test("uninstall preserves config by default", async (ctx) => {
    const testHome = await setupTestHome(ctx);

    // Install
    await runInstall(ctx, testHome);

    // Create fake config directory
    const configDir = join(testHome, ".config/forge");
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
    const configDir = join(testHome, ".config/forge");
    await mkdir(configDir, { recursive: true });
    await Bun.write(join(configDir, "config.yml"), "test: true\n");

    // Uninstall with --purge
    const result = await runUninstall(ctx, testHome, true);
    expect(result.exitCode).toBe(0);

    // Config should be removed
    expect(await stat(configDir).then(() => true).catch(() => false)).toBe(false);
  }, 60000);

});
