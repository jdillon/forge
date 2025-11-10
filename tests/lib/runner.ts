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
 * Test runner for executing forge CLI in tests
 *
 * Defaults to dev mode (bin/forge-dev) for reliable testing.
 */

import { spawn } from 'child_process';
import { createWriteStream } from 'fs';
import { join, resolve } from 'path';
import type { TestEnvironment } from './test-env';
import { createLogger } from './logger';

const log = createLogger('test-runner');

// Project root for accessing bin/forge-dev
const PROJECT_ROOT = resolve(import.meta.dir, '../..');

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
  /** Test environment to use (optional - defaults to dev mode) */
  testEnv?: TestEnvironment;
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
    testEnv,
  } = config;

  // Use dev mode by default (bin/forge-dev), or test environment if provided
  const forgeBin = testEnv ? testEnv.forgeCmd : join(PROJECT_ROOT, 'bin/forge-dev');
  const workingDir = cwd;

  // Build environment
  // Default to NO_COLOR=1 for consistent test output (unless explicitly overridden)
  const forgeEnv = {
    ...process.env,
    NO_COLOR: '1', // Disable colors by default for testing
    ...env, // User env vars override (tests can re-enable colors if needed)
  };

  // Log command as copy-pasteable shell command
  const envVars: string[] = [];
  for (const [key, value] of Object.entries(env)) {
    envVars.push(`${key}="${value}"`);
  }

  const envPrefix = envVars.length > 0 ? envVars.join(' ') + ' ' : '';
  const shellCommand = `cd "${workingDir}" && ${envPrefix}${forgeBin} ${args.join(' ')}`;

  log.debug({
    mode: testEnv ? 'test-env' : 'dev',
    cwd: workingDir,
    forgeBin,
    args,
  }, 'Running forge command');

  log.debug(`Shell command: ${shellCommand}`);

  // Create log file paths
  const stdoutLog = join(logDir, `${logBaseName}-stdout.log`);
  const stderrLog = join(logDir, `${logBaseName}-stderr.log`);

  // Create file streams to capture output in real-time
  const stdoutStream = createWriteStream(stdoutLog);
  const stderrStream = createWriteStream(stderrLog);

  // Run command with spawned process
  const exitCode = await new Promise<number>((resolve) => {
    const proc = spawn(forgeBin, args, {
      env: forgeEnv,
      cwd: workingDir,
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
