# Phase 2: Forge Home & Dependencies

**Issue**: [#11 Phase 2: Meta Project & Dependencies](https://github.com/jdillon/forge/issues/11)
**Status**: Planned
**Started**: TBD
**Completed**: TBD

---

## Overview

Enable projects to declare dependencies in `config.yml` that get installed to forge home (`~/.local/share/forge/node_modules/`). Local modules can then import from these dependencies.

**Core Feature**: Shared dependency storage across all forge projects using forge home.

### Terminology

- **"forge home"** = `~/.local/share/forge/` - Where forge is installed and manages shared dependencies
- **"forge project"** = Any directory with `.forge/` or `.forge2/` - Your actual project with local modules

**Implementation Note**: Use XDG helpers for all paths (e.g., `XDG_DATA_HOME`, `XDG_CONFIG_HOME`, `XDG_CACHE_HOME`). Don't hardcode `~/.local/share`, `~/.config`, etc. Documentation uses literal paths for clarity, but code must use XDG spec.  See `lib/xdg.ts`

---

## Goals

1. Parse `dependencies:` section from config.yml
2. Install dependencies to shared meta project location
3. Implement programmatic module resolver with priority order
4. Auto-install missing dependencies on first use
5. Comprehensive error handling for network, auth, and dependency issues

---

## Success Criteria

- [ ] Can declare dependencies in config.yml
- [ ] Dependencies install to `~/.local/share/forge/node_modules/`
- [ ] Modules load from shared location
- [ ] Local modules can import from installed dependencies
- [ ] Error messages are helpful and actionable
- [ ] Auto-install prompts user on first dependency use
- [ ] Install status is cached for performance

**Example Flow:**

```yaml
# .forge2/config.yml
dependencies:
  - "@aws-sdk/client-s3@^3.0.0"

modules:
  - helper
```

```typescript
// .forge2/helper.ts
import { S3Client } from '@aws-sdk/client-s3';

export const deploy = {
  description: 'Deploy to S3',
  execute: async () => {
    const client = new S3Client({ region: 'us-east-1' });
    // ... deployment logic
  }
};
```

---

## Architecture

### Module Resolution Priority

1. **Local** - `.forge2/modulename.ts` or path in modules list
2. **Shared** - `~/.local/share/forge/node_modules/package-name`

**Note**: Project `node_modules/` is intentionally NOT in resolution path. Forge modules should not depend on project build tooling. If a forge command needs to interact with project dependencies, do it explicitly via `bun` or `npm` CLI from the command itself, not the framework. Clear separation of concerns.

### Resolution Implementation

Use `require.resolve()` with custom `paths` option (programmatic, no env vars):

```typescript
function resolveModule(name: string, projectRoot: string): string {
  const paths = [
    path.join(projectRoot, '.forge2'),
    path.join(os.homedir(), '.local/share/forge/node_modules'),
  ];

  return require.resolve(name, { paths });
}
```

### Dependency Installation

**Location**: `~/.local/share/forge/` (forge home)
**Method**: `bun add <dependency>` from forge home directory
**Triggers**:
- `forge module install` (manual)
- Auto-install on first command that needs dependency (with prompt)

**Forge Home Structure:**
```
~/.local/share/forge/
├── package.json           # Managed by bun (what's installed)
├── bun.lockb              # Managed by bun (version binding)
└── node_modules/
    ├── @aws-sdk/
    │   └── client-s3/
    └── other-packages/
```

**State Tracking**: Use bun's `package.json` and `bun.lockb` - no additional cache files needed.

---

## Implementation Tasks

### 1. Config Parsing

**File**: `lib/config.ts`

- [ ] Add `dependencies?: string[]` to config schema
- [ ] Validate dependency format (name@version, git URLs)
- [ ] Parse and normalize dependency declarations

**Schema:**
```typescript
interface ForgeConfig {
  // ... existing fields
  dependencies?: string[];
}
```

### 2. Forge Home Management

**File**: `lib/forge-home.ts` (new)

- [ ] Initialize forge home if missing
- [ ] Manage `package.json` in forge home
- [ ] Detect installed vs missing dependencies
- [ ] Run `bun add` for missing dependencies
- [ ] Handle git URLs (`github:user/repo`, `git+https://...`)
- [ ] Handle npm packages with versions
- [ ] Track package.json changes (before/after hash)
- [ ] Signal restart needed via exit code

**Functions:**
```typescript
async function ensureForgeHome(): Promise<void>
async function getForgeHomePath(): string
async function installDependency(dep: string): Promise<void>
async function isInstalled(dep: string): Promise<boolean>
async function syncDependencies(config: ForgeConfig): Promise<boolean> // returns true if restart needed
function needsRestart(): void // exits with magic code for wrapper to detect
```

### 3. Module Resolver

**File**: `lib/module-resolver.ts` (new)

- [ ] Implement `resolveModule(name, projectRoot)` function
- [ ] Handle local paths (./foo, ../bar)
- [ ] Handle package names (@scope/package)
- [ ] Priority: local → shared → project
- [ ] Clear error messages when module not found

**Edge Cases:**
- Module exists locally but also in shared (local wins)
- Module not found anywhere (suggest running `forge module install`)
- Circular dependencies (detect and error clearly)

### 4. Auto-Install Flow

**File**: `lib/auto-install.ts` (new)

- [ ] Detect missing/changed dependencies before command execution
- [ ] Check install mode: `auto` (default), `manual`, or `ask`
- [ ] Auto mode: Log changes, install, trigger restart if needed
- [ ] Manual mode: Error with "Run: forge module install"
- [ ] Ask mode: Prompt "Install N dependencies? (Y/n)"
- [ ] Configuration via CLI (`--install-mode`) and config.yml (`installMode`)
- [ ] Auto-restart mechanism:
  - [ ] Compare package.json before/after `bun add`
  - [ ] If changed: Exit with magic code (e.g., 42)
  - [ ] Wrapper detects and re-runs with same args
  - [ ] Guard against infinite loops (max 1 restart via env var)
  - [ ] Clear user feedback during restart

**Install Modes:**
- **auto** (default): Detect changes, log, install automatically, restart if needed
  - Log: "Installing 2 new dependencies: @aws-sdk/client-s3, lodash..."
  - After install: "Restarting to pick up changes..."
  - Re-execute command seamlessly
  - Non-interactive, smooth workflow
- **manual**: Require explicit `forge module install`
  - Error: "Missing dependencies. Run: forge module install"
- **ask**: Prompt user before installing
  - Prompt: "Install 2 new dependencies? (Y/n)"
  - Skip prompt in CI (treat as auto)
  - If yes: Install and restart like auto mode

**Configuration:**
```yaml
# .forge2/config.yml
installMode: auto  # or manual, ask
```

**Note**: This is for **dependency installation** (config.yml changes). **Module/forge upgrades** are separate and should prompt to avoid breaking changes mid-work.

**Restart Mechanism**: After installing dependencies, forge exits with magic code and wrapper re-executes. This ensures new dependencies are available without manual restart. User sees continuous workflow.

### 5. Error Handling & Offline Support

- [ ] Network failures → Suggest retry or use offline mode
- [ ] Auth failures → Link to SSH key / token docs
- [ ] Missing dependencies → Suggest `forge module install`
- [ ] Offline mode (`--offline` or `offline: true` in config)
  - Network required ops (install) → Error with clear message
  - Network optional ops (update checks) → Warn and skip
- [ ] Corrupted state → Auto-clean and reinstall

**Error Message Examples:**

```
❌ Cannot install dependency: @aws-sdk/client-s3

Offline mode is enabled but network is required for installation

Suggestions:
  1. Disable offline mode and retry: forge module install
  2. Install dependencies on a connected machine first
  3. Pre-install all dependencies before working offline
```

```
❌ Failed to install dependency: @aws-sdk/client-s3

Network error: Could not connect to registry

Suggestions:
  1. Check your internet connection
  2. Try again: forge module install
  3. Use offline mode to skip: forge --offline <command>
```

```
❌ Failed to install dependency: github:acme/private-repo

Authentication failed: Permission denied

Suggestions:
  1. Set up SSH key: https://docs.github.com/ssh
  2. Use HTTPS with token: git config --global url."https://token@github.com/".insteadOf "https://github.com/"
  3. Check repo permissions
```

### 6. Dependency Change Detection

**State Tracking**: Use existing mechanisms, no additional cache files.

**What's installed:**
- Check `~/.local/share/forge/package.json` (managed by bun)
- Check `~/.local/share/forge/bun.lockb` (version binding)

**Detect changes:**
- Compare config.yml `dependencies:` with `package.json`
- Missing in package.json → Need to install
- Extra in package.json → Can ignore (manually installed?)

**Per-project state** (if needed):
- Store in existing `.forge2/state.json`
- Track last known config hash to detect changes

**No separate cache file needed** - leverage bun's existing state management.

---

## Testing Strategy

### Unit Tests

**File**: `tests/forge-home.test.ts`

- [ ] Parse dependencies from config
- [ ] Initialize forge home
- [ ] Detect installed vs missing dependencies
- [ ] Handle git URLs
- [ ] Handle npm packages with versions

**File**: `tests/module-resolver.test.ts`

- [ ] Resolve local modules
- [ ] Resolve shared modules
- [ ] Priority order (local > shared)
- [ ] Module not found errors

### Integration Tests

**File**: `tests/integration/dependencies.test.ts`

- [ ] Install dependency and import in module
- [ ] Auto-install flow (with mock prompts)
- [ ] Auto-restart flow (detect exit code, re-run)
- [ ] Multiple dependencies
- [ ] Git dependency
- [ ] npm dependency
- [ ] Error handling (network, auth)
- [ ] Restart guard (prevent infinite loops)
- [ ] No restart when no actual changes

**Test Fixtures:**

```
tests/fixtures/phase2/
├── simple-dependency/
│   ├── .forge2/
│   │   ├── config.yml
│   │   └── helper.ts
├── git-dependency/
│   ├── .forge2/
│   │   ├── config.yml
│   │   └── module.ts
└── multiple-dependencies/
    ├── .forge2/
    │   ├── config.yml
    │   └── deploy.ts
```

---

## Design Decisions

### 1. Shared vs Per-Project Dependencies

**Decision**: Shared forge home
**Rationale**:
- Avoid duplication across projects
- Faster installs (cache shared)
- Simpler upgrade workflow
- Matches npm global install pattern
- Leverages forge home as centralized dependency store

**Trade-off**: Potential version conflicts if two projects need different versions
**Mitigation**: Phase 3+ can add per-project node_modules if conflicts arise

### 2. Auto-Install Behavior

**Decision**: Default to `auto` mode with seamless restart, configurable via `installMode: auto|manual|ask`
**Rationale**:
- **auto** (default): Smooth workflow, log changes, install + restart seamlessly
- **manual**: Explicit control for security-conscious users
- **ask**: Interactive mode for learning/debugging
- CI automatically uses auto mode (no TTY)
- Applies to **dependency installation only**, not forge/module upgrades
- **Restart mechanism**: Exit with magic code, wrapper re-runs, user sees continuous workflow

**Restart Approach**:
- After `bun add`, compare package.json before/after
- If changed: Exit code 42 (or similar magic number)
- Wrapper script detects and re-executes with same arguments
- Second run: No changes, command executes normally
- Guard: Max 1 restart via env var to prevent loops
- Clean UX: "Installing dependencies... Restarting to pick up changes..."

**Note**: This is distinct from **upgrade prompting**. Forge and module version upgrades should prompt to avoid breaking changes mid-work. Don't auto-update forge or imported modules without user consent.

**Alternative considered**: Always prompt
**Rejected because**: Interrupts workflow, annoying for routine dependency additions

**Alternative considered**: Dynamic module loading without restart
**Rejected because**: Complex, fragile, may not work reliably with Bun's module system

### 3. Module Resolution Priority

**Decision**: Local → Shared (no project fallback)
**Rationale**:
- Local modules override shared (explicit control)
- Shared for dependencies declared in config.yml
- **No project node_modules** - clear separation of concerns
- Forge modules should not depend on project build tooling
- If command needs project dependencies, use `bun` or `npm` CLI explicitly

**Alternative considered**: Include project node_modules as fallback
**Rejected because**: Conflates forge and project dependencies, breaks separation of concerns

### 4. Programmatic Resolution vs Env Vars

**Decision**: Use `require.resolve()` with custom paths
**Rationale**:
- Cleaner API
- No env var pollution
- Predictable behavior
- Easier to test

**Alternative considered**: NODE_PATH env var
**Rejected because**: Global state, harder to debug, brittle

---

## Open Questions

1. **Runtime dependency installation** - Seamless restart approach
   - **Problem**: New dependencies installed during runtime may not be available to current process
   - **Solution**: Auto-restart via special exit code

   **Proposed Flow:**
   1. Bootstrap: Load config, detect dependency changes
   2. If changes detected and install mode allows: `bun add ...`
   3. After successful install: Check if actual changes occurred
   4. If changes made: Exit with magic code (e.g., 42 or 77)
   5. Wrapper script (`~/.local/bin/forge`) detects exit code
   6. Wrapper re-executes with same arguments
   7. Second run: No changes, command executes normally

   **User Experience:**
   ```
   $ forge website deploy
   Installing 2 new dependencies: @aws-sdk/client-s3, lodash...
   ✓ Dependencies installed
   Restarting to pick up changes...

   Deploying website to production...
   ✓ Deploy complete
   ```

   **Edge Cases to Handle:**
   - Max 1 restart (prevent infinite loops)
   - Check before/after package.json (only restart if actually changed)
   - Preserve all command arguments
   - Handle Ctrl+C gracefully (no restart on interrupt)
   - Bun might skip install if no actual changes needed

   **TODO**:
   - Choose magic exit code (42? 77? Something unlikely to collide)
   - Update wrapper script to detect and re-run
   - Add restart guard (track in env var or temp file)
   - Test edge cases

---

## Future Considerations (TODOs for later phases)

### CLI + Config Normalization Framework
**TODO**: Design framework for merging CLI flags + config.yml options
- Want both CLI and config.yml for all options (e.g., `--install-mode` / `installMode:`)
- Priority: CLI > Project config > User config > Defaults
- Research: Commander.js extensions? Custom solution?
- **For Phase 2**: Ensure both CLI and config.yml work, can formalize framework later

### Offline Mode
**TODO**: Simple offline support for Phase 2, enhance later
- **Phase 2 approach**: `--offline` flag and `offline: bool` in config
- If network needed and offline: **Error** with clear message
- If network optional (e.g., version update check) and offline: **Warn** and skip
- **Future**: Auto-detect network, smarter offline behavior, cache-only modes

### Version Conflicts
**TODO**: Revisit when we have real use case
- Shared forge home means one version of a dependency across all projects
- **For Phase 2**: Accept this limitation, document it
- **Future**: If conflicts arise in practice, add per-project node_modules or other resolution
- Don't over-engineer before we hit the problem

### Progress Display & Theming
**TODO**: Configurable progress/theme system
- **Phase 2**: Make it awesome by default! Detailed, colorful, progress indicators
  - Example: "Installing 2 dependencies... ⠋ @aws-sdk/client-s3 (1/2) ✓ lodash (2/2)"
- **Follow existing patterns**: Like `--log-format` (pretty|json), `--no-color`
- **Future considerations**:
  - `--progress` flag: `auto|fancy|plain|none`
  - Or overall `--theme` option: `fancy|plain`
  - Useful for CI, scripts, non-TTY environments
  - Auto-detect TTY and adjust defaults
- **For Phase 2**: Focus on awesome, add configurability flag if time permits

---

## Handoff to Phase 3

Once Phase 2 is complete, hand off to Phase 3 with:

**Artifacts:**
- [ ] Working module resolver (local → shared only)
- [ ] Forge home management code (`lib/forge-home.ts`)
- [ ] Dependency installation flow with configurable install modes
- [ ] Auto-install detection using bun's package.json
- [ ] Comprehensive error handling including offline mode
- [ ] Awesome progress indicators (detailed, colorful, real-time)
- [ ] Integration tests for npm dependencies

**Foundation for Phase 3:**
- Module resolver can already handle git URLs via `bun add`
- Error handling framework in place (network, auth, offline)
- State tracking pattern established (bun's package.json + state.json)
- Installation flow works for both npm and git
- Forge home pattern established and working
- Awesome progress/UX patterns in place

**Documentation:**
- [ ] Update `docs/wip/module-system/README.md` with Phase 2 status
- [ ] Create `docs/wip/module-system/phase2-summary.md` (like phase1-summary.md)
- [ ] Document any design changes or lessons learned

---

## Progress Notes

*(Update as work progresses)*

### 2025-11-01

- Phase 2 planning document created
- Reviewed GitHub issue #11
- Identified key design decisions and open questions
- Created testing strategy
- **Terminology decision**: Use "forge home" instead of "meta-project"
  - More intuitive and clear for users
  - Distinguishes from "forge project" (user's project with `.forge2/`)
  - Follows established tool patterns (`$HOME`, `$GOROOT`, etc.)
- **Key clarifications**:
  - Module resolution: Local → Shared only (no project node_modules)
  - State tracking: Use bun's package.json/lockb (no separate cache file)
  - Auto-install: Three modes (auto/manual/ask), default to auto
  - Offline mode: Simple flag for Phase 2, enhance later
  - Progress: Make it awesome by default!
- **Restart mechanism designed**: Auto-restart via magic exit code for seamless dependency installation
- **TODOs captured** for future phases (CLI+config framework, theming, version conflicts)
- Ready to start implementation after Phase 1 review
