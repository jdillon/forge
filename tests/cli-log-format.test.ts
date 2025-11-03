/**
 * Tests for --log-format validation
 */

import { describe, test } from './lib/testx';
import { expect } from 'bun:test';
import { setupTestLogs, TEST_DIRS } from './lib/utils';
import { runForge } from './lib/runner';
import { join } from 'path';

describe('CLI --log-format Validation', () => {
  const projectRoot = join(TEST_DIRS.fixtures, 'test-project');

  test('should accept "json" format', async (ctx) => {
    const logs = await setupTestLogs(ctx);

    const result = await runForge({
      args: ['--root', projectRoot, '--log-format', 'json', 'test', 'greet'],
      logDir: logs.logDir,
      logBaseName: logs.logBaseName,
    });

    // Should succeed
    expect(result.exitCode).toBe(0);
    const output = await Bun.file(result.stderrLog).text();
    // JSON format should output structured logs to stderr
    expect(output).toContain('"level"');
  });

  test('should accept "pretty" format', async (ctx) => {
    const logs = await setupTestLogs(ctx);

    const result = await runForge({
      args: ['--root', projectRoot, '--log-format', 'pretty', 'test', 'greet'],
      logDir: logs.logDir,
      logBaseName: logs.logBaseName,
    });

    // Should succeed
    expect(result.exitCode).toBe(0);
  });

  test('should reject invalid format "plain"', async (ctx) => {
    const logs = await setupTestLogs(ctx);

    const result = await runForge({
      args: ['--root', projectRoot, '--log-format', 'plain', 'test', 'greet'],
      logDir: logs.logDir,
      logBaseName: logs.logBaseName,
    });

    // Should fail
    expect(result.exitCode).toBe(1);
    const stderr = await Bun.file(result.stderrLog).text();
    expect(stderr).toContain('invalid');
    expect(stderr).toContain('Allowed choices');
  });

  test('should reject invalid format "xyz"', async (ctx) => {
    const logs = await setupTestLogs(ctx);

    const result = await runForge({
      args: ['--root', projectRoot, '--log-format', 'xyz', 'test', 'greet'],
      logDir: logs.logDir,
      logBaseName: logs.logBaseName,
    });

    // Should fail
    expect(result.exitCode).toBe(1);
    const stderr = await Bun.file(result.stderrLog).text();
    expect(stderr).toContain('invalid');
    expect(stderr).toContain('Allowed choices');
  });

  test('should reject numeric format "123"', async (ctx) => {
    const logs = await setupTestLogs(ctx);

    const result = await runForge({
      args: ['--root', projectRoot, '--log-format', '123', 'test', 'greet'],
      logDir: logs.logDir,
      logBaseName: logs.logBaseName,
    });

    // Should fail
    expect(result.exitCode).toBe(1);
    const stderr = await Bun.file(result.stderrLog).text();
    expect(stderr).toContain('invalid');
  });

  test('should show valid formats in error message', async (ctx) => {
    const logs = await setupTestLogs(ctx);

    const result = await runForge({
      args: ['--root', projectRoot, '--log-format', 'invalid', 'test', 'greet'],
      logDir: logs.logDir,
      logBaseName: logs.logBaseName,
    });

    expect(result.exitCode).toBe(1);
    const stderr = await Bun.file(result.stderrLog).text();
    expect(stderr).toContain('json');
    expect(stderr).toContain('pretty');
  });

  test('should use pretty format by default', async (ctx) => {
    const logs = await setupTestLogs(ctx);

    const result = await runForge({
      args: ['--root', projectRoot, 'test', 'greet'],
      logDir: logs.logDir,
      logBaseName: logs.logBaseName,
    });

    expect(result.exitCode).toBe(0);
    const output = await Bun.file(result.stdoutLog).text();
    // Pretty format should have timestamps and human-readable output
    expect(output).toMatch(/\d{2}:\d{2}:\d{2}/); // timestamp pattern
  });
});
