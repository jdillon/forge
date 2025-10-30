/**
 * Tests for ForgeContext fields
 */

import { describe, test, expect } from 'bun:test';
import { spawnSync } from 'bun';
import { writeFileSync, unlinkSync } from 'fs';
import { join } from 'path';

describe('ForgeContext', () => {
  const projectRoot = `${process.cwd()}/examples/website`;
  const testCommandPath = join(projectRoot, '.forge2', 'test-context.ts');

  // Create a test command that outputs context fields
  const testCommand = `
import type { ForgeCommand } from '../../../../lib/types';

export const test: ForgeCommand = {
  description: 'Test command to verify context',
  async execute(options, args, context) {
    // Output context fields as JSON for verification
    console.log(JSON.stringify({
      hasForge: !!context.forge,
      hasConfig: !!context.config,
      hasSettings: !!context.settings,
      hasState: !!context.state,
      commandName: context.commandName,
      logLevel: context.logLevel,
      logFormat: context.logFormat,
      color: context.color,
    }));
  }
};
`;

  test('should include logLevel, logFormat, and color in context', () => {
    // Write test command
    writeFileSync(testCommandPath, testCommand);

    try {
      const result = spawnSync([
        './bin/forge2',
        '--root', projectRoot,
        '--log-level', 'debug',
        '--log-format', 'json',
        '--no-color',
        'test-context', 'test'
      ], {
        env: { ...process.env },
      });

      const output = result.stdout.toString();
      const lines = output.trim().split('\n');

      // Find the JSON output line (filter out log lines)
      const jsonLine = lines.find(line => {
        try {
          const parsed = JSON.parse(line);
          return parsed.hasForge !== undefined;
        } catch {
          return false;
        }
      });

      expect(jsonLine).toBeDefined();
      const contextData = JSON.parse(jsonLine!);

      expect(contextData.hasForge).toBe(true);
      expect(contextData.hasConfig).toBe(true);
      expect(contextData.hasSettings).toBeDefined();
      expect(contextData.hasState).toBeDefined();
      expect(contextData.commandName).toBe('test');
      expect(contextData.logLevel).toBe('debug');
      expect(contextData.logFormat).toBe('json');
      expect(contextData.color).toBe(false); // --no-color was set
    } finally {
      // Cleanup
      unlinkSync(testCommandPath);
    }
  });

  test('should have color=true by default', () => {
    writeFileSync(testCommandPath, testCommand);

    try {
      const result = spawnSync([
        './bin/forge2',
        '--root', projectRoot,
        '--log-format', 'json',
        'test-context', 'test'
      ], {
        env: { ...process.env },
      });

      const output = result.stdout.toString();
      const lines = output.trim().split('\n');
      const jsonLine = lines.find(line => {
        try {
          const parsed = JSON.parse(line);
          return parsed.hasForge !== undefined;
        } catch {
          return false;
        }
      });

      expect(jsonLine).toBeDefined();
      const contextData = JSON.parse(jsonLine!);
      expect(contextData.color).toBe(true); // default is colors enabled
    } finally {
      unlinkSync(testCommandPath);
    }
  });

  test('should respect NO_COLOR env var in context', () => {
    writeFileSync(testCommandPath, testCommand);

    try {
      const result = spawnSync([
        './bin/forge2',
        '--root', projectRoot,
        '--log-format', 'json',
        'test-context', 'test'
      ], {
        env: { ...process.env, NO_COLOR: '1' },
      });

      const output = result.stdout.toString();
      const lines = output.trim().split('\n');
      const jsonLine = lines.find(line => {
        try {
          const parsed = JSON.parse(line);
          return parsed.hasForge !== undefined;
        } catch {
          return false;
        }
      });

      expect(jsonLine).toBeDefined();
      const contextData = JSON.parse(jsonLine!);
      expect(contextData.color).toBe(false); // NO_COLOR env var
    } finally {
      unlinkSync(testCommandPath);
    }
  });
});
