/**
 * Installation script tests
 *
 * Tests the install.sh script in an isolated environment to avoid
 * mutating the user's actual home directory.
 */

import { test, expect, beforeEach, afterEach } from "bun:test";
import { mkdtemp, mkdir, stat, lstat } from "fs/promises";
import { join } from "path";
import { homedir } from "os";
import {
  runCommandWithLogs,
  println,
  setupTestLogs,
  TEST_DIRS,
} from "./test-utils";

const projectRoot = join(import.meta.dir, "..");

// Use the real user's Bun cache to speed up installs
const realUserHome = homedir();
const bunCacheDir = join(realUserHome, ".bun", "install", "cache");

let testHome: string;
let originalHome: string | undefined;

// Helper to run install script
async function runInstall(testName: string) {
  const installScript = join(projectRoot, "bin/install.sh");
  const tarballPath = join(
    projectRoot,
    "build/planet57-forge-2.0.0-alpha.1.tgz",
  );

  const logs = await setupTestLogs("install.sh", testName);

  println("\n=== Running install for:", testName, "===");
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

beforeEach(async () => {
  // Ensure test tmp directory exists
  await mkdir(TEST_DIRS.tmp, { recursive: true });

  // Create isolated test home directory under build/test-tmp/
  testHome = await mkdtemp(join(TEST_DIRS.tmp, "home-"));
  originalHome = process.env.HOME;
});

afterEach(async () => {
  // Restore original HOME
  if (originalHome !== undefined) {
    process.env.HOME = originalHome;
  }

  // NOTE: No automatic cleanup - use "bun run clean" to clean build artifacts
  // This avoids slow cleanup and allows inspection of test output
});

test("creates required directories", async () => {
  const result = await runInstall("creates required directories");

  // Should succeed
  expect(result.exitCode).toBe(0);

  // Check that directories were created
  const shareDir = join(testHome, ".local/share/forge");
  const binDir = join(testHome, ".local/bin");
  const forgeSymlink = join(binDir, "forge");
  const bootstrap = join(
    shareDir,
    "node_modules/@planet57/forge/bin/forge-bootstrap",
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

test("creates working bootstrap script", async () => {
  const result = await runInstall("creates working bootstrap script");

  // Should succeed
  expect(result.exitCode).toBe(0);

  const forgeCmd = join(testHome, ".local/bin/forge");
  const logs = await setupTestLogs("install.sh", "forge-version-check");

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

test("creates meta-project package.json", async () => {
  const result = await runInstall("creates meta-project package.json");

  // Should succeed
  expect(result.exitCode).toBe(0);

  const packageJson = join(testHome, ".local/share/forge/package.json");
  const pkg = await Bun.file(packageJson).json();

  expect(pkg.name).toBe("forge-meta");
  expect(pkg.private).toBe(true);
}, 60000);

test("is idempotent (can run multiple times)", async () => {
  // Run install twice
  const result1 = await runInstall("idempotent-run1");
  const result2 = await runInstall("idempotent-run2");

  // Both should succeed
  expect(result1.exitCode).toBe(0);
  expect(result2.exitCode).toBe(0);

  // Bootstrap should still work
  const forgeCmd = join(testHome, ".local/bin/forge");
  const logs = await setupTestLogs("install.sh", "idempotent-version-check");

  const versionResult = await runCommandWithLogs({
    command: "bash",
    args: [forgeCmd, "--version"],
    env: { ...process.env, HOME: testHome },
    logDir: logs.logDir,
    logBaseName: "forge-version",
  });

  expect(versionResult.exitCode).toBe(0);
}, 120000); // 120 second timeout - runs install twice
