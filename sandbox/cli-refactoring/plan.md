# CLI Refactoring Plan

**Goal**: Simplify cli.ts by extracting config resolution and making Forge a proper facade for command management.

**Context**: cli.ts is currently ~470 lines doing too much: bootstrap, config loading, dependency installation, symlink management, and CLI execution. We want to reduce it to ~100 lines focused on orchestration.

---

## Architecture Overview

### Phase Flow

**1. CLI Bootstrap** (cli.ts)
- Parse CLI args to extract forge options (--debug, --root, --log-level, etc.)
- Minimal, careful about imports
- No logging yet

**2. Config Resolution** (NEW: lib/config-resolver.ts)
- Input: bootstrap options + env vars
- Discover project (.forge directory)
- Read .forge/config.yml (if exists)
- **DEFERRED**: Full merge strategy (.forge config → forge-home config → defaults)
  - For now: just load .forge/config.yml if present
  - Comment where merge logic will go
- **DEFERRED**: Extended ENV var support
  - Keep existing ENV handling (FORGE_HOME, etc.)
  - Comment where additional ENV handling will go
- Private `log()` function:
  - Option A: Simple console.log wrapper
  - Option B: Bootstrap Pino logger (isolated, no module logger)
  - To be replaced later with proper bootstrap logger
- Output: `ResolvedConfig` object
  ```typescript
  interface ResolvedConfig {
    projectPresent: boolean;
    projectRoot?: string;
    forgeDir?: string;
    userDir: string;
    // ... all config needed to initialize Forge
    // Includes: modules, dependencies, settings, etc.
  }
  ```

**3. Logging Bootstrap** (cli.ts)
- `initLogging(resolvedConfig)`
- Now safe to log everywhere else

**4. Forge Initialization** (core.ts - Forge class)
- Constructor: `new Forge(resolvedConfig)`
- Initialization logic:
  - **With project** (`resolvedConfig.projectPresent === true`):
    - Symlink setup (call isolated helper from module-symlink.ts)
    - Load command modules (triggers dependency resolution)
    - Load builtins (including project-context-aware ones)
    - If dependencies changed: throw `ExitNotification(RESTART_EXIT_CODE)`
  - **Without project** (`resolvedConfig.projectPresent === false`):
    - Load builtins (only non-project-context-aware ones)
    - If needed (future: forge auto-update): throw `ExitNotification(code)`

**5. Restart Check** (cli.ts)
- Catch `ExitNotification` exception
- CLI owns `process.exit()`, not Forge
- `if (err instanceof ExitNotification) exit(err.exitCode)`

**6. CLI Execution** (cli.ts)
- Create Commander program with common options
- `forge.buildCLI(program)` - Forge adds commands to program
- `program.parseAsync(args)`
- Handle Commander error codes
- Adapt to Forge exit notifications

---

## Responsibilities by Module

### **cli.ts** (~100 lines)
- Bootstrap arg parsing (phase 1)
- Call config resolver
- Initialize logging
- Create Forge instance
- Restart handling (catch ExitNotification, call exit())
- Create Commander program with common options
- Call forge.buildCLI(program)
- Execute program
- Commander error code adaptation
- Top-level error handling (console.error vs log.error)

### **config-resolver.ts** (NEW)
- Discover project (.forge dir)
- Read .forge/config.yml (yaml parse)
- Merge strategy (DEFERRED - commented)
- ENV var handling (keep existing, comment future)
- Private `log()` function for tracing
- Returns `ResolvedConfig`
- Error handling: throw on critical failures (e.g., yaml parse error)

### **core.ts (Forge class)**
- Command management facade
- Constructor accepts `ResolvedConfig`
- Module loading (calls symlink helper)
- Builtin loading with project-context filtering
- Dependency coordination
- Throws `ExitNotification` for restart
- `buildCLI(program: Command)` - adds commands to provided program

### **module-symlink.ts** (existing, may move later)
- Symlink setup helper
- Called by Forge during module loading
- Decision: Keep in Forge for now, not in config-resolver
- Isolated so we can move it later if needed

---

## Open Questions - RESOLVED

### 1. Symlink timing
**Answer**: B - In Forge during module loading
- Isolated helper in module-symlink.ts
- Deferred until module import
- May move later if needed

### 2. ResolvedConfig shape
**Answer**: Include all:
```typescript
interface ResolvedConfig {
  projectPresent: boolean;      // Is there a .forge directory?
  projectRoot?: string;          // Fully resolved project root
  forgeDir?: string;             // Fully resolved .forge2 directory
  userDir: string;               // User's working directory
  // From bootstrap:
  debug: boolean;
  quiet: boolean;
  silent: boolean;
  logLevel: string;
  logFormat: 'json' | 'pretty';
  colorMode: ColorMode;
  // From .forge/config.yml (if present):
  modules?: string[];
  dependencies?: string[];
  settings?: Record<string, any>;
  installMode?: 'auto' | 'manual' | 'ask';
  // All config needed to initialize Forge
}
```

### 3. Builtin project filtering
**Answer**: Per-command, not per-module
- Need flag on command registration
- **DEFERRED**: Implementation details
- **ACTION**: Add TODO comment at builtin registration point
- For now: Register all builtins, they can check context internally

### 4. Restart signal shape
**Answer**: Throwable notification
- Use existing `ExitNotification` pattern
- `throw new ExitNotification(RESTART_EXIT_CODE)`
- Consistent with current command exit handling
- Works well with test isolation

### 5. Config resolver logging
**Answer**: Private log() function
- Option A: `const log = (msg: string) => console.log(msg)`
- Option B: Bootstrap Pino instance (isolated, no module logger)
- To be replaced later with proper bootstrap logger
- Use `log.debug()` style everywhere

---

## Edge Cases

### Config file has errors (yaml parse failure)
**Handling**: Throw exception with details, cli.ts error handler shows error + trace

### Conflicting CLI options (--debug --silent)
**Handling**: TODO for future - add comment
- Current: Last wins or undefined behavior
- Future: Validation logic

### Invalid project structure (.forge exists but no config.yml)
**Handling**: Log warning, continue bootup
- Project context present
- No modules configured
- Load builtins (non-project-aware only? or all?)

### Circular module dependencies
**Handling**: Bun handles dependency resolution
- We abstract config to YAML but Bun resolves
- Expect exception if Bun operation fails
- Let it bubble up, cli.ts error handler shows it

---

## Implementation Steps

1. **Create config-resolver.ts**
   - Project discovery logic (from cli.ts)
   - Read .forge/config.yml
   - Return ResolvedConfig
   - Add private log() function
   - Comment DEFERRED merge strategy

2. **Update cli.ts**
   - Remove project discovery
   - Remove config loading
   - Remove dependency installation
   - Add config-resolver call
   - Simplify to orchestration only
   - Update forge.buildCLI() to accept program

3. **Update Forge class**
   - Constructor accepts ResolvedConfig
   - Move dependency installation into init
   - Throw ExitNotification for restart
   - buildCLI(program) signature change
   - Add TODO for builtin project filtering

4. **Test and verify**
   - All existing tests pass
   - No-project scenarios work
   - Restart flow works
   - Error handling works

---

## Future Work (Not in this refactor)

- Full config merge strategy (user → project → forge-home → defaults)
- Extended ENV var support
- Bootstrap logger (special Pino setup)
- Builtin project-context filtering implementation
- CLI option conflict validation
- Per-context named loggers (vs module loggers)
- Config file format support (.ts config files)

---

## Success Criteria

- ✅ cli.ts reduced to ~100 lines
- ✅ All await import() calls moved out of cli.ts
- ✅ Forge is proper facade for command management
- ✅ Config resolution isolated in config-resolver.ts
- ✅ All existing tests pass
- ✅ No-project scenarios work
- ✅ Restart mechanism works
- ✅ Clear separation of concerns
