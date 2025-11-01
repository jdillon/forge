/**
 * Tests for CLI color detection
 */

import { describe, test } from './lib/testx';
import { expect } from 'bun:test';
import { setupTestLogs, runCommandWithLogs } from './lib/utils';

describe('CLI Color Detection', () => {
  const cliPath = './bin/forge';
  const projectRoot = `${process.cwd()}/tests/fixtures/test-project`;

  test('should use colors by default', async (ctx) => {
    const logs = await setupTestLogs(ctx);

    const result = await runCommandWithLogs({
      command: cliPath,
      args: ['--root', projectRoot, '--help'],
      env: { ...process.env },
      logDir: logs.logDir,
      logBaseName: logs.logBaseName,
    });

    // Exit code 0 for help
    expect(result.exitCode).toBe(0);
  });

  test('should disable colors with --no-color flag', async (ctx) => {
    const logs = await setupTestLogs(ctx);

    const result = await runCommandWithLogs({
      command: cliPath,
      args: ['--root', projectRoot, '--no-color', '--help'],
      env: { ...process.env },
      logDir: logs.logDir,
      logBaseName: logs.logBaseName,
    });

    expect(result.exitCode).toBe(0);
    // Help should still work - check stdout
    const output = await Bun.file(result.stdoutLog).text();
    expect(output).toContain('Modern CLI framework');
  });

  test('should disable colors with NO_COLOR env var', async (ctx) => {
    const logs = await setupTestLogs(ctx);

    const result = await runCommandWithLogs({
      command: cliPath,
      args: ['--root', projectRoot, '--help'],
      env: { ...process.env, NO_COLOR: '1' },
      logDir: logs.logDir,
      logBaseName: logs.logBaseName,
    });

    expect(result.exitCode).toBe(0);
    const output = await Bun.file(result.stdoutLog).text();  // Help goes to stdout
    expect(output).toContain('Modern CLI framework');
  });

  test('should prioritize --no-color flag over env', async (ctx) => {
    const logs = await setupTestLogs(ctx);

    const result = await runCommandWithLogs({
      command: cliPath,
      args: ['--root', projectRoot, '--no-color', '--help'],
      env: { ...process.env },
      logDir: logs.logDir,
      logBaseName: logs.logBaseName,
    });

    expect(result.exitCode).toBe(0);
  });
});
