/**
 * Tests for ForgeContext fields
 */

import { describe, test, expect } from 'bun:test';
import { spawnSync } from 'bun';
import { join } from 'path';

describe('ForgeContext', () => {
  const fixtureRoot = join(process.cwd(), 'tests/fixtures/test-project');

  test('should include logLevel, logFormat, and color in context', () => {
    const result = spawnSync([
      './bin/forge2',
      '--root', fixtureRoot,
      '--log-level', 'debug',
      '--log-format', 'json',
      '--no-color',
      'test', 'context'
    ], {
      env: { ...process.env },
    });

    expect(result.exitCode).toBe(0);

    const output = result.stdout.toString().trim();

    // Parse JSON output
    let contextData;
    try {
      contextData = JSON.parse(output);
    } catch (err) {
      console.log('Failed to parse JSON:', err);
      throw new Error(`Output is not valid JSON: ${output}`);
    }

    expect(contextData.hasForge).toBe(true);
    expect(contextData.hasConfig).toBe(true);
    expect(contextData.hasSettings).toBeDefined();
    expect(contextData.hasState).toBeDefined();
    expect(contextData.commandName).toBe('context');
    expect(contextData.groupName).toBe('test');
    expect(contextData.logLevel).toBe('debug');
    expect(contextData.logFormat).toBe('json');
    expect(contextData.color).toBe(false); // --no-color was set
  });

  test('should have color=true by default', () => {
    const result = spawnSync([
      './bin/forge2',
      '--root', fixtureRoot,
      '--log-format', 'json',
      'test', 'context'
    ], {
      env: { ...process.env },
    });

    expect(result.exitCode).toBe(0);

    const contextData = JSON.parse(result.stdout.toString().trim());
    expect(contextData.color).toBe(true); // default is colors enabled
  });

  test('should respect NO_COLOR env var in context', () => {
    const result = spawnSync([
      './bin/forge2',
      '--root', fixtureRoot,
      '--log-format', 'json',
      'test', 'context'
    ], {
      env: { ...process.env, NO_COLOR: '1' },
    });

    expect(result.exitCode).toBe(0);

    const contextData = JSON.parse(result.stdout.toString().trim());
    expect(contextData.color).toBe(false); // NO_COLOR env var
  });
});
