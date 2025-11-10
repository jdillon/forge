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
 * Test utilities for running commands with captured output
 */

import { spawn } from "child_process";
import { createWriteStream } from "fs";
import { join } from "path";
import { mkdir } from "fs/promises";
import type { TestContext } from "./testx";

// Check for verbose mode via environment variable
const VERBOSE = process.env.VERBOSE === "1" || process.env.TEST_VERBOSE === "1";

// Test output directories
// import.meta.dir is tests/lib/, so we need to go up two levels to reach project root
const projectRoot = join(import.meta.dir, "../..");
export const TEST_DIRS = {
  /** Project root directory */
  root: projectRoot,
  /** Build directory */
  build: join(projectRoot, "build"),
  /** Test fixtures directory (test data, mock projects) */
  fixtures: join(projectRoot, "tests", "fixtures"),
  /** HTML/XML test reports (junit, coverage, etc) */
  reports: join(projectRoot, "build", "test-reports"),
  /** Temporary files during test execution (test homes, sandboxes) */
  tmp: join(projectRoot, "build", "test-tmp"),
  /** Log files from commands run during tests */
  logs: join(projectRoot, "build", "test-logs"),
  /** Isolated node_modules for test dependencies */
  nodeModules: join(projectRoot, "build", "test-node_modules"),
};

/**
 * Normalize a test/describe name to a filesystem-safe string.
 * Converts to lowercase, replaces spaces with hyphens, removes special chars.
 *
 * @example
 * normalizeName("install.sh creates required directories") => "install-sh-creates-required-directories"
 */
export function normalizeName(name: string): string {
  return name
    .toLowerCase()
    .replace(/\./g, "-") // dots to hyphens
    .replace(/\s+/g, "-") // spaces to hyphens
    .replace(/[^a-z0-9-_]/g, "") // remove special chars
    .replace(/-+/g, "-") // collapse multiple hyphens
    .replace(/^-|-$/g, ""); // trim hyphens
}

/**
 * Create and return paths for a test's log directory.
 *
 * Can be called two ways:
 * 1. With TestContext from test extension: setupTestLogs(ctx)
 * 2. With manual strings (legacy): setupTestLogs("group-name", "test-name")
 *
 * When using TestContext:
 * - Directory: build/test-logs/<normalized-file-name>/
 * - Log base name: <normalized-test-name>
 *
 * @example
 * // With TestContext (from lib/testx.ts)
 * test('should display help', async (ctx) => {
 *   const logs = await setupTestLogs(ctx);
 *   // logs.logDir = "build/test-logs/cli-help-test-ts/"
 *   // Use: runCommandWithLogs({ logDir: logs.logDir, logBaseName: logs.logBaseName })
 * });
 *
 * @example
 * // Legacy manual strings
 * const logs = await setupTestLogs("install.sh", "creates required directories");
 * // logs.logDir = "build/test-logs/install-sh/"
 */
export async function setupTestLogs(
  ctxOrGroupName: TestContext | string,
  testName?: string
) {
  let logDir: string;
  let logBaseName: string;

  if (typeof ctxOrGroupName === 'string') {
    // Legacy: manual strings
    const groupName = ctxOrGroupName;
    const normalizedGroup = normalizeName(groupName);
    logDir = join(TEST_DIRS.logs, normalizedGroup);
    logBaseName = testName ? normalizeName(testName) : 'output';
  } else {
    // New: TestContext
    const ctx = ctxOrGroupName;
    // Strip .test.ts or .test.js extension from filename
    const fileNameWithoutExt = ctx.fileName.replace(/\.test\.[tj]s$/, '');
    const normalizedFileName = normalizeName(fileNameWithoutExt);
    logDir = join(TEST_DIRS.logs, normalizedFileName);
    logBaseName = normalizeName(ctx.testName);
  }

  await mkdir(logDir, { recursive: true });

  return {
    logDir,
    logBaseName,
  };
}

/**
 * Create and return an isolated test home directory with a descriptive name.
 *
 * Uses TestContext to create a unique, readable directory name based on the
 * test file and test name.
 *
 * Directory pattern: build/test-tmp/<normalized-file-name>/<normalized-test-name>/
 *
 * @example
 * test('creates required directories', async (ctx) => {
 *   const testHome = await setupTestHome(ctx);
 *   // testHome = "build/test-tmp/install/creates-required-directories/"
 *   // Use as: env: { HOME: testHome }
 * });
 */
export async function setupTestHome(ctx: TestContext): Promise<string> {
  // Strip .test.ts or .test.js extension from filename
  const fileNameWithoutExt = ctx.fileName.replace(/\.test\.[tj]s$/, '');
  const normalizedFileName = normalizeName(fileNameWithoutExt);
  const normalizedTestName = normalizeName(ctx.testName);

  const testHome = join(TEST_DIRS.tmp, normalizedFileName, normalizedTestName);
  await mkdir(testHome, { recursive: true });

  return testHome;
}

/**
 * Print a line only in verbose mode.
 * Use this instead of console.log in tests to keep output clean by default.
 *
 * Enable verbose mode: VERBOSE=1 bun test
 */
export function println(...args: any[]) {
  if (VERBOSE) {
    console.log(...args);
  }
}

export interface RunCommandOptions {
  /** Command to run */
  command: string;
  /** Command arguments */
  args: string[];
  /** Environment variables */
  env?: NodeJS.ProcessEnv;
  /** Directory to save log files */
  logDir: string;
  /** Base name for log files (default: "output") */
  logBaseName?: string;
  /** Show output on console in real-time (default: false, set VERBOSE=1 to enable) */
  teeToConsole?: boolean;
}

export interface RunCommandResult {
  /** Exit code from the command */
  exitCode: number;
  /** Path to stdout log file */
  stdoutLog: string;
  /** Path to stderr log file */
  stderrLog: string;
}

/**
 * Run a command and stream output to both log files and console in real-time.
 *
 * This ensures you can see output as it happens, and logs are preserved even
 * if the command hangs or times out.
 *
 * @example
 * ```typescript
 * const result = await runCommandWithLogs({
 *   command: "bash",
 *   args: ["install.sh"],
 *   env: { HOME: testHome, FORGE_REPO: "..." },
 *   logDir: testHome,
 *   logBaseName: "install",
 * });
 *
 * expect(result.exitCode).toBe(0);
 * // Logs available at: result.stdoutLog, result.stderrLog
 * ```
 */
export async function runCommandWithLogs(
  options: RunCommandOptions,
): Promise<RunCommandResult> {
  const {
    command,
    args,
    env = process.env,
    logDir,
    logBaseName = "output",
    teeToConsole = VERBOSE, // Default to verbose mode setting
  } = options;

  // Create log file paths
  const stdoutLog = join(logDir, `${logBaseName}-stdout.log`);
  const stderrLog = join(logDir, `${logBaseName}-stderr.log`);

  // Create file streams to capture output in real-time
  const stdoutStream = createWriteStream(stdoutLog);
  const stderrStream = createWriteStream(stderrLog);

  // Run command with spawned process
  const exitCode = await new Promise<number>((resolve) => {
    const proc = spawn(command, args, { env });

    // Tee output to both files AND console in real-time
    proc.stdout.on("data", (chunk) => {
      stdoutStream.write(chunk);
      if (teeToConsole) {
        process.stdout.write(chunk);
      }
    });

    proc.stderr.on("data", (chunk) => {
      stderrStream.write(chunk);
      if (teeToConsole) {
        process.stderr.write(chunk);
      }
    });

    proc.on("close", (code) => {
      stdoutStream.end();
      stderrStream.end();
      resolve(code ?? 1);
    });

    proc.on("error", (err) => {
      console.error("Process error:", err);
      stdoutStream.end();
      stderrStream.end();
      resolve(1);
    });
  });

  return {
    exitCode,
    stdoutLog,
    stderrLog,
  };
}
