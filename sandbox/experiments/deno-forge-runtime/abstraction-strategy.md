# Abstraction Strategy for Deno Migration

**Goal:** Isolate runtime-specific APIs behind minimal, focused abstractions
**Principle:** Just enough abstraction to manage platform differences, no more

---

## Strategy Overview

### 1. Package Management Abstraction
**File:** `lib/package-manager.ts` (new)

**Purpose:** Isolate dependency installation logic from runtime APIs

**Implementation:**
```typescript
// lib/package-manager.ts
import { $ } from './runtime';  // Runtime abstraction (no logging yet - that's ok!)
import { getForgeHomePath } from './xdg';
import { getGlobalLogger } from './logging';
import { join } from 'path';
import { existsSync } from 'fs';

const log = getGlobalLogger();

/**
 * Package manager for Deno runtime
 * Handles npm, file:, and git dependencies
 *
 * Logging happens HERE at the framework level, not in runtime wrappers
 */
export class PackageManager {
  async installDependency(dep: string): Promise<boolean> {
    log.debug({ dep }, 'Installing dependency');

    const forgeHome = getForgeHomePath();

    // npm package - add to deno.jsonc
    if (!dep.startsWith('file:') && !dep.startsWith('git+')) {
      log.debug({ dep }, 'npm package - updating deno.jsonc');
      await this.addToDenoConfig(dep);
      return true;
    }

    // file: URL - copy or symlink
    if (dep.startsWith('file:')) {
      const srcPath = dep.replace('file:', '');
      const pkgName = this.extractPackageName(dep);
      const targetPath = join(forgeHome, 'modules', pkgName);

      log.debug({ srcPath, targetPath }, 'Copying file: dependency');
      await $`cp -r ${srcPath} ${targetPath}`;  // $ already logs via runtime

      await this.addToDenoConfig(pkgName, targetPath);
      log.debug({ pkgName }, 'file: dependency installed');
      return true;
    }

    // git URL - clone
    if (dep.startsWith('git+')) {
      const gitUrl = dep.replace('git+', '');
      const [url, ref] = gitUrl.split('#');
      const pkgName = this.extractPackageName(dep);
      const targetPath = join(forgeHome, 'repos', pkgName);

      if (!existsSync(targetPath)) {
        log.debug({ url, targetPath }, 'Cloning git dependency');
        await $`git clone ${url} ${targetPath}`;  // $ already logs
      } else {
        log.debug({ targetPath }, 'Git dependency already cloned');
      }

      if (ref) {
        log.debug({ ref, targetPath }, 'Checking out git ref');
        await $`git checkout ${ref}`.cwd(targetPath);
      }

      await this.addToDenoConfig(pkgName, targetPath);
      log.debug({ pkgName, ref }, 'git dependency installed');
      return true;
    }

    throw new Error(`Unknown dependency format: ${dep}`);
  }

  isInstalled(dep: string): boolean {
    log.trace({ dep }, 'Checking if dependency installed');
    // Check if exists in forge-home or deno.jsonc
    // Implementation details...
  }

  // Private helpers
  private async addToDenoConfig(pkgName: string, path?: string) {
    log.debug({ pkgName, path }, 'Updating deno.jsonc');
    // Update deno.jsonc imports
  }

  private extractPackageName(dep: string): string {
    // Parse package name from URL
  }
}

// Singleton instance
export const packageManager = new PackageManager();
```

**Usage in lib/forge-home.ts:**
```typescript
// Before (Bun-specific)
import { spawn } from 'bun';
export async function installDependency(dep: string) {
  const proc = Bun.spawn(['bun', 'add', dep], ...);
  // ...
}

// After (simple & direct)
import { packageManager } from './package-manager';

export async function installDependency(dep: string) {
  return packageManager.installDependency(dep);
}
```

**Benefits:**
- ✅ All package management logic in one place
- ✅ Easy to test (mock packageManager singleton)
- ✅ Simple, direct usage (no factories or interfaces)
- ✅ Clear separation of concerns

---

### 2. Runtime API Abstraction
**File:** `lib/runtime.ts` (new)

**Purpose:** Isolate platform-specific APIs (file I/O, process, etc.)

**Principle:** Thin wrappers, not a complete abstraction layer

**Interface:**
```typescript
/**
 * Runtime API abstraction
 * Thin wrappers around Deno-specific APIs
 *
 * NEVER import Deno or dax directly - always go through this module
 *
 * Naming: Use same names as underlying APIs (readTextFile, not readFile)
 * Logging: TODO - Add logging later after we verify bootstrap works
 */

// ============================================================================
// Shell / Process Execution
// ============================================================================

// Re-export shell command (hides dax implementation)
export { default as $ } from 'dax';

/**
 * Spawn a process
 * Wraps Deno.Command
 */
export interface SpawnOptions {
  cwd?: string;
  env?: Record<string, string>;
  stdout?: 'inherit' | 'piped' | 'null';
  stderr?: 'inherit' | 'piped' | 'null';
}

export interface SpawnResult {
  code: number;
  stdout: string;
  stderr: string;
}

export async function spawn(
  cmd: string,
  args: string[],
  options?: SpawnOptions
): Promise<SpawnResult> {
  // TODO: Add logging later (bootstrap issue)
  const command = new Deno.Command(cmd, {
    args,
    cwd: options?.cwd,
    env: options?.env,
    stdout: options?.stdout === 'piped' ? 'piped' : options?.stdout || 'inherit',
    stderr: options?.stderr === 'piped' ? 'piped' : options?.stderr || 'inherit',
  });

  const { code, stdout, stderr } = await command.output();

  return {
    code,
    stdout: new TextDecoder().decode(stdout),
    stderr: new TextDecoder().decode(stderr),
  };
}

// ============================================================================
// File I/O
// ============================================================================

/**
 * Read text file
 * Wraps Deno.readTextFile (same name!)
 */
export async function readTextFile(path: string): Promise<string> {
  // TODO: Add logging later (bootstrap issue)
  return Deno.readTextFile(path);
}

/**
 * Write text file
 * Wraps Deno.writeTextFile (same name!)
 */
export async function writeTextFile(path: string, content: string): Promise<void> {
  // TODO: Add logging later (bootstrap issue)
  return Deno.writeTextFile(path, content);
}

/**
 * Read and parse JSON file
 * Extension of readTextFile
 */
export async function readJsonFile<T>(path: string): Promise<T> {
  // TODO: Add logging later (bootstrap issue)
  const text = await Deno.readTextFile(path);
  return JSON.parse(text);
}

/**
 * Write JSON file
 * Extension of writeTextFile
 */
export async function writeJsonFile(path: string, data: unknown): Promise<void> {
  // TODO: Add logging later (bootstrap issue)
  const json = JSON.stringify(data, null, 2);
  return Deno.writeTextFile(path, json);
}

// ============================================================================
// Process Control
// ============================================================================

/**
 * Exit process
 * Wraps Deno.exit (same name!)
 */
export function exit(code: number): never {
  // TODO: Add logging later (bootstrap issue)
  Deno.exit(code);
}

// ============================================================================
// Environment
// ============================================================================

/**
 * Environment variable access
 * Wraps Deno.env
 */
export const env = {
  get(key: string): string | undefined {
    // TODO: Add logging later (bootstrap issue)
    return Deno.env.get(key);
  },

  set(key: string, value: string): void {
    // TODO: Add logging later (bootstrap issue)
    Deno.env.set(key, value);
  },

  has(key: string): boolean {
    return Deno.env.has(key);
  },

  delete(key: string): void {
    // TODO: Add logging later (bootstrap issue)
    Deno.env.delete(key);
  }
};
```

**Usage:**
```typescript
// Before (lib/state.ts - Bun-specific)
const file = Bun.file(filepath);
const data = await file.json();
await Bun.write(filepath, JSON.stringify(data, null, 2));

// After (lib/state.ts - abstracted)
import { readJsonFile, writeJsonFile } from './runtime';

const data = await readJsonFile(filepath);
await writeJsonFile(filepath, data);
```

**Benefits:**
- ✅ Single place to change runtime APIs
- ✅ Easy to grep for runtime dependencies
- ✅ Minimal indirection (thin wrappers)
- ✅ Type-safe

---

### 3. Command Export Pattern - API Isolation via Re-exports
**File:** `lib/command.ts` (update)

**Purpose:** Single import point for command authors, hide ALL implementation details

**Philosophy:**
- Command authors import from `@forge/command` ONLY
- Never expose underlying libraries (dax, Deno, etc.)
- Use import/export aliases to isolate APIs
- Change implementations without breaking commands

**Current:**
```typescript
// Bun-specific - EXPOSES IMPLEMENTATION
export { $ } from 'bun';
```

**New:**
```typescript
// Runtime-agnostic - HIDES IMPLEMENTATION
import { $ as shellCommand } from './runtime';
export { shellCommand as $ };

// Or simpler (just re-export from runtime)
export { $ } from './runtime';
```

**User code (commands):**
```typescript
// Command authors NEVER know about dax, Bun, or Deno
import { $ } from '@forge/command';

await $`git status`;
```

**Implementation chain:**
```
Command → @forge/command → lib/command.ts → lib/runtime.ts → dax
```

**Benefits:**
- ✅ Commands depend on `@forge/command` API, not implementation
- ✅ Can swap dax for something else later
- ✅ Runtime invisible to command authors
- ✅ No user code changes needed

---

## Logging Strategy

**IMPORTANT:** Keep it simple for initial migration!

### Phase 1: No Logging in Runtime Wrappers
- Skip logging in `lib/runtime.ts` functions (bootstrap chicken-and-egg)
- All functions have `// TODO: Add logging later` comments
- Focus on getting migration working first

### Phase 2: Framework-Level Logging (Do This)
Add logging at the **caller level** where it's needed:

**lib/package-manager.ts:**
```typescript
async installDependency(dep: string): Promise<boolean> {
  log.debug({ dep }, 'Installing dependency');
  // ... uses runtime.spawn, but doesn't duplicate logging
  log.debug({ dep }, 'Dependency installed');
}
```

**lib/core.ts:**
```typescript
log.debug({ module, path }, 'Loading module');
```

**lib/config-loader.ts:**
```typescript
log.debug({ path }, 'Loading config');
```

### Phase 3: Revisit Low-Level Logging (Later)
After migration works, we can add logging to runtime wrappers if needed.

### Principles (When We Add Logging)

1. **Use structured logging** - `log.debug({ key: value }, 'message')`
2. **Keep messages terse** - Simple, to the point
3. **Log important operations** - File I/O, process spawning, state changes
4. **Use appropriate levels**:
   - `log.trace()` - Very detailed (env var reads, existence checks)
   - `log.debug()` - Important operations (file reads, process spawns)
   - `log.info()` - User-facing milestones (rarely used in lib/)
   - `log.warn()` - Warnings (unusual conditions)
   - `log.error()` - Errors (failures)

### What to Log

**✅ DO log:**
```typescript
// File operations
log.debug({ path }, 'Reading config file');
log.debug({ path, size }, 'Writing state file');

// External processes
log.debug({ cmd, args }, 'Spawning git clone');
log.debug({ cmd, code }, 'Process exited');

// State changes
log.debug({ dep }, 'Installing dependency');
log.debug({ module }, 'Loading module');

// Important decisions
log.debug({ mode }, 'Auto-install mode enabled');
```

**❌ DON'T log:**
```typescript
// Don't log inside tight loops
for (const item of items) {
  log.debug({ item }, 'Processing');  // ❌ Too noisy
}

// Don't log trivial operations
const x = 1 + 1;
log.debug({ x }, 'Added numbers');  // ❌ Useless

// Don't log secrets
log.debug({ token: process.env.TOKEN }, 'Auth');  // ❌ Security issue
```

### Example Debug Output

**User runs:** `forge hello --debug`

**Output should show:**
```
[DEBUG] Reading config file path=".forge2/config.yml"
[DEBUG] Config loaded modules=2
[DEBUG] Installing dependency dep="cowsay@^1.6.0"
[DEBUG] npm package - updating deno.jsonc
[DEBUG] Writing JSON file path="/Users/jason/.local/share/forge/deno.jsonc"
[DEBUG] Loading module module="hello"
[DEBUG] Executing command command="hello"
```

**With `--log-level=trace`:**
```
[TRACE] Reading env var key="FORGE_HOME" hasValue=true
[DEBUG] Reading config file path=".forge2/config.yml"
[TRACE] File read path=".forge2/config.yml" size=142
[DEBUG] Config loaded modules=2
[TRACE] Checking if dependency installed dep="cowsay@^1.6.0"
[DEBUG] Installing dependency dep="cowsay@^1.6.0"
...
```

### Where Logging Happens

**lib/runtime.ts** - All file/process operations
```typescript
export async function readTextFile(path: string): Promise<string> {
  log.debug({ path }, 'Reading text file');
  const content = await Deno.readTextFile(path);
  log.trace({ path, size: content.length }, 'File read');
  return content;
}
```

**lib/package-manager.ts** - All package operations
```typescript
async installDependency(dep: string): Promise<boolean> {
  log.debug({ dep }, 'Installing dependency');
  // ... implementation
  log.debug({ pkgName }, 'Dependency installed');
}
```

**lib/core.ts** - Module loading
```typescript
log.debug({ module, path }, 'Loading module');
```

**lib/auto-install.ts** - Auto-install flow
```typescript
log.debug({ mode, hasDeps }, 'Auto-install check');
```

### Benefits

- ✅ **Easy debugging** - Run with `--debug` to see what's happening
- ✅ **Diagnosable** - Clear, terse messages show flow
- ✅ **Structured** - Can grep/parse structured logs
- ✅ **Not noisy** - Only important operations logged

### ⚠️ Bootstrap Chicken-and-Egg Problem

**Issue:** Some runtime functions may be called BEFORE logging is initialized.

**Example scenario:**
1. `lib/cli.ts` starts up
2. Needs to read config file → calls `runtime.readTextFile()`
3. `runtime.readTextFile()` tries to log → but logger not initialized yet!

**Potential solutions (evaluate when implementing):**

**Option A: Lazy logger with console fallback**
```typescript
// lib/runtime.ts
import { getGlobalLogger } from './logging';

function getLogger() {
  try {
    return getGlobalLogger();
  } catch {
    // Logger not initialized yet - fallback to console (NEVER drop logs!)
    return {
      debug: (...args: any[]) => console.log('[DEBUG]', ...args),
      trace: (...args: any[]) => console.log('[TRACE]', ...args),
      info: (...args: any[]) => console.log('[INFO]', ...args),
      warn: (...args: any[]) => console.warn('[WARN]', ...args),
      error: (...args: any[]) => console.error('[ERROR]', ...args),
    };
  }
}

export async function readTextFile(path: string): Promise<string> {
  const log = getLogger();  // Safe even if logging not ready
  log.debug({ path }, 'Reading text file');
  // ...
}
```

**Option B: Bootstrap logger**
```typescript
// lib/runtime.ts
import { getGlobalLogger, isLoggingInitialized } from './logging';

let log = console;  // Fallback to console during bootstrap

export function setLogger() {
  if (isLoggingInitialized()) {
    log = getGlobalLogger();
  }
}

export async function readTextFile(path: string): Promise<string> {
  log.debug({ path }, 'Reading text file');  // Works before/after init
  // ...
}
```

**Option C: Guard checks**
```typescript
// lib/runtime.ts
import { getGlobalLogger, isLoggingInitialized } from './logging';

export async function readTextFile(path: string): Promise<string> {
  if (isLoggingInitialized()) {
    const log = getGlobalLogger();
    log.debug({ path }, 'Reading text file');
  }
  // ... rest of function
}
```

**Recommendation:**
- Start with **Option A (lazy logger)** - simplest
- Only add complexity if we hit actual issues
- Most bootstrap operations happen before we care about debug logging anyway

**Note:** This is NOT a blocking issue for migration - just something to handle gracefully during implementation.

---

## File Structure

```
lib/
├── runtime.ts           # NEW - Runtime API wrappers
├── package-manager.ts   # NEW - Package management abstraction
├── command.ts           # UPDATED - Import from ./runtime instead of 'bun'
├── state.ts             # UPDATED - Use runtime.readJsonFile/writeJsonFile
├── forge-home.ts        # UPDATED - Use PackageManager
└── helpers.ts           # UPDATED - Use runtime.exit
```

---

## Migration Steps

### Step 1: Create Abstractions (1 day)

**Create lib/runtime.ts:**
```typescript
// Minimal runtime API wrappers
export { default as $ } from 'dax';
export async function readTextFile(path: string): Promise<string> { ... }
export async function writeTextFile(path: string, content: string): Promise<void> { ... }
export async function readJsonFile<T>(path: string): Promise<T> { ... }
export async function writeJsonFile(path: string, data: unknown): Promise<void> { ... }
export function exit(code: number): never { ... }
export const env = { get, set };
```

**Create lib/package-manager.ts:**
```typescript
export interface PackageManager { ... }
export class DenoPackageManager implements PackageManager { ... }
export function createPackageManager(): PackageManager { ... }
```

### Step 2: Update Consumers (1 day)

**Update lib/command.ts:**
```typescript
- export { $ } from 'bun';
+ export { $ } from './runtime';
```

**Update lib/state.ts:**
```typescript
- const file = Bun.file(filepath);
- const data = await file.json();
+ import { readJsonFile, writeJsonFile } from './runtime';
+ const data = await readJsonFile(filepath);
```

**Update lib/helpers.ts:**
```typescript
- process.exit(code);
+ import { exit } from './runtime';
+ exit(code);
```

**Update lib/forge-home.ts:**
```typescript
- const proc = Bun.spawn(['bun', 'add', dep], ...);
+ import { createPackageManager } from './package-manager';
+ const pm = createPackageManager();
+ await pm.installDependency(dep);
```

### Step 3: Test (1 day)

- Run all tests
- Verify abstractions work
- Check no Bun.* references remain (except dev tools)

---

## What We're NOT Doing

❌ **Full runtime abstraction layer** - Too much overhead
❌ **Plugin system for runtimes** - Not needed
❌ **Abstract every API** - Only what we use
❌ **Heavy dependency injection** - Keep it simple
❌ **Interfaces for unknown future** - YAGNI (You Aren't Gonna Need It)

## What We ARE Doing

✅ **Isolate runtime APIs** - In one place (lib/runtime.ts)
✅ **Isolate package management** - In one place (lib/package-manager.ts)
✅ **Thin wrappers** - Minimal indirection
✅ **Easy to find** - Grep for `from './runtime'` or `from './package-manager'`
✅ **Type-safe** - Full TypeScript support
✅ **Simple & direct** - Classes and singletons, no interfaces/factories unless needed

---

## Benefits

### For Migration
- Clear list of what needs to change
- Easy to review (isolated files)
- Test abstractions independently

### For Maintenance
- All runtime APIs in one place
- Easy to understand platform dependencies
- Simple to update if Deno APIs change

### For Future
- Could support other runtimes (but not the goal)
- Clear separation of concerns
- Easier to reason about

---

## Example: Before/After

### Before (Bun-specific scattered throughout)

```typescript
// lib/state.ts
const file = Bun.file(filepath);
const data = await file.json();

// lib/forge-home.ts
const proc = Bun.spawn(['bun', 'add', dep], ...);

// lib/command.ts
export { $ } from 'bun';  // EXPOSES BUN TO COMMANDS

// lib/helpers.ts
process.exit(1);

// User command code
import { $ } from '@forge/command';  // Gets Bun's $
```

**Problems:**
- ❌ Bun APIs scattered across 4+ files
- ❌ Commands know they're using Bun
- ❌ Hard to swap runtime

### After (Abstracted & isolated)

```typescript
// lib/runtime.ts - ALL runtime APIs here (ONLY file with Deno.* or dax imports)
// ============================================================================
import dax from 'dax';

// Re-export with our own name
export { dax as $ };

// Or if we want to add functionality:
// export const $ = dax;  // Can extend or wrap if needed

export async function spawn(cmd: string, args: string[], opts) { ... }
export async function readJsonFile<T>(path: string): Promise<T> { ... }
export async function writeJsonFile(path: string, data: unknown) { ... }
export function exit(code: number): never { ... }
export const env = { ... };

// ============================================================================

// lib/package-manager.ts - ALL package management here
import { $, spawn } from './runtime';  // Only imports from runtime, never from dax/Deno

export class PackageManager {
  async installDependency(dep: string) {
    // Uses $ and spawn from runtime
    await $`git clone ...`;
  }
}

export const packageManager = new PackageManager();

// ============================================================================

// lib/command.ts - PUBLIC API for command authors (HIDES EVERYTHING)
// ============================================================================
// Re-export runtime APIs for command authors
// Commands ONLY import from here, NEVER from lib/runtime or dax

export { $ } from './runtime';  // Commands get $, don't know it's dax
export { spawn } from './runtime';  // If we expose it

// Also export other command utilities
export { createLogger } from './logging';
export { die, exit, error } from './helpers';
// ... etc

// ============================================================================

// lib/state.ts - Uses abstraction
import { readJsonFile, writeJsonFile } from './runtime';
const data = await readJsonFile(filepath);

// ============================================================================

// lib/forge-home.ts - Uses abstraction
import { packageManager } from './package-manager';
await packageManager.installDependency(dep);

// ============================================================================

// lib/helpers.ts - Uses abstraction
import { exit } from './runtime';

// ============================================================================

// User command code - COMPLETELY ISOLATED FROM IMPLEMENTATION
import { $ } from '@forge/command';  // No idea it's dax/Deno
await $`git status`;
```

**Benefits:**
- ✅ Only 1 file imports from dax (`lib/runtime.ts`)
- ✅ Only 1 file imports from Deno APIs (`lib/runtime.ts`)
- ✅ Commands isolated via `@forge/command`
- ✅ Easy to swap implementations
- ✅ Clear dependency chain:
  ```
  Commands → @forge/command → lib/command.ts → lib/runtime.ts → dax/Deno
  ```

---

## Import Rules (Enforce These)

### ✅ ALLOWED

```typescript
// In lib/runtime.ts ONLY
import dax from 'dax';
import { ... } from 'node:...';  // If needed for Deno compat

// In lib/package-manager.ts
import { $, spawn } from './runtime';

// In lib/command.ts
import { $ } from './runtime';

// In any lib/*.ts file
import { readJsonFile, writeJsonFile, exit, env } from './runtime';
import { createPackageManager } from './package-manager';

// In user commands
import { $, createLogger, ... } from '@forge/command';
```

### ❌ NEVER ALLOWED

```typescript
// NEVER import these directly outside lib/runtime.ts
import { $ } from 'bun';           // ❌
import dax from 'dax';             // ❌
import { ... } from 'node:...';    // ❌ (except in runtime.ts)

// NEVER let commands import internals
import { spawn } from 'lib/runtime';  // ❌ Commands use @forge/command only
```

### Grep Tests to Enforce

```bash
# Should find ONLY lib/runtime.ts
grep -r "from 'dax'" lib/

# Should find ONLY lib/runtime.ts and maybe lib/command.ts
grep -r "from './runtime'" lib/

# Should find NO results (outside test files)
grep -r "from 'bun'" lib/
grep -r "Bun\." lib/

# Command files should only import from @forge/command
grep -r "from '@forge/command'" examples/
```

---

## Checklist

### New Files
- [ ] Create `lib/runtime.ts`
- [ ] Create `lib/package-manager.ts`

### Updates
- [ ] Update `lib/command.ts` - import $ from runtime
- [ ] Update `lib/state.ts` - use runtime.readJsonFile/writeJsonFile
- [ ] Update `lib/helpers.ts` - use runtime.exit
- [ ] Update `lib/forge-home.ts` - use PackageManager

### Verification
- [ ] Grep for `from 'bun'` - should only find in dev/test files
- [ ] Grep for `Bun\.` - should only find in dev/test files
- [ ] Grep for `from './runtime'` - all runtime API usage
- [ ] Grep for `from './package-manager'` - all package mgmt usage

---

## Estimated Time

**With abstractions:**
- Create runtime.ts: 2 hours
- Create package-manager.ts: 4 hours
- Update consumers: 2 hours
- Test: 2 hours
- **Total: +1 day** to migration

**Benefits:**
- Cleaner code
- Easier to maintain
- Clear separation
- Worth the extra day

---

## Recommendation

**Add abstraction layer before migration.**

**Reason:**
1. Makes migration cleaner
2. Makes code more maintainable
3. Only adds 1 day
4. Better architecture

**Approach:**
1. Day 1: Create abstractions (runtime.ts, package-manager.ts)
2. Day 2: Update all consumers
3. Day 3: Test and verify
4. Day 4-5: Finish migration (config, install scripts, docs)

**Total: 5 days instead of 4 days, but much cleaner.**

Make sense?
