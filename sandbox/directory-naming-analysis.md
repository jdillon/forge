# Directory Naming Analysis & Recommendations

**Date**: 2025-11-09
**Status**: Proposal
**Context**: Simplify and clarify directory naming scheme across codebase

---

## Current State

### The Directories

We work with four key directories:

1. **`userDir`** - Where the user ran `forge` from (CWD)
   - Example: `/Users/jason/mysite/src/components`
   - Used to: Discover project (walk up tree)
   - Type: Always set (it's process.cwd())

2. **`forge-home`** - User's Forge home directory
   - Default: `~/.forge`
   - Override: `$FORGE_HOME` environment variable
   - Contains: User config, state, cache, logs, shared modules
   - Type: Always set (defaults to `~/.forge`)

3. **`projectRoot`** - The project directory
   - Example: `/Users/jason/mysite`
   - How: Parent of `.forge/` directory
   - Used to: Resolve relative paths, detect project boundary
   - Type: Optional (may not be in a project)

4. **`forgeDir`** - Project's Forge directory
   - Current: `/Users/jason/mysite/.forge2/`
   - Future: `/Users/jason/mysite/.forge/`
   - Contains: Project config, project modules, project state
   - Type: Optional (may not be in a project)

### The Problem

**Naming is confusing:**
- `forge-home` vs `forgeDir` - both have "forge", unclear which is which
- `forgeDir` doesn't convey it's project-specific
- No consistent pattern (kebab-case vs camelCase, "Dir" suffix inconsistent)
- Variable names don't clearly indicate scope (user vs project)

**Examples of confusion:**
```typescript
// Which is which?
const forgeHome = getForgeHome();
const forgeDir = config.forgeDir;

// Reading code - not obvious:
await loadConfig(forgeDir);  // Project config or user config?
await saveState(forgeHome);  // User state or project state?
```

---

## Naming Principles

Good directory names should:
1. **Indicate scope** - User-level vs Project-level vs Runtime
2. **Use consistent pattern** - Same naming style throughout
3. **Be unambiguous** - No confusion between similar names
4. **Be concise** - Not overly verbose

---

## Proposal 1: Scope-Based Naming

Use scope as primary distinguisher: `user*` vs `project*` vs `cwd`

### Proposed Names

| Current | Proposed | Scope | Example | Description |
|---------|----------|-------|---------|-------------|
| `userDir` | **`cwd`** | Runtime | `/Users/jason/mysite/src` | Where user ran command |
| `forge-home` | **`userRoot`** | User | `~/.forge` | User's Forge home |
| `projectRoot` | **`projectRoot`** | Project | `/Users/jason/mysite` | Project directory |
| `forgeDir` | **`projectForgeDir`** | Project | `/Users/jason/mysite/.forge` | Project's `.forge/` |

### Usage Examples

```typescript
// Clear scope distinction
import { getUserRoot, getProjectRoot } from './paths';

const userRoot = getUserRoot();           // ~/.forge
const userConfig = join(userRoot, 'config');
const userState = join(userRoot, 'state');

const projectRoot = config.projectRoot;   // /Users/jason/mysite
const projectForgeDir = config.projectForgeDir;  // /Users/jason/mysite/.forge
const projectConfig = join(projectForgeDir, 'config.yml');

// At a glance, clear what scope we're in
await loadUserConfig(userRoot);
await loadProjectConfig(projectForgeDir);
```

**Pros:**
- Scope is immediately obvious
- User vs project distinction is clear
- Consistent pattern (user* vs project*)

**Cons:**
- `userRoot` doesn't convey it's Forge-specific
- `projectForgeDir` is verbose
- "Root" might imply filesystem root to some

---

## Proposal 2: Location-Based Naming

Use location type: `home` vs `project` vs `working`

### Proposed Names

| Current | Proposed | Scope | Example | Description |
|---------|----------|-------|---------|-------------|
| `userDir` | **`workingDir`** | Runtime | `/Users/jason/mysite/src` | Where user ran command |
| `forge-home` | **`homeDir`** | User | `~/.forge` | User's Forge home |
| `projectRoot` | **`projectDir`** | Project | `/Users/jason/mysite` | Project directory |
| `forgeDir` | **`projectConfigDir`** | Project | `/Users/jason/mysite/.forge` | Project's `.forge/` |

### Usage Examples

```typescript
import { getHomeDir, getProjectDir } from './paths';

const homeDir = getHomeDir();                    // ~/.forge
const projectDir = config.projectDir;            // /Users/jason/mysite
const projectConfigDir = config.projectConfigDir; // /Users/jason/mysite/.forge

// Clear what location we're referring to
await loadConfig(homeDir);
await loadConfig(projectConfigDir);
```

**Pros:**
- "Home" clearly means user's home (like $HOME)
- "Working" is standard terminology (like git)
- Consistent pattern (all end in Dir)

**Cons:**
- `homeDir` vs `$HOME` might be confusing
- Doesn't emphasize the scope difference as strongly

---

## Proposal 3: Hybrid Approach (RECOMMENDED)

Combine best of both: Use standard terms + Forge prefix where needed

### Proposed Names

| Current | Proposed | Scope | Example | Description |
|---------|----------|-------|---------|-------------|
| `userDir` | **`cwd`** | Runtime | `/Users/jason/mysite/src` | Where user ran command |
| `forge-home` | **`forgeHome`** | User | `~/.forge` | User's Forge home |
| `projectRoot` | **`projectRoot`** | Project | `/Users/jason/mysite` | Project directory |
| `forgeDir` | **`projectDir`** | Project | `/Users/jason/mysite/.forge` | Project's `.forge/` |

### Rationale

- **`cwd`** - Standard abbreviation (current working directory), used everywhere
- **`forgeHome`** - Clearly Forge-specific, parallels `$HOME`, `$FORGE_HOME`
- **`projectRoot`** - Clear it's the top-level project dir (like git repo root)
- **`projectDir`** - Project's Forge directory (the `.forge/` inside the project)

### Usage Examples

```typescript
import { getForgeHome } from './paths';

const forgeHome = getForgeHome();          // ~/.forge
const projectRoot = config.projectRoot;    // /Users/jason/mysite
const projectDir = config.projectDir;      // /Users/jason/mysite/.forge
const cwd = config.cwd;                    // /Users/jason/mysite/src

// Clear and concise
const userConfig = join(forgeHome, 'config', 'user.yml');
const projectConfig = join(projectDir, 'config.yml');
const relativeToProject = relative(projectRoot, cwd);

// Functions are unambiguous
await loadUserState(forgeHome);
await loadProjectState(projectDir);
```

**Pros:**
- Uses standard terminology (cwd, home, root)
- `forgeHome` is clearly Forge-specific
- `projectDir` is concise (context makes it clear it's `.forge/`)
- Familiar to developers (git uses similar terms)

**Cons:**
- `projectRoot` vs `projectDir` distinction requires documentation
- Could argue `projectDir` should be `projectForgeDir` for clarity

---

## Comparison Table

| Scenario | Current | Proposal 1 | Proposal 2 | Proposal 3 |
|----------|---------|------------|------------|------------|
| User config | `forge-home/config` | `userRoot/config` | `homeDir/config` | `forgeHome/config` |
| User state | `forge-home/state` | `userRoot/state` | `homeDir/state` | `forgeHome/state` |
| User modules | `forge-home/node_modules` | `userRoot/node_modules` | `homeDir/node_modules` | `forgeHome/node_modules` |
| Project config | `forgeDir/config.yml` | `projectForgeDir/config.yml` | `projectConfigDir/config.yml` | `projectDir/config.yml` |
| Project root | `projectRoot` | `projectRoot` | `projectDir` | `projectRoot` |
| Working dir | `userDir` | `cwd` | `workingDir` | `cwd` |

---

## Recommended: Proposal 3 (Hybrid)

**Names:**
- `cwd` - Current working directory (where user ran `forge`)
- `forgeHome` - User's Forge home (`~/.forge`)
- `projectRoot` - Project directory (parent of `.forge/`)
- `projectDir` - Project's Forge directory (`.forge/` inside project)

**Why:**
1. **Familiar** - Uses standard terms developers already know
2. **Concise** - Shortest while remaining clear
3. **Unambiguous** - Each name is distinct
4. **Scalable** - Pattern works if we add more dirs later

**Documentation needed:**
- Clarify `projectRoot` vs `projectDir` distinction
- Show examples in code comments
- Update architecture docs

---

## Implementation Plan

### Phase 1: Add Aliases (No Breaking Changes)

```typescript
// lib/types.ts
export interface ForgeConfig {
  // Legacy names (deprecated)
  /** @deprecated Use cwd instead */
  userDir: FilePath;
  /** @deprecated Use projectDir instead */
  forgeDir?: FilePath;

  // New names
  cwd: FilePath;                    // Current working directory
  forgeHome: FilePath;              // User's Forge home (~/.forge)
  projectRoot?: FilePath;           // Project directory (unchanged)
  projectDir?: FilePath;            // Project's .forge/ directory

  // ... rest
}
```

Populate both old and new names in config-resolver.

### Phase 2: Update Internal Code

```typescript
// Update function signatures
async function loadConfig(projectDir: string) {  // was: forgeDir
  // ...
}

// Update variable names throughout
const projectDir = config.projectDir;  // was: forgeDir
const forgeHome = getForgeHome();       // was: forge-home
const cwd = config.cwd;                 // was: userDir
```

Files to update:
- `lib/types.ts` - Type definitions
- `lib/config-resolver.ts` - Config resolution
- `lib/forge-home.ts` - Already uses `forgeHome` ✅
- `lib/module-resolver.ts` - Uses `forgeDir`
- `lib/module-symlink.ts` - Uses `forgeDir`
- `lib/auto-install.ts` - Uses `forgeDir`
- `lib/builtins.ts` - Uses `projectRoot`, `forgeDir`
- `tests/**/*.test.ts` - All test files

### Phase 3: Remove Deprecated Names

After a few versions, remove the old names:

```typescript
export interface ForgeConfig {
  cwd: FilePath;
  forgeHome: FilePath;
  projectRoot?: FilePath;
  projectDir?: FilePath;
}
```

---

## Additional Considerations

### Environment Variables

Current:
- `FORGE_HOME` - User's Forge home (overrides `~/.forge`)
- `FORGE_PROJECT` - Project root (overrides auto-discovery)

Keep as-is (standard practice uses SCREAMING_SNAKE_CASE).

### Directory Structure Documentation

Should update docs to use consistent terminology:

```markdown
# Forge Directory Structure

Forge uses three main directories:

1. **Forge Home** (`~/.forge` or `$FORGE_HOME`)
   - User-level shared location
   - Config: `~/.forge/config/`
   - State: `~/.forge/state/`
   - Cache: `~/.forge/cache/`
   - Shared modules: `~/.forge/node_modules/`

2. **Project Directory** (`<project>/.forge/`)
   - Project-specific Forge configuration
   - Config: `.forge/config.yml`
   - Modules: `.forge/modules/` (optional)
   - State: `.forge/state.json` (gitignored)

3. **Project Root** (`<project>/`)
   - The project itself (parent of `.forge/`)
   - Contains your code, package.json, etc.

Forge also tracks the **current working directory** (cwd) where you ran the `forge` command.
```

---

## Questions for Jason

1. **Which proposal do you prefer?**
   - Proposal 1: Scope-based (`userRoot`, `projectForgeDir`)
   - Proposal 2: Location-based (`homeDir`, `projectConfigDir`)
   - Proposal 3: Hybrid (`forgeHome`, `projectDir`) ← recommended
   - Something else?

2. **Is `projectDir` clear enough?**
   - Or should it be `projectForgeDir` to be explicit?
   - Trade-off: Clarity vs brevity

3. **Phase 1 aliases - worth it?**
   - Allows gradual migration
   - Or just breaking change in one go?
   - Since this is alpha, probably fine to just change?

4. **Any other directories to consider?**
   - Module cache location?
   - Temp/scratch space?
   - Log directories?

---

## Jason's Feedback: Consistent Prefixes

**Key insight**: Don't need lots of separate names, just need consistent prefixes.

**Proposed naming (from Java conventions like `user.dir`, `user.home`):**

```
* user-dir, $CWD: current working directory (where command was run)
* user-home(-dir), $HOME: user's home directory (/Users/jason)

* forge-home-(dir), $FORGE_HOME: where forge framework has been installed
    * package.json
    * tsconfig.json
    * bunfig.toml
    * node_modules/
    * state/

* project-dir: where forge is being used as a command framework
    * .forge/ -> project-forge-dir: <project-dir>/.forge
```

**Naming conventions by context:**
- Discussion: kebab-case (`user-dir`, `forge-home`, `project-forge-dir`)
- Code: camelCase (`userDir`, `forgeHome`, `projectForgeDir`)
- Environment: UPPER_CASE (`$CWD`, `$HOME`, `$FORGE_HOME`)

**Pattern:**
- `user-*` prefix: User-level paths (standard OS concepts)
- `forge-*` prefix: Forge framework paths (installation + extensions + state)
- `project-*` prefix: Project-specific paths

**Key point:** `forge-home` is both installation and user data location. The framework, its extensions (node_modules), and user state all live together. Installation and home are intentionally overlapped.

**Mapping to code:**

```typescript
interface ForgeConfig {
  userDir: FilePath;              // Current working directory (cwd)
  forgeHome: FilePath;            // Forge installation + user data (~/.forge)
  projectDir?: FilePath;          // Project root (parent of .forge/)
  projectForgeDir?: FilePath;     // Project's .forge/ directory
}
```

**Benefits:**
- Consistent prefix-based scoping
- Clear distinction between framework and user/project
- Familiar to Java developers (`user.dir`, `user.home`)
- Scales well (add more with same prefixes)
- Framework and extensions live together (no split install/data dirs)

---

## Original Recommendation (Superseded)

**Go with Proposal 3 (Hybrid Approach):**

```typescript
interface ForgeConfig {
  cwd: FilePath;              // Where user ran command
  forgeHome: FilePath;        // ~/.forge
  projectRoot?: FilePath;     // /Users/jason/mysite
  projectDir?: FilePath;      // /Users/jason/mysite/.forge
}
```

**Implementation:**
1. Direct rename (no aliases) since we're in alpha
2. Update all files in one commit
3. Update documentation
4. Add clear comments in types.ts explaining each
5. Total effort: ~1-2 hours

**Benefits:**
- Clear, concise, familiar terminology
- No ambiguity between user and project scope
- Matches conventions from other tools (git, npm, etc.)
- Easy to document and teach
