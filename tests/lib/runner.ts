/**
 * Test runner for executing local forge CLI
 *
 * Runs local lib/cli.ts with proper environment (NODE_PATH, etc.)
 * instead of installed version. Enables fast test-driven development
 * without needing `bun reinstall` after every change.
 */

import { spawn } from 'child_process';
import { createWriteStream } from 'fs';
import { join } from 'path';
import { getForgePaths } from '../../lib/xdg';

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

  // Get forge home path (like bin/forge does)
  const forgeHome = getForgePaths().data; // ~/.local/share/forge
  const nodeModules = join(forgeHome, 'node_modules');

  // Build environment like bin/forge wrapper does
  const testEnv = {
    ...process.env,
    ...env,
    // Set NODE_PATH for module resolution (critical for shared dependencies)
    NODE_PATH: nodeModules + (process.env.NODE_PATH ? `:${process.env.NODE_PATH}` : ''),
  };

  // Path to local CLI (not installed version)
  const projectRoot = join(__dirname, '..', '..');
  const cliPath = join(projectRoot, 'lib', 'cli.ts');

  // Create log file paths
  const stdoutLog = join(logDir, `${logBaseName}-stdout.log`);
  const stderrLog = join(logDir, `${logBaseName}-stderr.log`);

  // Create file streams to capture output in real-time
  const stdoutStream = createWriteStream(stdoutLog);
  const stderrStream = createWriteStream(stderrLog);

  // Run command with spawned process
  const exitCode = await new Promise<number>((resolve) => {
    const proc = spawn('bun', ['run', cliPath, ...args], {
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
