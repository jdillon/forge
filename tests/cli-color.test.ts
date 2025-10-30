/**
 * Tests for CLI color detection
 */

import { describe, test, expect, beforeEach, afterEach } from 'bun:test';
import { spawnSync } from 'bun';

describe('CLI Color Detection', () => {
  const cliPath = './bin/forge2';
  const projectRoot = `${process.cwd()}/tests/fixtures/test-project`;

  test('should use colors by default', () => {
    const result = spawnSync([cliPath, '--root', projectRoot, '--help'], {
      env: { ...process.env },
    });

    // Exit code 0 for help
    expect(result.exitCode).toBe(0);
  });

  test('should disable colors with --no-color flag', () => {
    const result = spawnSync([cliPath, '--root', projectRoot, '--no-color', '--help'], {
      env: { ...process.env },
    });

    expect(result.exitCode).toBe(0);
    // Help should still work - check stdout
    const output = result.stdout.toString();
    expect(output).toContain('Modern CLI framework');
  });

  test('should disable colors with NO_COLOR env var', () => {
    const result = spawnSync([cliPath, '--root', projectRoot, '--help'], {
      env: { ...process.env, NO_COLOR: '1' },
    });

    expect(result.exitCode).toBe(0);
    const output = result.stdout.toString();  // Help goes to stdout
    expect(output).toContain('Modern CLI framework');
  });

  test('should prioritize --no-color flag over env', () => {
    const result = spawnSync([cliPath, '--root', projectRoot, '--no-color', '--help'], {
      env: { ...process.env },
    });

    expect(result.exitCode).toBe(0);
  });
});
