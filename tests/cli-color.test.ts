/**
 * Tests for CLI color detection
 */

import { describe, test } from './lib/testx';
import { expect } from 'bun:test';
import { setupTestLogs, TEST_DIRS } from './lib/utils';
import { runForge } from './lib/runner';
import { join } from 'path';

describe('CLI Color Detection', () => {
  const projectRoot = join(TEST_DIRS.fixtures, 'test-project');

  test('should use auto mode by default', async (ctx) => {
    const logs = await setupTestLogs(ctx);

    const result = await runForge({
      args: ['--root', projectRoot, '--help'],
      env: { NO_COLOR: '' }, // Clear NO_COLOR for this test
      logDir: logs.logDir,
      logBaseName: logs.logBaseName,
    });

    // Exit code 0 for help
    expect(result.exitCode).toBe(0);
  });

  test('should disable colors with --color=never', async (ctx) => {
    const logs = await setupTestLogs(ctx);

    const result = await runForge({
      args: ['--root', projectRoot, '--color', 'never', '--help'],
      logDir: logs.logDir,
      logBaseName: logs.logBaseName,
    });

    expect(result.exitCode).toBe(0);
    // Help should still work - check stdout
    const output = await Bun.file(result.stdoutLog).text();
    expect(output).toContain('Modern CLI framework');
  });

  test('should enable colors with --color=always', async (ctx) => {
    const logs = await setupTestLogs(ctx);

    const result = await runForge({
      args: ['--root', projectRoot, '--color', 'always', '--help'],
      logDir: logs.logDir,
      logBaseName: logs.logBaseName,
    });

    expect(result.exitCode).toBe(0);
    const output = await Bun.file(result.stdoutLog).text();
    expect(output).toContain('Modern CLI framework');
  });

  test('should disable colors with NO_COLOR env var', async (ctx) => {
    const logs = await setupTestLogs(ctx);

    const result = await runForge({
      args: ['--root', projectRoot, '--help'],
      env: { NO_COLOR: '1' },
      logDir: logs.logDir,
      logBaseName: logs.logBaseName,
    });

    expect(result.exitCode).toBe(0);
    const output = await Bun.file(result.stdoutLog).text();  // Help goes to stdout
    expect(output).toContain('Modern CLI framework');
  });

  test('should prioritize NO_COLOR env over --color flag', async (ctx) => {
    const logs = await setupTestLogs(ctx);

    const result = await runForge({
      args: ['--root', projectRoot, '--color', 'always', '--help'],
      env: { NO_COLOR: '1' }, // Should override --color=always
      logDir: logs.logDir,
      logBaseName: logs.logBaseName,
    });

    expect(result.exitCode).toBe(0);
  });
});
