/**
 * Demo of enhanced test extension with context injection
 *
 * Run with: bun test tests/extension-demo.test.ts
 * Verbose: VERBOSE=1 bun test tests/extension-demo.test.ts
 */

import { describe, test } from './lib/testx';
import { expect } from 'bun:test';
import { setupTestLogs, runCommandWithLogs, println } from './lib/utils';
import { spawnSync } from 'bun';

const cliPath = './bin/forge';
const projectRoot = `${process.cwd()}/tests/fixtures/test-project`;

describe('Extension Demo - Basic Usage', () => {
  test('shows context in simple test', async (ctx) => {
    println('\n=== Test Context ===');
    println('fileName:', ctx.fileName);
    println('testName:', ctx.testName);
    println('describePath:', ctx.describePath);
    println('fullName:', ctx.fullName);

    expect(ctx.fileName).toBe('extension-demo.test.ts');
    expect(ctx.testName).toBe('shows context in simple test');
    expect(ctx.describePath).toEqual(['Extension Demo - Basic Usage']);
    expect(ctx.fullName).toBe('Extension Demo - Basic Usage > shows context in simple test');
  });

  test('uses context for automatic log setup', async (ctx) => {
    const logs = await setupTestLogs(ctx);

    println('\n=== Auto Log Setup ===');
    println('logDir:', logs.logDir);
    println('logBaseName:', logs.logBaseName);

    // Directory based on file name
    expect(logs.logDir).toContain('extension-demo');

    // Base name based on test name
    expect(logs.logBaseName).toBe('uses-context-for-automatic-log-setup');
  });

  test('runs command with auto-logged output', async (ctx) => {
    const logs = await setupTestLogs(ctx);

    println('\n=== Running Command ===');
    println('Command:', cliPath, '--version');
    println('Logs will be written to:');
    println('  stdout:', `${logs.logDir}/${logs.logBaseName}-stdout.log`);
    println('  stderr:', `${logs.logDir}/${logs.logBaseName}-stderr.log`);

    const result = await runCommandWithLogs({
      command: cliPath,
      args: ['--version'],
      env: { ...process.env },
      logDir: logs.logDir,
      logBaseName: logs.logBaseName,
    });

    expect(result.exitCode).toBe(0);

    // Read output from log file
    const output = await Bun.file(result.stdoutLog).text();
    expect(output.trim()).toMatch(/^\d+\.\d+\.\d+/);

    println('✓ Command output captured to:', result.stdoutLog);
  });
});

describe('Extension Demo - Nested Describes', () => {
  describe('Level 2', () => {
    describe('Level 3', () => {
      test('shows full path in nested context', async (ctx) => {
        println('\n=== Nested Context ===');
        println('describePath:', ctx.describePath);
        println('fullName:', ctx.fullName);

        expect(ctx.describePath).toEqual([
          'Extension Demo - Nested Describes',
          'Level 2',
          'Level 3',
        ]);

        expect(ctx.fullName).toBe(
          'Extension Demo - Nested Describes > Level 2 > Level 3 > shows full path in nested context'
        );

        // But logs still use file name for directory (not describe path)
        const logs = await setupTestLogs(ctx);
        expect(logs.logDir).toContain('extension-demo');
        expect(logs.logBaseName).toBe('shows-full-path-in-nested-context');
      });
    });
  });
});

describe('Extension Demo - Comparison with Manual', () => {
  test('manual approach (old way)', async () => {
    // Old way: manually specify group and test name
    const logs = await setupTestLogs('Extension Demo - Comparison with Manual', 'manual approach (old way)');

    println('\n=== Manual Setup ===');
    println('logDir:', logs.logDir);
    println('logBaseName:', logs.logBaseName);

    // Uses group name for directory
    expect(logs.logDir).toContain('extension-demo-comparison-with-manual');
  });

  test('context approach (new way)', async (ctx) => {
    // New way: context automatically provides names
    const logs = await setupTestLogs(ctx);

    println('\n=== Context Setup ===');
    println('logDir:', logs.logDir);
    println('logBaseName:', logs.logBaseName);

    // Uses file name for directory (better for multiple describe blocks in same file)
    expect(logs.logDir).toContain('extension-demo');
    expect(logs.logBaseName).toBe('context-approach-new-way');
  });
});

describe('Extension Demo - spawnSync Comparison', () => {
  test('old pattern: spawnSync with direct output', () => {
    // Old way: output goes to console
    const result = spawnSync([cliPath, '--root', projectRoot, '--version'], {
      env: { ...process.env },
    });

    expect(result.exitCode).toBe(0);
    const output = result.stdout.toString();
    expect(output.trim()).toMatch(/^\d+\.\d+\.\d+/);

    println('⚠️  Output was printed directly (noisy in test runs)');
  });

  test('new pattern: runCommandWithLogs with captured output', async (ctx) => {
    // New way: output captured to log files
    const logs = await setupTestLogs(ctx);

    const result = await runCommandWithLogs({
      command: cliPath,
      args: ['--root', projectRoot, '--version'],
      env: { ...process.env },
      logDir: logs.logDir,
      logBaseName: logs.logBaseName,
    });

    expect(result.exitCode).toBe(0);

    // Read from log file
    const output = await Bun.file(result.stdoutLog).text();
    expect(output.trim()).toMatch(/^\d+\.\d+\.\d+/);

    println('✓ Output captured cleanly to:', result.stdoutLog);
  });
});
