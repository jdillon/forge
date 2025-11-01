/**
 * Tests for ForgeContext fields
 */

import { describe, test } from './lib/testx';
import { expect } from 'bun:test';
import { setupTestLogs, runCommandWithLogs } from './lib/utils';
import { join } from 'path';

describe('ForgeContext', () => {
  const fixtureRoot = join(process.cwd(), 'tests/fixtures/test-project');

  test('should include logLevel, logFormat, and color in context', async (ctx) => {
    const logs = await setupTestLogs(ctx);

    const result = await runCommandWithLogs({
      command: './bin/forge',
      args: ['--root', fixtureRoot, '--log-level', 'debug', '--log-format', 'json', '--no-color', 'test', 'context'],
      env: { ...process.env },
      logDir: logs.logDir,
      logBaseName: logs.logBaseName,
    });

    expect(result.exitCode).toBe(0);

    const output = (await Bun.file(result.stdoutLog).text()).trim();

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

  test('should have color=true by default', async (ctx) => {
    const logs = await setupTestLogs(ctx);

    const result = await runCommandWithLogs({
      command: './bin/forge',
      args: ['--root', fixtureRoot, '--log-format', 'json', 'test', 'context'],
      env: { ...process.env },
      logDir: logs.logDir,
      logBaseName: logs.logBaseName,
    });

    expect(result.exitCode).toBe(0);

    const contextData = JSON.parse((await Bun.file(result.stdoutLog).text()).trim());
    expect(contextData.color).toBe(true); // default is colors enabled
  });

});
