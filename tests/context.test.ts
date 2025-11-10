/*
 * Copyright 2025 Jason Dillon
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
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

  test('should include logLevel, logFormat, and colorMode in context', async (ctx) => {
    const logs = await setupTestLogs(ctx);
    const outputFile = join(logs.logDir, 'context-output.json');

    const result = await runForge({
      args: ['--root', fixtureRoot, '--log-level', 'debug', '--log-format', 'json', '--color', 'never', 'test', 'context', outputFile],
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
    expect(contextData.colorMode).toBe('never'); // --color=never was set
  });

  test('should have colorMode=auto by default', async (ctx) => {
    const logs = await setupTestLogs(ctx);
    const outputFile = join(logs.logDir, 'context-output.json');

    const result = await runForge({
      args: ['--root', fixtureRoot, '--log-format', 'json', 'test', 'context', outputFile],
      env: { NO_COLOR: '' }, // Unset NO_COLOR to test actual auto-detection
      logDir: logs.logDir,
      logBaseName: logs.logBaseName,
    });

    expect(result.exitCode).toBe(0);

    // Read JSON from output file instead of stdout
    const contextData = JSON.parse((await Bun.file(outputFile).text()).trim());
    expect(contextData.colorMode).toBe('auto'); // default is auto mode
  });

  test('should respect NO_COLOR env var', async (ctx) => {
    const logs = await setupTestLogs(ctx);
    const outputFile = join(logs.logDir, 'context-output.json');

    const result = await runForge({
      args: ['--root', fixtureRoot, '--log-format', 'json', 'test', 'context', outputFile],
      env: { NO_COLOR: '1' },
      logDir: logs.logDir,
      logBaseName: logs.logBaseName,
    });

    expect(result.exitCode).toBe(0);

    // Read JSON from output file instead of stdout
    const contextData = JSON.parse((await Bun.file(outputFile).text()).trim());
    expect(contextData.colorMode).toBe('never'); // NO_COLOR should map to 'never'
  });

});
