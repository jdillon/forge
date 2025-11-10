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
 * Tests for subcommand option parsing
 *
 * This test demonstrates the bug where subcommand options
 * (defined via defineCommand) are not being parsed correctly.
 */

import { describe, test } from './lib/testx';
import { expect } from 'bun:test';
import { setupTestLogs, TEST_DIRS } from './lib/utils';
import { runForge } from './lib/runner';
import { join } from 'path';

describe('Subcommand Options', () => {
  const projectRoot = join(TEST_DIRS.fixtures, 'test-project');

  test('should parse subcommand flags (--loud)', async (ctx) => {
    const logs = await setupTestLogs(ctx);

    const result = await runForge({
      args: ['--root', projectRoot, 'test', 'greet', 'Alice', '--loud'],
      logDir: logs.logDir,
      logBaseName: logs.logBaseName,
    });

    expect(result.exitCode).toBe(0);
    const output = await Bun.file(result.stdoutLog).text();
    expect(output).toContain('HELLO, ALICE!');
  });

  test('should parse subcommand short flags (-l)', async (ctx) => {
    const logs = await setupTestLogs(ctx);

    const result = await runForge({
      args: ['--root', projectRoot, 'test', 'greet', 'Bob', '-l'],
      logDir: logs.logDir,
      logBaseName: logs.logBaseName,
    });

    expect(result.exitCode).toBe(0);
    const output = await Bun.file(result.stdoutLog).text();
    expect(output).toContain('HELLO, BOB!');
  });

  test('should work without flags', async (ctx) => {
    const logs = await setupTestLogs(ctx);

    const result = await runForge({
      args: ['--root', projectRoot, 'test', 'greet', 'Charlie'],
      logDir: logs.logDir,
      logBaseName: logs.logBaseName,
    });

    expect(result.exitCode).toBe(0);
    const output = await Bun.file(result.stdoutLog).text();
    expect(output).toContain('Hello, Charlie!');
  });

  test('should work with no arguments', async (ctx) => {
    const logs = await setupTestLogs(ctx);

    const result = await runForge({
      args: ['--root', projectRoot, 'test', 'greet'],
      logDir: logs.logDir,
      logBaseName: logs.logBaseName,
    });

    expect(result.exitCode).toBe(0);
    const output = await Bun.file(result.stdoutLog).text();
    expect(output).toContain('Hello, World!');
  });
});
