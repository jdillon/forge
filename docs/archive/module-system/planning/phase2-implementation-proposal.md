# Phase 2: Implementation Proposal
**Forge Home & Dependencies**

**Date**: 2025-11-01
**Status**: Proposal
**Issue**: #11
**Planning Doc**: `phase2-meta-project-deps.md`

---

## Overview

This document details the implementation approach for Phase 2, focusing on:
1. **Integration points** with existing bootstrap flow
2. **File structure** and new modules
3. **Restart mechanism** for seamless dependency installation
4. **Module resolution** changes
5. **Step-by-step implementation** tasks

---

## Key Decisions

- **Forge home location**: `getForgePaths().data` → `~/.local/share/forge2/`
- **Magic exit code**: `42` (signals wrapper to restart)
- **Dependencies go in**: `${forgePaths.data}/node_modules/`
- **Package management**: `${forgePaths.data}/package.json` and `bun.lockb`

---

## File Structure

### New Files

```
lib/
├── forge-home.ts          # Forge home management & dependency installation
├── module-resolver.ts     # Module path resolution (local → shared)
└── auto-install.ts        # Auto-install flow & restart coordination

tests/
├── forge-home.test.ts
├── module-resolver.test.ts
└── integration/
    └── dependencies.test.ts
```

### Modified Files

```
lib/
├── types.ts               # Add dependencies?: string[] to ForgeConfig
├── cli.ts                 # Add dependency sync before Forge initialization
├── core.ts                # Use module resolver in loadModule()
└── config-loader.ts       # (Optional) Add installMode to config schema
```

---

## Integration Points

### 1. Bootstrap Flow (`lib/cli.ts`)

**Current flow** (Phase 1):
```typescript
async function run() {
  const cliArgs = process.argv.slice(2);

  // Phase 1: Bootstrap
  const config = bootstrap(cliArgs);
  configureLogger(config);

  // Phase 2: Build real CLI
  const program = await buildRealCLI(config);
  await program.parseAsync(cliArgs);
}
```

**New flow** (Phase 2):
```typescript
async function run() {
  const cliArgs = process.argv.slice(2);

  // Phase 1: Bootstrap
  const config = bootstrap(cliArgs);
  configureLogger(config);

  // ===== NEW: Dependency sync BEFORE building CLI =====
  // This happens early so modules can import dependencies
  const projectRoot = await getProjectRootForDependencies(config);
  if (projectRoot) {
    const needsRestart = await syncDependencies(projectRoot);
    if (needsRestart) {
      // Exit with magic code 42 → wrapper will restart us
      process.exit(42);
    }
  }
  // =====================================================

  // Phase 2: Build real CLI (unchanged)
  const program = await buildRealCLI(config);
  await program.parseAsync(cliArgs);
}
```

**Why here?**
- Before `buildRealCLI()` because modules need dependencies available at import time
- After `configureLogger()` so we can log what we're doing
- Early enough to restart before loading any modules

> We might need to revisit this early, but lets try and see how this works!

### 2. Config Schema (`lib/types.ts`)

```typescript
export interface ForgeConfig {
  modules: string[];
  defaultCommand?: string;
  settings?: Record<string, Record<string, any>>;

  // ===== NEW =====
  dependencies?: string[];        // e.g., ["@aws-sdk/client-s3@^3.0.0"]
  installMode?: 'auto' | 'manual' | 'ask';  // Default: 'auto'
  offline?: boolean;              // Default: false
  // ===============
}
```

### 3. Module Resolution (`lib/core.ts`)

**Current `loadModule()` behavior**:
```typescript
// Resolve module path to absolute path for import()
const fullPath = modulePath.startsWith('.')
  ? resolve(forgeDir, modulePath)
  : modulePath;

const module = await import(fullPath);
```

**New behavior with resolver**:
```typescript
import { resolveModule } from './module-resolver';

// Resolve with priority: local → shared
const fullPath = await resolveModule(modulePath, forgeDir);

const module = await import(fullPath);
```

---

## Implementation Details

### lib/forge-home.ts

**Responsibilities**:
- Initialize forge home directory structure
- Manage `package.json` in forge home
- Install dependencies via `bun add`
- Detect changes (compare package.json before/after)
- Signal restart needed via return value

**Key Functions**:

```typescript
import { getForgePaths } from './xdg';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';

/**
 * Get forge home path (XDG data directory)
 */
export function getForgeHomePath(): string {
  return getForgePaths().data;
}

/**
 * Ensure forge home exists with package.json
 */
export async function ensureForgeHome(): Promise<void> {
  const forgeHome = getForgeHomePath();

  if (!existsSync(forgeHome)) {
    mkdirSync(forgeHome, { recursive: true });
  }

  const pkgPath = join(forgeHome, 'package.json');
  if (!existsSync(pkgPath)) {
    // Initialize minimal package.json
    writeFileSync(pkgPath, JSON.stringify({
      name: "forge-home",
      private: true,
      description: "Forge shared dependencies",
      dependencies: {}
    }, null, 2));
  }
}

/**
 * Get current package.json content hash
 */
function getPackageHash(): string {
  const pkgPath = join(getForgeHomePath(), 'package.json');
  if (!existsSync(pkgPath)) return '';

  const content = readFileSync(pkgPath, 'utf8');
  // Use simple hash or just content for comparison
  return require('crypto').createHash('sha256').update(content).digest('hex');
}

/**
 * Install a single dependency
 * Returns true if package.json changed (needs restart)
 */
export async function installDependency(dep: string): Promise<boolean> {
  const forgeHome = getForgeHomePath();
  const beforeHash = getPackageHash();

  // Run bun add from forge home directory
  const proc = Bun.spawn(['bun', 'add', dep], {
    cwd: forgeHome,
    stdout: 'pipe',
    stderr: 'pipe',
  });

  const exitCode = await proc.exited;
  if (exitCode !== 0) {
    const stderr = await new Response(proc.stderr).text();
    throw new Error(`Failed to install ${dep}: ${stderr}`);
  }

  const afterHash = getPackageHash();
  return beforeHash !== afterHash;
}

/**
 * Check if dependency is installed
 */
export function isInstalled(dep: string): boolean {
  const pkgPath = join(getForgeHomePath(), 'package.json');
  if (!existsSync(pkgPath)) return false;

  const pkg = JSON.parse(readFileSync(pkgPath, 'utf8'));
  const deps = pkg.dependencies || {};

  // Parse dep string (e.g., "@aws-sdk/client-s3@^3.0.0" → "@aws-sdk/client-s3")
  const depName = dep.includes('@') && dep.startsWith('@')
    ? dep.split('@').slice(0, 2).join('@')  // Scoped: @scope/name
    : dep.split('@')[0];                     // Regular: name

  return depName in deps;
}

/**
 * Sync dependencies from config
 * Returns true if restart is needed
 */
export async function syncDependencies(
  dependencies: string[],
  mode: 'auto' | 'manual' | 'ask' = 'auto'
): Promise<boolean> {
  await ensureForgeHome();

  // Find missing dependencies
  const missing = dependencies.filter(dep => !isInstalled(dep));

  if (missing.length === 0) {
    return false; // Nothing to install
  }

  // Handle based on mode
  if (mode === 'manual') {
    throw new Error(
      `Missing dependencies: ${missing.join(', ')}\n` +
      `Run: forge module install`
    );
  }

  if (mode === 'ask') {
    // TODO: Implement prompt (Phase 2 can start with auto/manual only)
    // For now, treat as auto in non-TTY or fall through to auto
  }

  // Auto mode: Install all missing
  console.log(`Installing ${missing.length} dependencies: ${missing.join(', ')}...`);

  let anyChanged = false;
  for (const dep of missing) {
    const changed = await installDependency(dep);
    if (changed) anyChanged = true;
  }

  if (anyChanged) {
    console.log('✓ Dependencies installed');
    console.log('Restarting to pick up changes...');
  }

  return anyChanged;
}
```

**Edge Cases to Handle**:
- Network failures → Throw error with helpful message
- Git URL auth failures → Detect and suggest SSH key setup
- Malformed dependency strings → Validate before `bun add`
- Corrupted package.json → Reinitialize forge home

### lib/module-resolver.ts

**Responsibilities**:
- Resolve module paths with priority: local → shared
- Handle relative paths (`./foo`, `../bar`)
- Handle package names (`@scope/package`, `package-name`)
- Clear error messages when not found

**Implementation**:

```typescript
import { resolve, join } from 'path';
import { existsSync } from 'fs';
import { getForgeHomePath } from './forge-home';

/**
 * Resolve module path with priority: local → shared
 *
 * @param modulePath - Module name or path from config (e.g., "./website", "@aws-sdk/client-s3")
 * @param forgeDir - Project's .forge2/ directory
 * @returns Absolute path to module file
 */
export async function resolveModule(
  modulePath: string,
  forgeDir: string
): Promise<string> {
  // 1. Local modules (relative paths starting with ./ or ../)
  if (modulePath.startsWith('.')) {
    const localPath = resolve(forgeDir, modulePath);

    // Try with and without extensions
    for (const ext of ['', '.ts', '.js', '.mjs']) {
      const fullPath = localPath + ext;
      if (existsSync(fullPath)) {
        return fullPath;
      }
    }

    throw new Error(
      `Local module not found: ${modulePath}\n` +
      `Searched in: ${forgeDir}`
    );
  }

  // 2. Shared modules (package names, from forge home node_modules)
  const forgeHome = getForgeHomePath();
  const sharedPath = join(forgeHome, 'node_modules', modulePath);

  if (existsSync(sharedPath)) {
    // Let Node.js module resolution handle it
    return sharedPath;
  }

  // 3. Not found anywhere
  throw new Error(
    `Module not found: ${modulePath}\n` +
    `Searched:\n` +
    `  - Local: ${forgeDir}\n` +
    `  - Shared: ${join(forgeHome, 'node_modules')}\n\n` +
    `Suggestions:\n` +
    `  1. Check module is listed in config.yml dependencies:\n` +
    `  2. Run: forge module install`
  );
}
```

**Alternative: Use require.resolve()**

Per the planning doc, we could use programmatic `require.resolve()`:

```typescript
export async function resolveModule(
  modulePath: string,
  forgeDir: string
): Promise<string> {
  const forgeHome = getForgeHomePath();

  const paths = [
    forgeDir,
    join(forgeHome, 'node_modules'),
  ];

  try {
    return require.resolve(modulePath, { paths });
  } catch (err) {
    throw new Error(
      `Module not found: ${modulePath}\n` +
      `Searched paths:\n${paths.map(p => `  - ${p}`).join('\n')}\n\n` +
      `Suggestions:\n` +
      `  1. Add to config.yml dependencies section\n` +
      `  2. Run: forge module install`
    );
  }
}
```

**Decision**: Start with manual path resolution for clarity, can refactor to `require.resolve()` if needed.

### lib/auto-install.ts

**Responsibilities**:
- Coordinate dependency sync from config
- Handle restart guard (prevent infinite loops)
- Provide user-facing functions for CLI integration

**Implementation**:

```typescript
import { syncDependencies } from './forge-home';
import type { ForgeConfig } from './types';

const RESTART_ENV_VAR = 'FORGE_RESTARTED';

/**
 * Check if this is a restarted process
 */
export function hasAlreadyRestarted(): boolean {
  return process.env[RESTART_ENV_VAR] === '1';
}

/**
 * Sync dependencies and handle restart if needed
 * Returns true if process should exit for restart
 */
export async function autoInstallDependencies(
  config: ForgeConfig
): Promise<boolean> {
  // Guard: Don't restart twice
  if (hasAlreadyRestarted()) {
    return false;
  }

  // No dependencies declared
  if (!config.dependencies || config.dependencies.length === 0) {
    return false;
  }

  const mode = config.installMode || 'auto';

  try {
    const needsRestart = await syncDependencies(config.dependencies, mode);

    if (needsRestart) {
      // Set env var for next invocation
      process.env[RESTART_ENV_VAR] = '1';
      return true;
    }

    return false;
  } catch (err) {
    // Handle errors based on mode
    if (mode === 'manual') {
      // Already threw from syncDependencies
      throw err;
    }

    // Auto/ask mode: Show error and suggest manual install
    console.error(`Failed to install dependencies: ${err.message}`);
    console.error(`Try running: forge module install`);
    process.exit(1);
  }
}
```

---

## Restart Mechanism

### Overview

When dependencies are installed, Node.js/Bun won't pick them up in the current process. We need to restart.

**Flow**:
1. Bootstrap detects missing dependencies
2. `bun add` installs them
3. Compare package.json before/after
4. If changed: Exit with code `42`
5. Wrapper script detects exit code `42`
6. Wrapper re-runs with same args + env var `FORGE_RESTARTED=1`
7. Second run: Env var set → Skip dependency check → Run normally

### Wrapper Script Changes

**Current wrapper** (`~/.local/bin/forge`):
```bash
#!/bin/bash
exec bun run /path/to/forge/cli.ts "$@"
```

**New wrapper with restart handling**:
```bash
#!/bin/bash
set -e

# Run forge, capture exit code
bun run /path/to/forge/cli.ts "$@"
EXIT_CODE=$?

# Exit code 42 = restart needed
if [ $EXIT_CODE -eq 42 ]; then
  # Set env var to prevent infinite loops
  export FORGE_RESTARTED=1
  # Re-run with same arguments
  exec bun run /path/to/forge/cli.ts "$@"
fi

# Normal exit
exit $EXIT_CODE
```

**Notes**:
- `set -e` ensures we fail on errors
- `exec` replaces shell process (cleaner)
- Only restarts once (env var guard)

### Exit Code Choice: 42

**Why 42?**
- Unlikely to collide with standard exit codes
- Memorable (Answer to Life, Universe, Everything)
- Not in common use by shells or tools

**Alternatives considered**:
- 77 (also uncommon)
- 100+ (risky, some systems cap at 255)

### Integration in cli.ts

```typescript
import { autoInstallDependencies } from './auto-install';

async function run() {
  const cliArgs = process.argv.slice(2);
  const config = bootstrap(cliArgs);
  configureLogger(config);

  // Sync dependencies (may exit with code 42)
  const projectRoot = await getProjectRootForSync(config);
  if (projectRoot) {
    const forgeConfig = await loadMinimalConfig(projectRoot);
    const needsRestart = await autoInstallDependencies(forgeConfig);

    if (needsRestart) {
      process.exit(42);  // Wrapper will restart us
    }
  }

  const program = await buildRealCLI(config);
  await program.parseAsync(cliArgs);
}
```

**Challenge**: Need to load config BEFORE Forge initialization to check dependencies, but config loading is currently in `Forge.loadConfig()`.

**Solution**: Extract minimal config loading for dependency check:

```typescript
async function loadMinimalConfig(projectRoot: string): Promise<ForgeConfig> {
  const { loadLayeredConfig } = await import('./config-loader');
  const { config: userConfigDir } = getForgePaths();
  return await loadLayeredConfig(projectRoot, userConfigDir);
}
```

---

## Testing Strategy

### Unit Tests

**`tests/forge-home.test.ts`**:
- `ensureForgeHome()` creates directory structure
- `isInstalled()` detects installed packages
- `installDependency()` runs bun add successfully
- `syncDependencies()` installs missing only
- Parse npm package names correctly (`@scope/name@version`)
- Parse git URLs correctly (`github:user/repo`)

**`tests/module-resolver.test.ts`**:
- Resolve local modules (`./ paths`)
- Resolve shared modules (package names)
- Priority: local wins over shared
- Error messages when not found

**`tests/auto-install.test.ts`**:
- `hasAlreadyRestarted()` detects env var
- `autoInstallDependencies()` returns true when restart needed
- Restart guard prevents double-restart

### Integration Tests

**`tests/integration/dependencies.test.ts`**:

Test with real fixtures:
```typescript
describe('dependency installation', () => {
  test('installs npm dependency and imports in module', async () => {
    // Use fixture with dependencies in config.yml
    // Run forge command
    // Verify dependency installed
    // Verify module can import
  });

  test('auto-restart flow works', async () => {
    // Run forge with missing dependency
    // Capture exit code (should be 42)
    // Set FORGE_RESTARTED=1
    // Re-run
    // Should succeed
  });

  test('restart guard prevents infinite loop', async () => {
    // Set FORGE_RESTARTED=1 before run
    // Even with missing deps, should not restart
  });
});
```

**Test Fixtures**:
```
tests/fixtures/phase2/
├── simple-npm/
│   ├── .forge2/
│   │   ├── config.yml      # dependencies: ["lodash@^4.0.0"]
│   │   └── helper.ts       # import _ from 'lodash'
├── git-dep/
│   └── .forge2/
│       └── config.yml      # dependencies: ["github:lodash/lodash"]
└── auto-mode/
    └── .forge2/
        └── config.yml      # installMode: auto
```

---

## Step-by-Step Implementation

### Phase 2.1: Core Infrastructure

**Tasks**:
- [ ] Add `dependencies` field to `ForgeConfig` interface (`lib/types.ts`)
- [ ] Implement `lib/forge-home.ts`:
  - [ ] `getForgeHomePath()`
  - [ ] `ensureForgeHome()`
  - [ ] `getPackageHash()`
  - [ ] `installDependency()`
  - [ ] `isInstalled()`
  - [ ] `syncDependencies()`
- [ ] Unit tests for forge-home functions
- [ ] Manual testing: Create config with dependencies, verify install works

**Verification**:
```bash
# Create test project
mkdir -p /tmp/test-forge/.forge2
cat > /tmp/test-forge/.forge2/config.yml <<EOF
modules: []
dependencies:
  - "lodash@^4.0.0"
EOF

# Run forge (will fail, but should create forge home and install dep)
cd /tmp/test-forge
forge --help

# Verify
ls ~/.local/share/forge2/node_modules/lodash
```

### Phase 2.2: Module Resolution

**Tasks**:
- [ ] Implement `lib/module-resolver.ts`:
  - [ ] `resolveModule()` with local → shared priority
  - [ ] Error messages with suggestions
- [ ] Integrate resolver into `core.ts` `loadModule()`
- [ ] Unit tests for resolver
- [ ] Integration test: Module imports from shared dependency

**Verification**:
```typescript
// /tmp/test-forge/.forge2/helper.ts
import _ from 'lodash';

export const test = {
  description: 'Test lodash import',
  execute: async () => {
    console.log(_.VERSION);
  }
};
```

```bash
forge helper test  # Should print lodash version
```

### Phase 2.3: Auto-Install & Restart

**Tasks**:
- [ ] Implement `lib/auto-install.ts`:
  - [ ] `hasAlreadyRestarted()`
  - [ ] `autoInstallDependencies()`
- [ ] Integrate into `cli.ts` bootstrap flow:
  - [ ] Extract `loadMinimalConfig()`
  - [ ] Call `autoInstallDependencies()` before `buildRealCLI()`
  - [ ] Exit with code 42 if restart needed
- [ ] Update wrapper script with restart logic
- [ ] Unit tests for auto-install
- [ ] Integration tests for restart flow

**Verification**:
```bash
# Clean slate
rm -rf ~/.local/share/forge2

# Run with dependencies in config
cd /tmp/test-forge
forge helper test

# Should see:
# "Installing 1 dependency: lodash@^4.0.0..."
# "✓ Dependencies installed"
# "Restarting to pick up changes..."
# "4.17.21"  (or whatever lodash version)
```

### Phase 2.4: Error Handling & Offline Mode

**Tasks**:
- [ ] Add error handling for network failures
- [ ] Add error handling for auth failures (git URLs)
- [ ] Implement `--offline` flag and `offline: bool` config
- [ ] Error messages with suggestions
- [ ] Integration tests for error scenarios

**Verification**:
```bash
# Offline mode
forge --offline helper test
# Should error: "Offline mode is enabled but network required..."

# Bad git URL
# config.yml: dependencies: ["github:fake/nonexistent"]
forge helper test
# Should error with auth/not-found suggestions
```

### Phase 2.5: Polish & Documentation

**Tasks**:
- [ ] Add progress indicators during install
- [ ] Improve logging (what's being installed, timing)
- [ ] Add `forge module install` command (manual mode)
- [ ] Update docs:
  - [ ] `README.md` - Add dependencies section
  - [ ] `docs/wip/module-system/phase2-summary.md`
  - [ ] Example in `examples/website/`
- [ ] Clean up TODOs and comments
- [ ] Full test suite passing

---

## Open Questions

### Q1: Config Loading Timing

**Problem**: Need to load config to check dependencies, but config loading currently happens in `Forge.loadConfig()`.

**Options**:
1. Extract minimal config loading before Forge initialization (proposed above)
2. Move dependency sync into Forge constructor
3. Load config twice (once minimal, once full)

**Recommendation**: Option 1 - Extract minimal config loading. Clean separation of concerns.

---

### Q2: Wrapper Script Distribution

**Problem**: How do users get the updated wrapper script with restart logic?

**Options**:
1. Update during `forge upgrade` command
2. Install script with version check (self-updating)
3. Manual update instructions in CHANGELOG

**Recommendation**: Combination of 2 & 3:
- Wrapper checks its own version on startup (quick)
- Prompts to update if outdated
- Manual instructions in docs for initial setup

**Deferred**: Phase 2 focuses on implementation. Wrapper upgrade flow is Phase 3+.

---

### Q3: Module Install Command

**Problem**: Need `forge module install` command for manual mode.

**Location**: Built-in command or separate module?

**Recommendation**: Built-in command (like `forge module list` will be). Add to core as special command that doesn't require project.

**Implementation**:
```typescript
// In core.ts or new lib/builtin-commands.ts
export const moduleCommands = {
  install: {
    description: 'Install forge dependencies',
    execute: async (opts, args, ctx) => {
      if (!ctx.config.dependencies) {
        console.log('No dependencies declared in config.yml');
        return;
      }

      await syncDependencies(ctx.config.dependencies, 'auto');
      console.log('✓ All dependencies installed');
    }
  }
};
```

---

## Risk Analysis

### High Risk
- **Restart mechanism fails on some shells** → Mitigation: Test on bash, zsh, fish
- **Infinite restart loop despite guard** → Mitigation: Max 1 restart, clear logging

> our forge-bootstrap is BASH, so we shouldn't have to worry about the users shell.  100% avoid restart looping, in fact we probably want to pass a flag to the restarted bun process to let it know that its restarted and if it thinks it needs to restart again it should faile (with an error code not hte magic code).

### Medium Risk
- **Performance: Config loaded multiple times** → Mitigation: Cache config, only load once
- **Race condition: Multiple forge processes installing** → Mitigation: Document as known issue, fix in Phase 3 with lockfile

### Low Risk
- **Bun add fails for edge case dependency** → Mitigation: Comprehensive error handling
- **Module resolution doesn't match Node.js** → Mitigation: Use require.resolve() if needed

---

## Success Criteria

Phase 2 is complete when:

- [ ] Can declare `dependencies:` in config.yml
- [ ] Dependencies install to `~/.local/share/forge2/node_modules/`
- [ ] Local modules can import from installed dependencies
- [ ] Auto-install works with seamless restart (exit code 42)
- [ ] Restart guard prevents infinite loops
- [ ] Manual mode works (`installMode: manual`)
- [ ] Module resolution priority works (local → shared)
- [ ] Error messages are helpful
- [ ] All tests pass (unit + integration)
- [ ] Wrapper script updated with restart logic
- [ ] Documentation updated

---

## Next Steps

After review and approval:

1. Create implementation branch: `git checkout -b phase2-dependencies`
2. Start with Phase 2.1: Core Infrastructure
3. Iterate through phases 2.2 - 2.5
4. Regular commits after each major milestone
5. Test suite runs clean before final PR

**Estimated effort**: 2-3 days of focused work

---

## Appendix: Example Usage

### Example 1: AWS Deployment Module

**config.yml**:
```yaml
modules:
  - ./aws

dependencies:
  - "@aws-sdk/client-s3@^3.0.0"
  - "@aws-sdk/client-cloudfront@^3.0.0"
```

**aws.ts**:
```typescript
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { CloudFrontClient, CreateInvalidationCommand } from '@aws-sdk/client-cloudfront';

export const deploy = {
  description: 'Deploy to S3 and invalidate CloudFront',
  execute: async (opts, args, ctx) => {
    const s3 = new S3Client({ region: 'us-east-1' });
    // ... deployment logic
  }
};
```

**Usage**:
```bash
$ forge aws deploy
Installing 2 dependencies: @aws-sdk/client-s3@^3.0.0, @aws-sdk/client-cloudfront@^3.0.0...
✓ Dependencies installed
Restarting to pick up changes...

Deploying to S3...
✓ Deploy complete
```

### Example 2: Manual Install Mode

**config.yml**:
```yaml
modules:
  - ./deployment

dependencies:
  - "ansible@^2.0.0"

installMode: manual
```

**Usage**:
```bash
$ forge deployment run
ERROR: Missing dependencies: ansible@^2.0.0
Run: forge module install

$ forge module install
Installing 1 dependency: ansible@^2.0.0...
✓ All dependencies installed

$ forge deployment run
Running ansible playbook...
✓ Complete
```

---

**End of Proposal**
