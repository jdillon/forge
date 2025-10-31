/**
 * Tests for CLI validation (no project required)
 */

import { describe, test, expect } from 'bun:test';
import { spawnSync } from 'bun';

describe('CLI Validation (No Project Required)', () => {
  const cliPath = './bin/forge2';

  test('should show version with --version', () => {
    const result = spawnSync([cliPath, '--version']);
    expect(result.exitCode).toBe(0);
    const output = result.stdout.toString();
    expect(output).toMatch(/\d+\.\d+\.\d+/); // version pattern
  });

  test('should show version with -V', () => {
    const result = spawnSync([cliPath, '-V']);
    expect(result.exitCode).toBe(0);
    const output = result.stdout.toString();
    expect(output).toMatch(/\d+\.\d+\.\d+/);
  });

  test('should reject invalid format "plain"', () => {
    const result = spawnSync([cliPath, '--log-format=plain']);
    expect(result.exitCode).toBe(1);
    const stderr = result.stderr.toString();
    expect(stderr).toContain('invalid');
    expect(stderr).toContain('Allowed choices');
  });

  test('should reject invalid format "xyz"', () => {
    const result = spawnSync([cliPath, '--log-format=xyz']);
    expect(result.exitCode).toBe(1);
    const stderr = result.stderr.toString();
    expect(stderr).toContain('invalid');
    expect(stderr).toContain('Allowed choices');
  });

  test('should reject numeric format "123"', () => {
    const result = spawnSync([cliPath, '--log-format=123']);
    expect(result.exitCode).toBe(1);
    const stderr = result.stderr.toString();
    expect(stderr).toContain('invalid');
  });

  test('should show valid formats in error message', () => {
    const result = spawnSync([cliPath, '--log-format=invalid']);
    expect(result.exitCode).toBe(1);
    const stderr = result.stderr.toString();
    expect(stderr).toContain('json');
    expect(stderr).toContain('pretty');
  });

  test('should show help on invalid option before project load', () => {
    const result = spawnSync([cliPath, '--invalid-option']);
    expect(result.exitCode).toBe(1);
    const stderr = result.stderr.toString();
    expect(stderr).toContain('ERROR: unknown option');
    // Help goes to stdout
    const stdout = result.stdout.toString();
    expect(stdout).toContain('Usage: forge2');
  });

  test('should parse --no-color without error', () => {
    // This should fail due to no project, not due to --no-color
    const result = spawnSync([cliPath, '--no-color']);
    expect(result.exitCode).toBe(1);
    const stderr = result.stderr.toString();
    // Should fail with "no .forge2 directory" not with option error
    expect(stderr).toContain('No .forge2/ directory found');
  });
});
