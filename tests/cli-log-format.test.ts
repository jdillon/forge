/**
 * Tests for --log-format validation
 */

import { describe, test, expect } from 'bun:test';
import { spawnSync } from 'bun';

describe('CLI --log-format Validation', () => {
  const cliPath = './bin/forge2';
  const projectRoot = `${process.cwd()}/tests/fixtures/test-project`;

  test('should accept "json" format', () => {
    const result = spawnSync([
      cliPath,
      '--root', projectRoot,
      '--log-format', 'json',
      'test', 'greet'
    ], {
      env: { ...process.env },
    });

    // Should succeed
    expect(result.exitCode).toBe(0);
    const output = result.stdout.toString();
    // JSON format should output structured logs
    expect(output).toContain('"level"');
  });

  test('should accept "pretty" format', () => {
    const result = spawnSync([
      cliPath,
      '--root', projectRoot,
      '--log-format', 'pretty',
      'test', 'greet'
    ], {
      env: { ...process.env },
    });

    // Should succeed
    expect(result.exitCode).toBe(0);
  });

  test('should reject invalid format "plain"', () => {
    const result = spawnSync([
      cliPath,
      '--root', projectRoot,
      '--log-format', 'plain',
      'test', 'greet'
    ], {
      env: { ...process.env },
    });

    // Should fail
    expect(result.exitCode).toBe(1);
    const stderr = result.stderr.toString();
    expect(stderr).toContain('ERROR: invalid --log-format value');
    expect(stderr).toContain('Valid values: json, pretty');
  });

  test('should reject invalid format "xyz"', () => {
    const result = spawnSync([
      cliPath,
      '--root', projectRoot,
      '--log-format', 'xyz',
      'test', 'greet'
    ], {
      env: { ...process.env },
    });

    // Should fail
    expect(result.exitCode).toBe(1);
    const stderr = result.stderr.toString();
    expect(stderr).toContain('ERROR: invalid --log-format value');
    expect(stderr).toContain('Valid values: json, pretty');
  });

  test('should reject numeric format "123"', () => {
    const result = spawnSync([
      cliPath,
      '--root', projectRoot,
      '--log-format', '123',
      'test', 'greet'
    ], {
      env: { ...process.env },
    });

    // Should fail
    expect(result.exitCode).toBe(1);
    const stderr = result.stderr.toString();
    expect(stderr).toContain('ERROR: invalid --log-format value');
  });

  test('should show valid formats in error message', () => {
    const result = spawnSync([
      cliPath,
      '--root', projectRoot,
      '--log-format', 'invalid',
      'test', 'greet'
    ], {
      env: { ...process.env },
    });

    expect(result.exitCode).toBe(1);
    const stderr = result.stderr.toString();
    expect(stderr).toContain('json');
    expect(stderr).toContain('pretty');
  });

  test('should use pretty format by default', () => {
    const result = spawnSync([
      cliPath,
      '--root', projectRoot,
      'test', 'greet'
    ], {
      env: { ...process.env },
    });

    expect(result.exitCode).toBe(0);
    const output = result.stdout.toString();
    // Pretty format should have timestamps and human-readable output
    expect(output).toMatch(/\d{2}:\d{2}:\d{2}/); // timestamp pattern
  });
});
