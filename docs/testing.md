# Testing Guide

This guide covers the test infrastructure and patterns for writing tests in Forge.

## Quick Reference

### Running Tests

```bash
# Run all tests
bun test

# Run specific test file
bun test tests/cli-help.test.ts

# Run specific test by name pattern
bun test -t "should display help"

# Watch mode
bun test --watch

# Stop on first failure
bun test --bail

# Generate JUnit XML report
bun run test:junit
```

### Verbose Output

By default, test logs are silent. Enable verbose output for debugging:

```bash
# Enable verbose test logger output
VERBOSE=1 bun test

# Run specific test with verbose output
VERBOSE=1 bun test -t "creates required directories"
```

The `VERBOSE=1` flag enables:
- Test logger output (pino-pretty formatted)
- Diagnostic information from test helpers
- Structured logging with timestamps and context

### Viewing Test Logs

All test output is captured to files in `build/test-logs/`:

```bash
# View logs for a specific test file
ls build/test-logs/cli-help-test-ts/

# View stdout from a specific test
cat build/test-logs/cli-help-test-ts/should-display-help-with--help-stdout.log

# View stderr from a specific test
cat build/test-logs/cli-help-test-ts/should-display-help-with--help-stderr.log
```

## Test Extension

Forge provides a lightweight extension for Bun's `describe` and `test` functions that automatically injects a `TestContext` parameter with:
- `fileName`: Current test file name (e.g., "cli-help.test.ts")
- `testName`: Current test name
- `describePath`: Array of describe block names
- `fullName`: Full hierarchical name with " > " separator

## How It Works

The extension uses a clever double-execution strategy:

1. **First execution (ours)**: Tracks describe stack and captures context
   - When file loads, `inBunExecution = false`
   - Our `describe()` pushes to stack, calls `fn()`, pops from stack
   - Our `test()` captures context from stack and registers with Bun

2. **Second execution (Bun's)**: Skips our tracking to avoid duplicates
   - When Bun executes describe blocks, we set `inBunExecution = true`
   - Our wrappers see the flag and skip tracking/registration
   - Prevents duplicate test registration

## Usage

### Basic Import Pattern

```typescript
// Import extended describe/test
import { describe, test } from './lib/testx';

// Import everything else from bun:test
import { expect, beforeEach } from 'bun:test';
```

### Simple Test

```typescript
describe('My Suite', () => {
  test('my test', async (ctx) => {
    // ctx.fileName = "my-file.test.ts"
    // ctx.testName = "my test"
    // ctx.describePath = ["My Suite"]
    // ctx.fullName = "My Suite > my test"

    expect(ctx.fileName).toBe('my-file.test.ts');
  });
});
```

### With Auto Log Setup

```typescript
import { describe, test } from './lib/testx';
import { expect } from 'bun:test';
import { setupTestLogs, runCommandWithLogs } from './lib/utils';

describe('CLI Help Output', () => {
  test('should display help with --help', async (ctx) => {
    // Auto-setup logs based on context
    const logs = await setupTestLogs(ctx);
    // logs.logDir = "build/test-logs/cli-help-output-test-ts/"
    // logs.logBaseName = "should-display-help-with--help"

    const result = await runCommandWithLogs({
      command: './bin/forge',
      args: ['--help'],
      env: { ...process.env },
      logDir: logs.logDir,
      logBaseName: logs.logBaseName,
    });

    expect(result.exitCode).toBe(0);

    // Read from log file
    const output = await Bun.file(result.stdoutLog).text();
    expect(output).toContain('Usage: forge');
  });
});
```

### Nested Describes

```typescript
describe('Outer', () => {
  describe('Middle', () => {
    describe('Inner', () => {
      test('nested test', async (ctx) => {
        // ctx.describePath = ["Outer", "Middle", "Inner"]
        // ctx.fullName = "Outer > Middle > Inner > nested test"

        // But logs still use file name for directory:
        const logs = await setupTestLogs(ctx);
        // logs.logDir = "build/test-logs/my-file-test-ts/"
        // logs.logBaseName = "nested-test"
      });
    });
  });
});
```

## Test Runner

The `runForge()` function executes the local development version of the CLI (`lib/cli.ts`) in tests, eliminating the need to run `bun reinstall` between test iterations.

### Usage

```typescript
import { describe, test } from './lib/testx';
import { expect } from 'bun:test';
import { setupTestLogs, TEST_DIRS } from './lib/utils';
import { runForge } from './lib/runner';
import { join } from 'path';

describe('CLI Tests', () => {
  test('should run local CLI', async (ctx) => {
    const logs = await setupTestLogs(ctx);
    const projectRoot = join(TEST_DIRS.fixtures, 'test-project');

    const result = await runForge({
      args: ['--root', projectRoot, '--help'],
      logDir: logs.logDir,
      logBaseName: logs.logBaseName,
    });

    expect(result.exitCode).toBe(0);
    const output = await Bun.file(result.stdoutLog).text();
    expect(output).toContain('Modern CLI framework');
  });
});
```

### Configuration Options

```typescript
interface RunForgeConfig {
  args: string[];              // CLI arguments
  env?: Record<string, string>; // Environment variables
  cwd?: string;                 // Working directory (default: process.cwd())
  logDir: string;               // Directory for log files
  logBaseName?: string;         // Base name for log files (default: 'output')
  teeToConsole?: boolean;       // Echo output to console (default: false)
}
```

### How It Works

- Executes local `lib/cli.ts` directly (not the installed version)
- Sets up `NODE_PATH` to point to forge home node_modules (like production wrapper)
- Captures stdout/stderr to log files
- Returns exit code and log file paths
- No need to reinstall between test runs during development

## Test Logger

Use `createLogger()` from `tests/lib/logger.ts` for structured logging in test helpers and utilities:

```typescript
import { createLogger } from './lib/logger';

const log = createLogger('install-test');

async function setupTest() {
  log.info({ testDir }, 'Setting up test environment');
  log.debug({ config }, 'Using configuration');
  log.error({ error }, 'Setup failed');
}
```

### Features

- **Pino-pretty formatting**: Human-readable output with colors and timestamps
- **Silent by default**: Only outputs when `VERBOSE=1` is set
- **Structured logging**: Pass objects as first parameter for context
- **Timestamped**: Shows HH:MM:ss.l format
- **Named loggers**: Pass name to identify source in output

### Output Format

```
INFO  [install-test] Setting up test environment
DEBUG [install-test] Using configuration
ERROR [install-test] Setup failed
```

### When to Use

- ✅ Test helpers and utilities (setupTestHome, runInstall, etc.)
- ✅ Diagnostic information during test setup/teardown
- ✅ Complex test scenarios that benefit from structured logging
- ❌ Simple assertions (use expect() instead)
- ❌ Production code (use the app logger from lib/logger.ts)

## File-Based Logging Strategy

**Decision**: Use test file name for log directory, normalized test name for log file base name.

### Why This Approach?

- ✅ **Simple**: One directory per test file
- ✅ **Predictable**: Easy to find logs for a specific test file
- ✅ **No duplication**: describe path can change, file name is stable
- ✅ **Clean structure**: `build/test-logs/cli-help-test-ts/test-name-stdout.log`

### Log Directory Structure

```
build/test-logs/
├── cli-help-test-ts/
│   ├── should-display-help-with--help-stdout.log
│   ├── should-display-help-with--help-stderr.log
│   ├── should-display-help-with--h-stdout.log
│   └── should-display-help-with--h-stderr.log
├── cli-color-test-ts/
│   ├── should-use-colors-by-default-stdout.log
│   └── should-use-colors-by-default-stderr.log
└── install-test-ts/
    ├── creates-required-directories-install-stdout.log
    └── creates-required-directories-install-stderr.log
```

## Project Structure

```
tests/
├── lib/                          # Test infrastructure
│   ├── testx.ts                  # Test framework extensions (~200 lines)
│   ├── runner.ts                 # Test runner for local CLI execution
│   ├── logger.ts                 # Structured logging for tests
│   └── utils.ts                  # Test utilities
├── fixtures/                     # Test data
│   └── test-project/
└── *.test.ts                     # Test cases
```

## Test Infrastructure Files

1. **tests/lib/testx.ts** (~200 lines)
   - Extends `describe` and `test` with all variants (skip, only, todo, if, skipIf, each)
   - Tracks describe stack
   - Injects TestContext

2. **tests/lib/runner.ts**
   - `runForge()` function to execute local CLI in tests
   - Sets up NODE_PATH like production wrapper
   - Captures output to log files
   - Eliminates need for `bun reinstall` during development

3. **tests/lib/logger.ts**
   - `createLogger()` for structured logging
   - Pino-pretty formatting with colors and timestamps
   - Silent by default, verbose with `VERBOSE=1`
   - For test helpers/utilities, not production code

4. **tests/lib/utils.ts**
   - `setupTestLogs()` accepts TestContext or manual strings
   - `setupTestHome()` creates isolated HOME directories
   - `runCommandWithLogs()` executes commands with output capture
   - `TEST_DIRS` constants for test directories

## Supported Test Variants

All Bun test variants are extended:

**describe:**
- `describe(name, fn)`
- `describe.skip(name, fn)`
- `describe.only(name, fn)`
- `describe.todo(name)`

**test:**
- `test(name, fn, timeout?)`
- `test.skip(name, fn, timeout?)`
- `test.only(name, fn, timeout?)`
- `test.todo(name, fn?, timeout?)`
- `test.if(condition)(name, fn, timeout?)`
- `test.skipIf(condition)(name, fn, timeout?)`
- `test.each(table)(name, fn, timeout?)`

## Current Limitations

### Output Capture

**Current behavior:**
- Test output (stdout/stderr) from spawned processes is captured to files
- Console.log from test code goes to stdout (captured by Bun test runner)
- Test logger output goes to stderr (not captured unless VERBOSE=1)

**What we don't have:**
- Per-test output capture to files (like Maven Surefire)
- Automatic capture of all console.log/console.error to test-specific files
- Multiple report formats simultaneously (HTML + JSON + JUnit)

### Future Improvements

See [Issue #17: Consider migrating to Vitest](https://github.com/jdillon/forge/issues/17) for evaluation of alternative test frameworks that provide:

- Rich HTML reports with interactive debugging UI
- Multiple output formats simultaneously (JUnit XML, JSON, HTML)
- Better console output capture and control
- Browser mode for component testing
- Benchmarking and type testing features

**Recommendation:** Stay with Bun test for now (fastest option), consider Vitest later if:
- Test suite grows large enough that debugging becomes painful
- CI/CD requires multiple report formats
- Team wants better local development debugging experience

---

**Status**: ✅ Stable test infrastructure with Bun test runner
