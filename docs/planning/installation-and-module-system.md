# Forge Module System - Specification

**Version**: 1.0.0-draft
**Date**: 2025-11-01
**Status**: Design Phase

---

## Table of Contents

1. [Overview](#overview)
2. [Design Principles](#design-principles)
3. [Architecture](#architecture)
4. [Installation](#installation)
5. [Module System](#module-system)
6. [Configuration](#configuration)
7. [Directory Layout](#directory-layout)
8. [Module Resolution](#module-resolution)
9. [Upgrade Workflow](#upgrade-workflow)
10. [Implementation Phases](#implementation-phases)

---

## Overview

This specification defines the installation, upgrade, and module system for Forge. The system enables:

- **Simple installation** via one-line install script
- **Shared module storage** using a meta-project pattern
- **Flexible module sources** (local files, git repositories, npm packages)
- **Easy upgrades** without file locking issues
- **Clean separation** between tool installation and module management

### Goals

- ✅ Keep it simple - Don't over-engineer
- ✅ Work with Bun, not against it - Embrace tool conventions
- ✅ Focus on productivity - Get to writing commands quickly
- ✅ Clean architecture - Maintainable and understandable

---

## Design Principles

### The Mantra

1. **Keep it simple** - Don't over-engineer
2. **Consider future, don't implement for it** - Design can support features we implement later
3. **Embrace the tools** - Work with Bun's conventions
4. **Don't fight standards** - Accept tool defaults when reasonable
5. **Focus on productivity** - Optimize for end-user experience

### Scope

**NOW (Phase 1)**:
- Local modules: `- helper` or `- ./path/to/module`
- Git repos: `- github:user/repo#branch`
- Module dependencies in config.yml
- Basic installation and upgrade

**LATER (Phase 2+)**:
- npm registry support (GitHub/GitLab packages)
- Multiple modules per package
- Module aliasing (`as: newname`)
- Per-project node_modules (if conflicts arise)
- Auto-update checking

---

## Architecture

### Overview Diagram

```
┌─────────────────────────────────────────────────────────┐
│  User runs: forge website deploy                        │
└────────────┬────────────────────────────────────────────┘
             │
             ▼
┌─────────────────────────────────────────────────────────┐
│  ~/.local/bin/forge                                      │
│  (Bash wrapper script)                                   │
└────────────┬────────────────────────────────────────────┘
             │
             ▼
┌─────────────────────────────────────────────────────────┐
│  ~/.local/share/forge/node_modules/@planet57/forge/     │
│  (Real CLI implementation)                               │
│  - Bootstrap & argument parsing                          │
│  - Project discovery                                     │
│  - Config loading                                        │
└────────────┬────────────────────────────────────────────┘
             │
             ▼
┌─────────────────────────────────────────────────────────┐
│  Module Resolution                                       │
│  1. Local: .forge2/website.ts                           │
│  2. Shared: ~/.local/share/forge/node_modules/...       │
│  3. Project: <project>/node_modules/... (optional)      │
└────────────┬────────────────────────────────────────────┘
             │
             ▼
┌─────────────────────────────────────────────────────────┐
│  Execute Command                                         │
│  website.deploy(options, args, context)                 │
└─────────────────────────────────────────────────────────┘
```

### Key Components

1. **Wrapper Script** (`~/.local/bin/forge`)
   - Lightweight bash script
   - Delegates to real CLI
   - Potential for env setup, version checking, etc.

2. **Meta Project** (`~/.local/share/forge/`)
   - Standard Bun project (package.json + node_modules)
   - Shared location for forge core and modules
   - Managed via `bun add/update/remove`

3. **Real CLI** (`~/.local/share/forge/node_modules/@planet57/forge/`)
   - Actual forge implementation
   - All business logic
   - Can be updated independently

4. **Module Resolver**
   - Programmatic resolution (no env vars)
   - Checks multiple locations in priority order
   - Handles local, git, and npm sources

---

## Installation

### User Experience

**One-line install**:
```bash
curl -fsSL https://raw.githubusercontent.com/jdillon/forge/main/install.sh | bash
```

### Install Script Responsibilities

The `install.sh` script:

1. **Check prerequisites**
   - Verify Bun is installed
   - If not installed:
     - Check if Homebrew is available (macOS/Linux)
     - If yes: Suggest `brew install oven-sh/bun/bun`
     - If no: Direct user to https://bun.sh for installation instructions
     - Exit with clear message
   - Check for required directories
   - Verify Git is installed (required for git dependencies)

2. **Create meta project**
   ```bash
   mkdir -p ~/.local/share/forge
   cd ~/.local/share/forge
   echo '{"name":"forge-meta","version":"1.0.0"}' > package.json
   ```

3. **Install forge**
   ```bash
   bun add github:jdillon/forge#module-system
   ```

4. **Create wrapper script**
   ```bash
   mkdir -p ~/.local/bin
   cat > ~/.local/bin/forge << 'EOF'
   #!/usr/bin/env bash
   # Forge wrapper
   exec bun ~/.local/share/forge/node_modules/@planet57/forge/cli.ts "$@"
   EOF
   chmod +x ~/.local/bin/forge
   ```

5. **Verify installation**
   ```bash
   ~/.local/bin/forge --version
   ```

6. **Provide PATH instructions** (if needed)
   - Check if `~/.local/bin` is in PATH
   - Print instructions to add it if not

### Installation Locations

```
~/.local/
├── bin/
│   └── forge                              # Wrapper script
└── share/
    └── forge/
        ├── package.json                   # Meta project
        ├── bun.lock                       # Bun lockfile
        └── node_modules/
            └── @planet57/forge/           # Forge core
                ├── package.json
                ├── cli.ts                 # Entry point
                └── lib/
                    ├── core.ts            # Framework
                    └── builtin/           # Built-in commands
                        └── core.ts        # upgrade, version, help
```

### Prerequisites

- **Bun** (required): JavaScript runtime and package manager
  - User must install Bun before running forge install script
  - Installation methods:
    - Homebrew: `brew install oven-sh/bun/bun`
    - Direct: `curl -fsSL https://bun.sh/install | bash`
    - See: https://bun.sh
- **Git** (required): For installing from git repositories
  - Usually pre-installed on macOS/Linux
- **~/.local/bin in PATH** (recommended): Standard user binary location
  - Most shells include this by default
  - Install script will check and provide instructions if needed

**Supported Platforms**: macOS and Linux only. Windows is not supported.

**Note**: Future versions may support automated Bun installation or bundled Bun runtime. For now, keeping it simple by requiring user to install Bun first.

---

## Module System

### Module Types

#### 0. Built-in Commands

**Location**: `lib/builtin/` within forge core package

**Example**:
```typescript
// lib/builtin/core.ts
export const __module__ = {
  group: false  // Top-level commands, no grouping
};

export const upgrade: ForgeCommand = {
  description: 'Upgrade forge to latest version',
  execute: async () => { /* ... */ }
};

export const version: ForgeCommand = {
  description: 'Show forge version',
  execute: async () => { /* ... */ }
};

export const help: ForgeCommand = {
  description: 'Show help information',
  execute: async () => { /* ... */ }
};
```

**Result**:
- `forge upgrade` (not `forge core upgrade`)
- `forge version`
- `forge help`

**Use case**: Core functionality always available (upgrade, version, help)

**Note**: Built-in commands are loaded automatically before user modules.

**Implementation flexibility**: If all commands in one file becomes unwieldy, can split into:
```
lib/builtin/
├── upgrade.ts    # forge upgrade
├── version.ts    # forge version
└── help.ts       # forge help
```
Each with `__module__: { group: false }`. Will determine best approach during implementation.

#### 1. Local Modules (Project-Specific)

**Location**: `.forge2/*.ts` in project directory

**Example**:
```
myproject/
└── .forge2/
    ├── config.yml
    ├── helper.ts          # Local module
    └── deploy.ts          # Local module
```

**Config**:
```yaml
modules:
  - helper
  - deploy
```

**Use case**: Project-specific commands and workflows

#### 2. Shared Modules (Git Repositories)

**Location**: `~/.local/share/forge/node_modules/` after installation

**Example repository**:
```
forge-standard/
├── package.json
├── aws.ts              # Module file
├── terraform.ts        # Module file
└── help.ts             # Module file
```

**package.json**:
```json
{
  "name": "@planet57/forge-standard",
  "version": "1.0.0",
  "type": "module",
  "exports": {
    "./aws": "./aws.ts",
    "./terraform": "./terraform.ts",
    "./help": "./help.ts"
  }
}
```

**Config**:
```yaml
dependencies:
  - github:planet57/forge-standard#main

modules:
  - @planet57/forge-standard/aws
  - @planet57/forge-standard/terraform
```

**Use case**: Reusable modules across multiple projects

#### 3. npm Packages (Future)

**Location**: `~/.local/share/forge/node_modules/` after installation

**Config**:
```yaml
dependencies:
  - "@aws-sdk/client-s3@^3.0.0"

modules:
  - @planet57/forge-aws
```

**Use case**: Published packages from GitHub/GitLab package registries

---

## Configuration

### Format: YAML

All configuration uses YAML (not JSON) for readability and comments.

### Location: `.forge2/config.yml`

Project-specific configuration file.

### Structure

```yaml
# .forge2/config.yml

# Dependencies: Module packages to install
dependencies:
  - github:planet57/forge-standard#main
  - github:acme/forge-aws#v1.0.0
  - "@aws-sdk/client-s3@^3.0.0"

# Modules: What to load (local or from dependencies)
modules:
  - helper                           # Local: .forge2/helper.ts
  - @planet57/forge-standard/aws     # From dependency
  - @planet57/forge-standard/terraform
  - @acme/forge-aws                  # Whole package

# Optional: State configuration
state:
  storage: file  # or sqlite (future)

# Optional: Logging configuration
logging:
  level: info
  format: pretty
```

### Dependency Syntax

**Git repositories**:
```yaml
dependencies:
  - github:user/repo#branch          # GitHub shorthand
  - github:user/repo#v1.0.0          # Specific tag
  - gitlab:user/repo#main            # GitLab shorthand
  - git+https://example.com/repo.git # Full git URL
  - git+ssh://git@github.com/user/repo.git#tag
```

**npm packages**:
```yaml
dependencies:
  - "@scope/package@^1.0.0"          # Semver range
  - "@scope/package@1.2.3"           # Exact version
  - "package@latest"                 # Latest version
```

### Module Syntax

**Local modules**:
```yaml
modules:
  - helper                 # Loads .forge2/helper.ts
  - ./path/to/module       # Relative path
```

**Package modules**:
```yaml
modules:
  - @scope/package                # Whole package
  - @scope/package/submodule      # Specific submodule
```

---

## Directory Layout

### XDG Base Directory Compliance

Following XDG Base Directory Specification where practical:

```
~/.local/
├── bin/                              # User binaries
│   └── forge                         # Wrapper script
├── share/                            # Application data
│   └── forge/                        # Forge meta project
│       ├── package.json
│       ├── bun.lock
│       └── node_modules/
│           ├── @planet57/forge/      # Core
│           └── @planet57/forge-standard/  # Shared modules
├── state/                            # Application state
│   └── forge2/
│       └── state.json                # User state
└── cache/                            # Cached data
    └── forge2/
        └── (future use)

~/.config/                            # Configuration
└── forge2/
    └── config.yml                    # User-wide config (optional)

<project>/
└── .forge2/
    ├── .gitignore                    # Ignore local files
    ├── config.yml                    # Project config (committed to git)
    ├── config.local.yml              # Project-local user config (gitignored)
    ├── state.json                    # Project state (gitignored)
    ├── helper.ts                     # Local modules
    └── deploy.ts
```

### .forge2/.gitignore

The `.forge2/.gitignore` file should contain:

```gitignore
config.local.yml
state.json
```

This ensures:
- ✅ `config.yml` is committed (shared project config)
- ✅ `config.local.yml` is ignored (user-specific overrides)
- ✅ `state.json` is ignored (runtime state)
- ✅ Module files (`*.ts`) are committed (project modules)

### Configuration Hierarchy

Forge supports three levels of configuration with merge precedence:

1. **User-wide config**: `~/.config/forge2/config.yml`
   - System-wide defaults for all projects
   - Example: Default logging level, update preferences

2. **Project config**: `<project>/.forge2/config.yml`
   - Committed to git, shared with team
   - Defines modules, dependencies, project settings

3. **Project-local config**: `<project>/.forge2/config.local.yml`
   - Gitignored, user-specific overrides
   - Example: Local development paths, personal preferences

**Merge order**: User-wide → Project → Project-local (later wins)

**Example**:
```yaml
# .forge2/config.yml (committed)
modules:
  - helper
  - website

# .forge2/config.local.yml (gitignored)
logging:
  level: debug  # Override for local development
```

### Why Not Bun's Global?

We use `~/.local/share/forge/` instead of `~/.bun/install/global/` because:

1. **Separation of concerns** - Forge modules separate from Bun's global packages
2. **XDG compliance** - Follows standard directory layout
3. **User control** - User can `cd ~/.local/share/forge && bun add ...` directly
4. **Clean uninstall** - Remove `~/.local/share/forge/` and `~/.local/bin/forge`

---

## Module Resolution

### Resolution Algorithm

When loading a module, forge checks locations in priority order:

```typescript
async function resolveModule(name: string): Promise<ModulePath> {
  const projectRoot = findProjectRoot();
  const sharedPath = '~/.local/share/forge/node_modules';

  // 1. Local module in .forge2/
  if (!name.includes('/') && !name.startsWith('@')) {
    const localPath = resolve(projectRoot, '.forge2', `${name}.ts`);
    if (exists(localPath)) {
      return { type: 'local', path: localPath };
    }
  }

  // 2. Shared modules (meta project)
  const sharedModule = resolve(sharedPath, name);
  if (exists(sharedModule)) {
    return { type: 'shared', path: sharedModule };
  }

  // 3. Project node_modules (optional, future)
  const projectModule = resolve(projectRoot, 'node_modules', name);
  if (exists(projectModule)) {
    return { type: 'project', path: projectModule };
  }

  throw new Error(`Module not found: ${name}`);
}
```

### Implementation Details

**Using Bun's require.resolve**:
```typescript
const sharedPath = path.join(os.homedir(), '.local/share/forge/node_modules');

try {
  const modulePath = require.resolve(name, {
    paths: [
      path.join(projectRoot, '.forge2'),
      sharedPath,
      path.join(projectRoot, 'node_modules')
    ]
  });
  return modulePath;
} catch (error) {
  throw new Error(`Module not found: ${name}`);
}
```

**No environment variables required** - Resolution is programmatic.

### Module Loading

Once resolved, modules are loaded via dynamic import:

```typescript
const modulePath = await resolveModule(name);
const module = await import(modulePath);

// Discover exports
const commands = discoverCommands(module);
const metadata = module.__module__ || deriveMetadata(name);

// Register with Commander
registerCommandGroup(metadata.group, commands);
```

---

## Upgrade Workflow

### Forge Core Upgrade

**User command**:
```bash
forge upgrade
```

**Implementation**:
```typescript
export const upgrade: ForgeCommand = {
  description: 'Upgrade forge to latest version',
  execute: async () => {
    const forgeHome = path.join(os.homedir(), '.local/share/forge');

    // Run bun update in meta project
    await execa('bun', ['update', '@planet57/forge'], {
      cwd: forgeHome,
      stdio: 'inherit'
    });

    console.log('✅ Forge upgraded successfully');
    console.log('   Restart your shell or run: hash -r');
  }
};
```

**Why this works**:
- Wrapper script at `~/.local/bin/forge` doesn't change
- Only `node_modules/@planet57/forge/` content updates
- No file locking issues (wrapper delegates to updated code)

### Module Upgrades

**User command**:
```bash
forge module update              # Update all modules
forge module update forge-standard  # Update specific module
```

**Implementation**:
```typescript
export const moduleUpdate: ForgeCommand = {
  description: 'Update forge modules',
  execute: async (options, args) => {
    const forgeHome = path.join(os.homedir(), '.local/share/forge');
    const moduleName = args[0];

    if (moduleName) {
      // Update specific module
      await execa('bun', ['update', moduleName], {
        cwd: forgeHome,
        stdio: 'inherit'
      });
    } else {
      // Update all modules
      await execa('bun', ['update'], {
        cwd: forgeHome,
        stdio: 'inherit'
      });
    }

    console.log('✅ Modules updated');
  }
};
```

### Update Checking (Future)

**Configurable check frequency**:
```yaml
# .forge2/config.yml or ~/.config/forge2/config.yml
updates:
  check: daily  # daily, weekly, never
  notify: true
```

**On forge run**:
```typescript
// Check for updates (if enabled and cache expired)
if (await shouldCheckForUpdates()) {
  const updates = await checkForUpdates();
  if (updates.core || updates.modules.length > 0) {
    console.warn('⚠️  Updates available! Run: forge upgrade');
  }
}
```

---

## Implementation Phases

**Epic Issue**: [#2 Module Distribution System](https://github.com/jdillon/forge-bash/issues/2)

---

### Phase 1: Basic Installation & Local Modules

**Issue**: [#10 Phase 1: Basic Installation & Local Modules](https://github.com/jdillon/forge-bash/issues/10)

**Goal**: Get forge installable with local modules working

**Tasks**:
- [ ] Create `install.sh` script
- [ ] Add package.json with proper metadata
  - `name`: `@planet57/forge`
  - `bin`: Entry point
  - `exports`: Module exports
- [ ] Test installation flow
  - From git: `bun add github:jdillon/forge#module-system`
  - Via install script
- [ ] Verify wrapper script works
- [ ] Document installation process
- [ ] Keep existing local module loading

**Success criteria**:
- Can install forge via install.sh
- `forge --version` works
- Local modules (`.forge2/*.ts`) still work

**No changes to**:
- Current module loading
- Existing examples/tests

---

### Phase 2: Meta Project & Dependencies

**Issue**: [#11 Phase 2: Meta Project & Dependencies](https://github.com/jdillon/forge-bash/issues/11)

**Goal**: Support dependencies in config.yml

**Tasks**:
- [ ] Parse `dependencies:` section from config.yml
- [ ] Install dependencies to `~/.local/share/forge/node_modules/`
  - Run `bun add` from meta project directory
  - Handle git URLs
  - Handle npm packages
- [ ] Module resolver implementation
  - Programmatic path resolution
  - Priority: local → shared → project
- [ ] Auto-install on first use
  - Detect missing dependencies
  - Prompt or auto-install
  - Cache install status
- [ ] Error handling
  - Network failures
  - Auth issues for private repos
  - Missing dependencies

**Success criteria**:
- Can declare dependencies in config.yml
- Dependencies install to shared location
- Modules load from shared location

**Example**:
```yaml
dependencies:
  - "@aws-sdk/client-s3@^3.0.0"

modules:
  - helper
```

Module `helper.ts` can now:
```typescript
import { S3Client } from '@aws-sdk/client-s3';
```

---

### Phase 3: Git Module Loading

**Issue**: [#12 Phase 3: Git Module Loading](https://github.com/jdillon/forge-bash/issues/12)

**Goal**: Load modules from git repositories

**Tasks**:
- [ ] Git URL parsing
  - `github:user/repo#branch`
  - `gitlab:user/repo#tag`
  - `git+https://...`
  - `git+ssh://...`
- [ ] Package submodule support
  - Parse `exports` from package.json
  - Load specific submodules
- [ ] Integration testing
  - Create test module repository
  - Install from git
  - Load and execute commands
- [ ] Documentation
  - Module authoring guide
  - Example module repository

**Success criteria**:
- Can install modules from GitHub/GitLab
- Can load specific submodules from packages
- Private repos work (via SSH)

**Example**:
```yaml
dependencies:
  - github:planet57/forge-standard#main

modules:
  - @planet57/forge-standard/aws
  - @planet57/forge-standard/terraform
```

---

### Phase 4: Upgrade Commands

**Issue**: [#13 Phase 4: Upgrade Commands](https://github.com/jdillon/forge-bash/issues/13)

**Goal**: Easy upgrades for forge and modules

**Tasks**:
- [ ] Implement `forge upgrade` command
  - Update forge core
  - Verify update worked
  - Handle failures gracefully
- [ ] Implement `forge module update` command
  - Update all modules
  - Update specific module
  - Show what changed
- [ ] Version detection
  - Compare installed vs available
  - Show changelog (if available)
- [ ] Rollback mechanism (optional)
  - Save previous version
  - `forge rollback` command

**Success criteria**:
- `forge upgrade` updates forge
- `forge module update` updates modules
- User-friendly error messages

---

### Phase 5: Polish & Documentation

**Issue**: [#14 Phase 5: Polish & Documentation](https://github.com/jdillon/forge-bash/issues/14)

**Goal**: Production-ready release

**Tasks**:
- [ ] Module template/starter kit
- [ ] Example shared modules
  - forge-standard (help, version, etc.)
  - forge-example (showcase features)
- [ ] Complete documentation
  - Installation guide
  - Module authoring guide
  - Configuration reference
  - Troubleshooting guide
- [ ] Migration guide for existing projects
- [ ] Tests for module system
  - Resolution tests
  - Installation tests
  - Upgrade tests
- [ ] GitHub release
  - Changelog
  - Binary releases (optional: `bun build --compile`)

**Success criteria**:
- Complete documentation
- Example modules available
- Existing projects can migrate easily

---

## Future Enhancements

Not in initial scope, but design supports:

### npm Registry Support
- Publish to GitHub/GitLab Package Registry
- Support `.npmrc` configuration
- Private package authentication

### Module Aliasing
```yaml
modules:
  - name: @planet57/forge-standard/aws
    as: cloud  # Load as 'cloud' group instead of 'aws'
```

### Per-Project node_modules
If version conflicts arise:
```yaml
modules:
  scope: project  # Install to project node_modules instead of shared
```

### Module Marketplace
- Central registry of forge modules
- `forge module search terraform`
- `forge module info @planet57/forge-aws`

### Automatic Updates
```yaml
updates:
  auto: true
  level: minor  # patch, minor, never
```

---

## Security Considerations

### Code Execution

Modules execute arbitrary code. Trust model:

1. **Local modules** - User's own code, full trust
2. **Git modules** - User explicitly installs, verify source
3. **npm modules** - Standard npm trust model

**Best practices**:
- Only install modules from trusted sources
- Review module code before installation
- Use git tags/versions, not floating branches for production

### Private Repositories

**GitHub/GitLab private repos**:
- Require SSH keys configured on system
- Use deploy keys for CI/CD
- No tokens in config files

**Authentication**:
- SSH keys: Standard git credentials
- No credentials stored by forge
- Bun handles git authentication

### Dependency Supply Chain

**Mitigation strategies**:
- Use lockfile (`bun.lock`) to pin versions
- Review dependencies before installation
- Monitor security advisories
- Use git commit SHAs for critical dependencies

---

## Testing Strategy

### Unit Tests
- Module resolver
- Dependency parser
- Version detection
- Path resolution

### Integration Tests
- Install from git
- Module loading
- Dependency installation
- Upgrade workflow

### End-to-End Tests
1. Fresh install via install.sh
2. Create project with config.yml
3. Install dependencies
4. Load and execute modules
5. Upgrade forge
6. Upgrade modules

### Test Fixtures
Location: `tests/fixtures/`
- Sample modules
- Test repositories
- Mock package.json files

**Note**: Use fixtures, NOT `examples/website/` for tests.

---

## Open Questions

### Resolved
- ✅ Custom node_modules location: Use meta project pattern
- ✅ Module resolution: Programmatic, no env vars
- ✅ Git subdirectories: Not supported, use package exports
- ✅ Bootstrap pattern: Use wrapper script, not bootstrap delegation
- ✅ Install location: `~/.local/bin/forge` not `~/.bun/bin/`

### To Resolve During Implementation
1. **Exact wrapper script implementation** - bash vs bun script?
2. **Error messages** - What level of detail? How to guide users?
3. **Progress indicators** - Spinners during install/upgrade?
4. **Offline mode** - How to handle when network unavailable?

---

## Success Metrics

### For Initial Release

1. **Installation time** < 30 seconds (with Bun already installed)
2. **Module install time** < 5 seconds per module
3. **Module load time** < 100ms per module
4. **Clear error messages** - Users can resolve issues without support
5. **Documentation complete** - Users can self-serve

### User Experience Goals

- ✅ "Just works" on first try
- ✅ Updates are painless
- ✅ No mysterious errors
- ✅ Faster than manual package management
- ✅ Feels native to Node.js/Bun ecosystem

---

## Appendix

### Related Documents

- `tmp/install-upgrade-module-questions.md` - Q&A session transcript
- `tmp/install-module-system-next-steps.md` - Summary and action items
- `tmp/bun-research-findings.md` - Bun capabilities research
- `tmp/experiments/` - Validation experiments

### References

- [Bun Package Manager Docs](https://bun.sh/docs/pm/cli/install)
- [XDG Base Directory Specification](https://specifications.freedesktop.org/basedir/latest/)
- [Semantic Versioning](https://semver.org/)
- [Keep a Changelog](https://keepachangelog.com/)

### Glossary

- **Meta project** - Bun project at `~/.local/share/forge/` managing forge core and shared modules
- **Local module** - Project-specific TypeScript file in `.forge2/`
- **Shared module** - Reusable module installed to meta project
- **Wrapper script** - Lightweight script at `~/.local/bin/forge` that delegates to real CLI
- **Bootstrap** - Initial setup and delegation (we use wrapper instead)
- **Command group** - Set of related commands under namespace (e.g., `forge website build`)

---

## Changelog

### 1.0.0-draft (2025-11-01)
- Initial specification
- Defined architecture and installation flow
- Documented module system design
- Created implementation phases

---

**End of Specification**
