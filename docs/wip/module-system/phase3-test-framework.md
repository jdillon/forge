# Phase 3: Test Framework for Local Development

**Status**: Planning
**Related**: Phase 2 (Module Resolution), Logger Refactoring
**Issue**: Tests currently fail because `./bin/forge` uses installed version at `~/.local/share/forge/`

## Problem

When running tests during development:
- Tests execute `./bin/forge` command
- `bin/forge` is a wrapper script that delegates to installed version at `~/.local/share/forge/node_modules/@planet57/forge/lib/cli.ts`
- Local code changes don't take effect until `bun reinstall` is run
- This makes test-driven development slow and error-prone

Current workaround: Run `bun run lib/cli.ts` directly
- Missing: NODE_PATH and other environment setup from wrapper script
- Not sustainable for test suite

## Requirements

Tests must:
1. Always use local development code (not installed version)
2. Set up same environment as `bin/forge` wrapper (NODE_PATH, etc.)
3. Work without requiring `bun reinstall` between changes
4. Be easy to update when wrapper script changes

## Proposed Solution

### Builder/Factory Pattern for Test Execution

Create `tests/lib/forge-test-runner.ts` with a builder to configure test execution environment:

```typescript
/**
 * Builder for configuring Forge test execution
 *
 * Sets up environment to run local lib/cli.ts with same
 * environment as bin/forge wrapper script
 */
export class ForgeTestRunner {
  private env: Record<string, string> = {};
  private args: string[] = [];
  private logDir?: string;

  constructor() {
    // Set up default environment like bin/forge does
    this.setupDefaultEnv();
  }

  private setupDefaultEnv(): void {
    // Get Forge home path (like wrapper script)
    const forgeHome = getForgePaths().data; // ~/.local/share/forge
    const nodeModules = join(forgeHome, 'node_modules');

    // Set NODE_PATH for module resolution
    this.env.NODE_PATH = nodeModules;

    // Preserve existing env
    Object.assign(this.env, process.env);
  }

  withArgs(...args: string[]): this {
    this.args.push(...args);
    return this;
  }

  withEnv(key: string, value: string): this {
    this.env[key] = value;
    return this;
  }

  withLogDir(dir: string): this {
    this.logDir = dir;
    return this;
  }

  async run(): Promise<TestResult> {
    // Execute local lib/cli.ts with configured environment
    const result = await Bun.spawn({
      cmd: ['bun', 'run', join(projectRoot, 'lib/cli.ts'), ...this.args],
      env: this.env,
      stdout: this.logDir ? 'pipe' : 'inherit',
      stderr: this.logDir ? 'pipe' : 'inherit',
    });

    // Capture output if logDir specified
    // ...

    return result;
  }
}

// Usage in tests - Fluent style
const result = await new ForgeTestRunner()
  .withArgs('--root', fixtureRoot, 'test', 'context', outputFile)
  .withEnv('FORGE_DEBUG', '1')
  .withLogDir(logs.logDir)
  .run();

// Alternative: Configuration object style (Kotlin-inspired)
const result = await ForgeTestRunner.run({
  args: ['--root', fixtureRoot, 'test', 'context', outputFile],
  env: { FORGE_DEBUG: '1' },
  logDir: logs.logDir,
});

// Alternative: Callback style
const result = await ForgeTestRunner.create(runner => {
  runner.args = ['--root', fixtureRoot, 'test', 'context', outputFile];
  runner.env = { FORGE_DEBUG: '1' };
  runner.logDir = logs.logDir;
});
```

### API Style Options

**Option 1: Fluent/Builder (shown above)**
- ✅ TypeScript-idiomatic
- ✅ Discoverable via autocomplete
- ✅ Chainable, reads well
- ❌ More verbose

**Option 2: Configuration Object**
- ✅ Concise, less boilerplate
- ✅ All config visible at once
- ✅ Easy to spread/merge configs
- ❌ No method chaining

**Option 3: Callback DSL**
- ✅ Kotlin/Gradle-like feel
- ✅ Scoped configuration
- ❌ Less familiar in TS/JS ecosystem

**Recommendation**: Start with **Configuration Object** style for conciseness, add fluent builder if needed for complex scenarios.

### Benefits

1. **Centralized environment setup** - One place to maintain wrapper script logic
2. **Easy to update** - When wrapper script changes, update builder once
3. **Fluent API** - Easy to read and write tests
4. **Flexible** - Can override env, args, logging as needed per test
5. **Future-proof** - Can change implementation (e.g., call bash script directly) without touching tests

### Implementation Plan

#### Step 1: Create ForgeTestRunner builder
- Location: `tests/lib/forge-test-runner.ts`
- Implement builder pattern with fluent API
- Set up NODE_PATH and other env from wrapper script
- Execute local `lib/cli.ts` instead of `bin/forge`

#### Step 2: Manual testing on one failing test
- Pick one currently failing test (e.g., `tests/cli-help.test.ts`)
- Convert to use ForgeTestRunner
- Run manually to verify it works
- Compare behavior with wrapper script

#### Step 3: Update all tests
- Once verified working, convert remaining tests
- Tests to update:
  - `tests/cli-help.test.ts`
  - `tests/cli-color.test.ts`
  - `tests/cli-log-format.test.ts`
  - `tests/context.test.ts`
  - Other tests using `runCommandWithLogs()`

#### Step 4: Integrate with existing test helpers
- Update `runCommandWithLogs()` to use ForgeTestRunner internally
- Or deprecate in favor of builder pattern
- Ensure all tests pass

### Alternative Approaches Considered

#### 1. Call bash wrapper script directly
- **Pro**: Guaranteed same environment
- **Con**: Bash wrapper still uses installed version
- **Con**: Would need to modify wrapper to support local dev mode

#### 2. Mock installed location to point to local code
- **Pro**: No test changes needed
- **Con**: Fragile symlink/copy approach
- **Con**: Could interfere with actual installation

#### 3. Separate dev wrapper script
- **Pro**: Clean separation
- **Con**: Another script to maintain
- **Con**: Could drift from production wrapper

### Future Improvements

Once working:
1. Consider unified approach where wrapper script detects dev mode
2. Add `--dev` flag to wrapper to use local code
3. Builder could then call wrapper with `--dev` flag

## Open Questions

1. Should ForgeTestRunner completely replace `runCommandWithLogs()` or extend it?
2. How to handle cleanup/teardown in builder pattern?
3. Should we capture all env setup from wrapper or just NODE_PATH?
4. How to handle tests that explicitly test the installed version?

## Success Criteria

- [ ] All tests pass using local development code
- [ ] No `bun reinstall` needed between test runs
- [ ] Test execution environment matches production wrapper
- [ ] Easy to update when wrapper script changes
- [ ] Tests remain readable and maintainable
