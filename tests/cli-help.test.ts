/**
 * Tests for CLI help output
 */

import { describe, test, expect } from 'bun:test';
import { spawnSync } from 'bun';

describe('CLI Help Output', () => {
  const cliPath = './bin/forge';
  const projectRoot = `${process.cwd()}/tests/fixtures/test-project`;

  test('should display help with --help', () => {
    const result = spawnSync([cliPath, '--root', projectRoot, '--help'], {
      env: { ...process.env },
    });

    expect(result.exitCode).toBe(0);
    const output = result.stdout.toString();  // Help goes to stdout
    expect(output).toContain('Usage: forge');
    expect(output).toContain('Modern CLI framework');
    expect(output).toContain('Options:');
    expect(output).toContain('Commands:');
  });

  test('should display help with -h', () => {
    const result = spawnSync([cliPath, '--root', projectRoot, '-h'], {
      env: { ...process.env },
    });

    expect(result.exitCode).toBe(0);
    const output = result.stdout.toString();  // Help goes to stdout
    expect(output).toContain('Usage: forge');
  });

  test('should show all core options', () => {
    const result = spawnSync([cliPath, '--root', projectRoot, '--help'], {
      env: { ...process.env },
    });

    const output = result.stdout.toString();  // Help goes to stdout
    expect(output).toContain('--debug');
    expect(output).toContain('--quiet');
    expect(output).toContain('--silent');
    expect(output).toContain('--log-level');
    expect(output).toContain('--log-format');
    expect(output).toContain('--no-color');
    expect(output).toContain('--root');
  });

  test('should show version with --version', () => {
    const result = spawnSync([cliPath, '--version'], {
      env: { ...process.env },
    });

    expect(result.exitCode).toBe(0);
    const output = result.stdout.toString();
    expect(output).toMatch(/\d+\.\d+\.\d+/); // version pattern
  });

  test('should show version with -V', () => {
    const result = spawnSync([cliPath, '-V'], {
      env: { ...process.env },
    });

    expect(result.exitCode).toBe(0);
    const output = result.stdout.toString();
    expect(output).toMatch(/\d+\.\d+\.\d+/);
  });

  test('should show terse error for unknown options', () => {
    const result = spawnSync([cliPath, '--root', projectRoot, '--invalid-option'], {
      env: { ...process.env },
    });

    expect(result.exitCode).toBe(1);
    const stderr = result.stderr.toString();
    const stdout = result.stdout.toString();
    expect(stderr).toContain('ERROR: unknown option');
    expect(stderr).toContain("Try 'forge --help' for more information");
    // Spec says: terse error only, no help dump
    expect(stdout).toBe('');
  });

  test('should list commands in help output', () => {
    const result = spawnSync([cliPath, '--root', projectRoot, '--help'], {
      env: { ...process.env },
    });

    const output = result.stdout.toString();  // Help goes to stdout
    expect(output).toContain('test');
  });

  test('should sort options alphabetically', () => {
    const result = spawnSync([cliPath, '--root', projectRoot, '--help'], {
      env: { ...process.env },
    });

    const output = result.stdout.toString();  // Help goes to stdout
    // Check that options appear in sorted order
    const debugPos = output.indexOf('--debug');
    const logFormatPos = output.indexOf('--log-format');
    const quietPos = output.indexOf('--quiet');

    expect(debugPos).toBeLessThan(logFormatPos);
    expect(logFormatPos).toBeLessThan(quietPos);
  });
});
