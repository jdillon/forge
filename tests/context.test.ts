/**
 * Tests for ForgeContext fields
 */

import { describe, test } from './lib/testx';
import { expect } from 'bun:test';
import { setupTestLogs, TEST_DIRS } from './lib/utils';
import { runForge } from './lib/runner';
import { join } from 'path';

describe('ForgeContext', () => {
  const fixtureRoot = join(TEST_DIRS.fixtures, 'test-project');

  test('should include logLevel, logFormat, and color in context', async (ctx) => {
    const logs = await setupTestLogs(ctx);
    const outputFile = join(logs.logDir, 'context-output.json');

    const result = await runForge({
      args: ['--root', fixtureRoot, '--log-level', 'debug', '--log-format', 'json', '--no-color', 'test', 'context', outputFile],
      logDir: logs.logDir,
      logBaseName: logs.logBaseName,
    });

    expect(result.exitCode).toBe(0);

    // Read JSON from output file instead of stdout
    const output = (await Bun.file(outputFile).text()).trim();
    const contextData = JSON.parse(output);

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
    const outputFile = join(logs.logDir, 'context-output.json');

    const result = await runForge({
      args: ['--root', fixtureRoot, '--log-format', 'json', 'test', 'context', outputFile],
      logDir: logs.logDir,
      logBaseName: logs.logBaseName,
    });

    expect(result.exitCode).toBe(0);

    // Read JSON from output file instead of stdout
    const contextData = JSON.parse((await Bun.file(outputFile).text()).trim());
    expect(contextData.color).toBe(true); // default is colors enabled
  });

});
