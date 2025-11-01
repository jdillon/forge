# Testing Guide

This guide covers the test infrastructure and patterns for writing tests in Forge.

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
│   └── utils.ts                  # Test utilities
├── fixtures/                     # Test data
│   └── test-project/
├── extension-demo.test.ts          # Demo of extension usage
└── *.test.ts                     # Test cases
```

## Files Created

1. **tests/lib/testx.ts** (~200 lines)
   - Extends `describe` and `test` with all variants (skip, only, todo, if, skipIf, each)
   - Tracks describe stack
   - Injects TestContext

2. **tests/lib/utils.ts** (updated)
   - `setupTestLogs()` now accepts TestContext or manual strings
   - Backwards compatible with existing tests
   - Returns `{ logDir, logBaseName }`

3. **tests/extension-demo.test.ts** (~150 lines)
   - Comprehensive examples
   - Shows all usage patterns
   - Comparison with old approach

## Advantages Over Alternatives

| Approach | Context Access | Maintenance | Compatibility |
|----------|---------------|-------------|---------------|
| **test-extension** | ✅ Auto (file + test + path) | ✅ ~200 LOC, one-time | ✅ Full Bun API |
| **node:test** | ⚠️ `t.name`, `t.fullName` | ✅ Zero (standard) | ⚠️ Mixed imports |
| **Manual strings** | ❌ Manual duplication | ✅ Zero | ✅ Full Bun API |

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

## Migration Path

### Option A: Gradual Migration
- Keep both patterns working (setupTestLogs accepts both)
- Migrate tests one file at a time
- Update imports as you go

### Option B: All-at-Once
- Update all test files in one pass
- Simpler, cleaner cutover
- Can be done with find/replace for imports

### Recommended: Start with new tests
- Use extension for any new tests written
- Migrate existing tests opportunistically
- Low risk, high value

## Demo

Run the demo to see it in action:

```bash
# Clean output
bun test tests/extension-demo.test.ts

# Verbose output to see context values
VERBOSE=1 bun test tests/extension-demo.test.ts

# Check generated logs
ls -R build/test-logs/extension-demo.test.ts/
```

## Next Steps

1. **Review and approve** this approach
2. **Test with real test migration** - Convert cli-help.test.ts as proof of concept
3. **Decide on migration strategy** - Gradual vs all-at-once
4. **Update documentation** - Add to tests/README.md
5. **Standardize** - Make this the recommended pattern for new tests

## Questions to Resolve

1. **Should we apply this to all tests immediately?**
   - Or just use for new tests going forward?

2. **Do we want describe path in logs?**
   - Current: Uses file name only
   - Alternative: Could use `fullName` to create subdirectories

3. **Should this be the default import?**
   - Could make tests/index.ts that re-exports the wrapper
   - Then: `import { describe, test } from '../tests'`

---

**Status**: ✅ Working prototype, ready for review and testing
