/**
 * Tests for subcommand option parsing
 *
 * This test demonstrates the bug where subcommand options
 * (defined via defineCommand) are not being parsed correctly.
 */

import { describe, test } from './lib/testx';
import { expect } from 'bun:test';
import { setupTestLogs, runCommandWithLogs, TEST_DIRS } from './lib/utils';
import { join } from 'path';

describe('Subcommand Options', () => {
  const cliPath = './bin/forge';
  const projectRoot = join(TEST_DIRS.fixtures, 'test-project');

  test('should parse subcommand flags (--loud)', async (ctx) => {
    const logs = await setupTestLogs(ctx);

    const result = await runCommandWithLogs({
      command: cliPath,
      args: ['--root', projectRoot, 'test', 'greet', 'Alice', '--loud'],
      env: { ...process.env },
      logDir: logs.logDir,
      logBaseName: logs.logBaseName,
    });

    expect(result.exitCode).toBe(0);
    const output = await Bun.file(result.stdoutLog).text();
    expect(output).toContain('HELLO, ALICE!');
  });

  test('should parse subcommand short flags (-l)', async (ctx) => {
    const logs = await setupTestLogs(ctx);

    const result = await runCommandWithLogs({
      command: cliPath,
      args: ['--root', projectRoot, 'test', 'greet', 'Bob', '-l'],
      env: { ...process.env },
      logDir: logs.logDir,
      logBaseName: logs.logBaseName,
    });

    expect(result.exitCode).toBe(0);
    const output = await Bun.file(result.stdoutLog).text();
    expect(output).toContain('HELLO, BOB!');
  });

  test('should work without flags', async (ctx) => {
    const logs = await setupTestLogs(ctx);

    const result = await runCommandWithLogs({
      command: cliPath,
      args: ['--root', projectRoot, 'test', 'greet', 'Charlie'],
      env: { ...process.env },
      logDir: logs.logDir,
      logBaseName: logs.logBaseName,
    });

    expect(result.exitCode).toBe(0);
    const output = await Bun.file(result.stdoutLog).text();
    expect(output).toContain('Hello, Charlie!');
  });

  test('should work with no arguments', async (ctx) => {
    const logs = await setupTestLogs(ctx);

    const result = await runCommandWithLogs({
      command: cliPath,
      args: ['--root', projectRoot, 'test', 'greet'],
      env: { ...process.env },
      logDir: logs.logDir,
      logBaseName: logs.logBaseName,
    });

    expect(result.exitCode).toBe(0);
    const output = await Bun.file(result.stdoutLog).text();
    expect(output).toContain('Hello, World!');
  });
});
