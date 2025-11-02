/**
 * Tests for CLI help output
 */

import { describe, test } from './lib/testx';
import { expect } from 'bun:test';
import { setupTestLogs, TEST_DIRS } from './lib/utils';
import { runForge } from './lib/runner';
import { join } from 'path';

describe('CLI Help Output', () => {
  const projectRoot = join(TEST_DIRS.fixtures, 'test-project');

  test('should display help with --help', async (ctx) => {
    const logs = await setupTestLogs(ctx);

    const result = await runForge({
      args: ['--root', projectRoot, '--help'],
      logDir: logs.logDir,
      logBaseName: logs.logBaseName,
    });

    expect(result.exitCode).toBe(0);
    const output = await Bun.file(result.stdoutLog).text();
    expect(output).toContain('Usage: forge');
    expect(output).toContain('Modern CLI framework');
    expect(output).toContain('Options:');
    expect(output).toContain('Commands:');
  });

  test('should display help with -h', async (ctx) => {
    const logs = await setupTestLogs(ctx);

    const result = await runForge({
      args: ['--root', projectRoot, '-h'],
      logDir: logs.logDir,
      logBaseName: logs.logBaseName,
    });

    expect(result.exitCode).toBe(0);
    const output = await Bun.file(result.stdoutLog).text();
    expect(output).toContain('Usage: forge');
  });

  test('should show all core options', async (ctx) => {
    const logs = await setupTestLogs(ctx);

    const result = await runForge({
      args: ['--root', projectRoot, '--help'],
      logDir: logs.logDir,
      logBaseName: logs.logBaseName,
    });

    const output = await Bun.file(result.stdoutLog).text();
    expect(output).toContain('--debug');
    expect(output).toContain('--quiet');
    expect(output).toContain('--silent');
    expect(output).toContain('--log-level');
    expect(output).toContain('--log-format');
    expect(output).toContain('--no-color');
    expect(output).toContain('--root');
  });

  test('should show version with --version', async (ctx) => {
    const logs = await setupTestLogs(ctx);

    const result = await runForge({
      args: ['--version'],
      logDir: logs.logDir,
      logBaseName: logs.logBaseName,
    });

    expect(result.exitCode).toBe(0);
    const output = await Bun.file(result.stdoutLog).text();
    expect(output).toMatch(/\d+\.\d+\.\d+/); // version pattern
  });

  test('should show version with -V', async (ctx) => {
    const logs = await setupTestLogs(ctx);

    const result = await runForge({
      args: ['-V'],
      logDir: logs.logDir,
      logBaseName: logs.logBaseName,
    });

    expect(result.exitCode).toBe(0);
    const output = await Bun.file(result.stdoutLog).text();
    expect(output).toMatch(/\d+\.\d+\.\d+/);
  });

  test('should show terse error for unknown options', async (ctx) => {
    const logs = await setupTestLogs(ctx);

    const result = await runForge({
      args: ['--root', projectRoot, '--invalid-option'],
      logDir: logs.logDir,
      logBaseName: logs.logBaseName,
    });

    expect(result.exitCode).toBe(1);
    const stderr = await Bun.file(result.stderrLog).text();
    const stdout = await Bun.file(result.stdoutLog).text();
    expect(stderr).toContain('ERROR: unknown option');
    expect(stderr).toContain("Try 'forge --help' for more information");
    // Spec says: terse error only, no help dump
    expect(stdout).toBe('');
  });

  test('should list commands in help output', async (ctx) => {
    const logs = await setupTestLogs(ctx);

    const result = await runForge({
      args: ['--root', projectRoot, '--help'],
      logDir: logs.logDir,
      logBaseName: logs.logBaseName,
    });

    const output = await Bun.file(result.stdoutLog).text();
    expect(output).toContain('test');
  });

  test('should sort options alphabetically', async (ctx) => {
    const logs = await setupTestLogs(ctx);

    const result = await runForge({
      args: ['--root', projectRoot, '--help'],
      logDir: logs.logDir,
      logBaseName: logs.logBaseName,
    });

    const output = await Bun.file(result.stdoutLog).text();
    // Check that options appear in sorted order
    const debugPos = output.indexOf('--debug');
    const logFormatPos = output.indexOf('--log-format');
    const quietPos = output.indexOf('--quiet');

    expect(debugPos).toBeLessThan(logFormatPos);
    expect(logFormatPos).toBeLessThan(quietPos);
  });
});
