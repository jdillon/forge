/**
 * Test runner for executing local forge CLI
 *
 * Runs local bin/forge bootstrap script which handles dev mode detection
 * and environment setup (FORGE_NODE_MODULES, NODE_PATH). Enables fast
 * test-driven development without needing `bun reinstall` after every change.
 */

import { spawn } from 'child_process';
import { createWriteStream } from 'fs';
import { join } from 'path';
import { TEST_DIRS } from './utils';

/**
 * Configuration for running forge in tests
 */
export interface RunForgeConfig {
  /** CLI arguments to pass to forge */
  args: string[];
  /** Environment variables (merged with process.env) */
  env?: Record<string, string>;
  /** Working directory for command execution */
  cwd?: string;
  /** Directory to save log files */
  logDir: string;
  /** Base name for log files (creates <name>-stdout.log and <name>-stderr.log) */
  logBaseName?: string;
  /** Show output on console in real-time (default: false) */
  teeToConsole?: boolean;
}

/**
 * Result from running forge
 */
export interface RunForgeResult {
  /** Exit code from the command */
  exitCode: number;
  /** Path to stdout log file */
  stdoutLog: string;
  /** Path to stderr log file */
  stderrLog: string;
}

/**
 * Run local forge CLI with test configuration
 *
 * @example
 * ```typescript
 * const result = await runForge({
 *   args: ['--root', fixtureRoot, 'test', 'context', outputFile],
 *   env: { FORGE_DEBUG: '1' },
 *   logDir: logs.logDir,
 *   logBaseName: 'my-test',
 * });
 *
 * expect(result.exitCode).toBe(0);
 * const stdout = await Bun.file(result.stdoutLog).text();
 * ```
 */
export async function runForge(config: RunForgeConfig): Promise<RunForgeResult> {
  const {
    args,
    env = {},
    cwd = process.cwd(),
    logDir,
    logBaseName = 'output',
    teeToConsole = false,
  } = config;

  // Path to bootstrap script (handles dev mode detection and env setup)
  const forgeBin = join(TEST_DIRS.root, 'bin', 'forge');

  // For tests, use isolated test node_modules unless overridden
  // This keeps tests isolated from project dependencies
  const testNodeModules = TEST_DIRS.nodeModules;

  // Build environment - tests get explicit control over FORGE_NODE_MODULES
  const testEnv = {
    ...process.env,
    // Set FORGE_NODE_MODULES for tests (can be overridden via env param)
    FORGE_NODE_MODULES: testNodeModules,
    ...env, // env overrides come last
  };

  // Create log file paths
  const stdoutLog = join(logDir, `${logBaseName}-stdout.log`);
  const stderrLog = join(logDir, `${logBaseName}-stderr.log`);

  // Create file streams to capture output in real-time
  const stdoutStream = createWriteStream(stdoutLog);
  const stderrStream = createWriteStream(stderrLog);

  // Run command with spawned process
  const exitCode = await new Promise<number>((resolve) => {
    const proc = spawn(forgeBin, args, {
      env: testEnv,
      cwd,
    });

    // Tee output to both files AND console in real-time
    proc.stdout.on('data', (chunk) => {
      stdoutStream.write(chunk);
      if (teeToConsole) {
        process.stdout.write(chunk);
      }
    });

    proc.stderr.on('data', (chunk) => {
      stderrStream.write(chunk);
      if (teeToConsole) {
        process.stderr.write(chunk);
      }
    });

    proc.on('close', (code) => {
      stdoutStream.end();
      stderrStream.end();
      resolve(code ?? 1);
    });

    proc.on('error', (err) => {
      console.error('Process error:', err);
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
