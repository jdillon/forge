/**
 * Tests for subcommand option parsing
 *
 * This test demonstrates the bug where subcommand options
 * (defined via defineCommand) are not being parsed correctly.
 */

import { describe, test, expect } from 'bun:test';
import { spawnSync } from 'bun';

describe('Subcommand Options', () => {
  const cliPath = './bin/forge';
  const projectRoot = `${process.cwd()}/tests/fixtures/test-project`;

  test('should parse subcommand flags (--loud)', () => {
    const result = spawnSync([
      cliPath,
      '--root', projectRoot,
      'test', 'greet', 'Alice', '--loud'
    ], {
      env: { ...process.env },
    });

    expect(result.exitCode).toBe(0);
    const output = result.stdout.toString();
    expect(output).toContain('HELLO, ALICE!');
  });

  test('should parse subcommand short flags (-l)', () => {
    const result = spawnSync([
      cliPath,
      '--root', projectRoot,
      'test', 'greet', 'Bob', '-l'
    ], {
      env: { ...process.env },
    });

    expect(result.exitCode).toBe(0);
    const output = result.stdout.toString();
    expect(output).toContain('HELLO, BOB!');
  });

  test('should work without flags', () => {
    const result = spawnSync([
      cliPath,
      '--root', projectRoot,
      'test', 'greet', 'Charlie'
    ], {
      env: { ...process.env },
    });

    expect(result.exitCode).toBe(0);
    const output = result.stdout.toString();
    expect(output).toContain('Hello, Charlie!');
  });

  test('should work with no arguments', () => {
    const result = spawnSync([
      cliPath,
      '--root', projectRoot,
      'test', 'greet'
    ], {
      env: { ...process.env },
    });

    expect(result.exitCode).toBe(0);
    const output = result.stdout.toString();
    expect(output).toContain('Hello, World!');
  });
});
