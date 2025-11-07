# Phase 3: Git Module Loading - Implementation Proposal

**Epic**: #2 (Module Distribution System)
**Issue**: #12
**Spec**: `docs/planning/installation-and-module-system.md` § Phase 3
**Status**: Planning
**Date**: 2025-11-02

---

## Overview

Phase 3 adds support for loading modules from git repositories, building on Phase 2's dependency management foundation.

**What Phase 2 Delivered:**
- ✅ `dependencies:` support in config.yml
- ✅ Auto-install to forge home (`~/.local/share/forge/node_modules/`)
- ✅ Seamless restart mechanism (exit code 42)
- ✅ NODE_PATH-based resolution for shared dependencies
- ✅ Working example: `cowsay` dependency for moo module

**What Phase 3 Adds:**
- Git repository module loading
- Package exports/submodule support
- Private repository authentication
- Example module repository

---

## Goals

1. **Load modules from git repositories** - Support GitHub, GitLab, and generic git URLs
2. **Submodule support** - Load specific exports from packages
3. **Private repo access** - SSH authentication for private repositories
4. **Example module** - Create reference implementation

---

## Current State Analysis

### What Works (Phase 2)

```yaml
# examples/deps/.forge2/config.yml
dependencies:
  - cowsay  # npm package

modules:
  - ./moo   # local module
```

**Dependencies** are installed to `~/.local/share/forge/node_modules/` and available via NODE_PATH.

**Modules** are loaded from `.forge2/` directory and registered as command groups.

### What's Missing (Phase 3 Goals)

```yaml
# Desired Phase 3 syntax
dependencies:
  - cowsay                                              # npm package
  - github:user/public-repo#main                        # public git repo (HTTPS)
  - git+ssh://git@github.com/user/private-repo.git      # private git repo (SSH)
  - git+https://github.com/user/repo.git                # explicit HTTPS

modules:
  - ./moo                                 # local (already works)
  - @user/public-repo/commands            # git package submodule
  - @user/private-repo/commands           # private git package submodule
```

**Note:** `github:user/repo` shorthand uses HTTPS and only works for public repositories. Private repositories must use `git+ssh://` syntax.

---

## Design

### 1. Git URL Support in Dependencies

**Bun already supports git dependencies natively:**

```bash
bun add github:user/repo#branch          # HTTPS (public repos only)
bun add git+ssh://git@github.com/user/repo.git#branch   # SSH (private repos)
bun add git+https://github.com/user/repo.git             # HTTPS (explicit)
```

**Important:**
- `github:user/repo` uses **HTTPS** - only works for public repos
- For **private repos**, use `git+ssh://git@github.com/user/repo.git`

**Implementation:**
- ✅ **No changes needed** - Pass git URLs directly to `bun add`
- ✅ Bun handles cloning, caching, and installation
- ✅ Private repos work via SSH keys (~/.ssh/id_rsa)

**Testing:**
```bash
# Public repo (HTTPS)
cd ~/.local/share/forge
bun add github:chalk/chalk#main

# Private repo (SSH)
bun add git+ssh://git@github.com/jdillon/forge-standard.git
```

### 2. Module Loading from Git Packages

**Current module loader** (`lib/core.ts`):
- Resolves local paths (`./website` → `.forge2/website.ts`)
- Discovers exports (named or default)
- Registers commands via Commander

**Phase 3 extension:**
- Resolve package specifiers (`@org/pkg/submodule`)
- Use standard Bun/Node module resolution (no custom parsing)
- Let the runtime handle file lookup

**Example package structure:**
```
@jdillon/forge-standard/
├── package.json
├── README.md
├── help.ts              # export const show: ForgeCommand = ...
├── version.ts           # export const show: ForgeCommand = ...
└── example.ts           # export const hello: ForgeCommand = ...
```

**Module loading:**
```yaml
modules:
  - @jdillon/forge-standard/help      # Load help.ts
  - @jdillon/forge-standard/version   # Load version.ts
  - @jdillon/forge-standard/example   # Load example.ts
```

**Resolution strategy:**
1. Check if specifier starts with `@` or is a package name (not `.` or `/`)
2. Use `require.resolve()` to find module location
3. Let Bun/Node resolve the file path naturally
4. Load the resolved module

**Note:** No `package.json` exports parsing needed - standard module resolution handles it.

### 3. Private Repository Authentication

**SSH key authentication** (already works with Bun):
- User has SSH key configured (`~/.ssh/id_rsa`)
- Git uses SSH agent for authentication
- No special handling needed in Forge

**Testing:**
```yaml
dependencies:
  - git+ssh://git@github.com/user/private-repo.git
```

**Error handling:**
- Network failures → friendly error message
- Auth failures → suggest checking SSH keys
- Missing deps → auto-install (Phase 2 mechanism)

---

## Implementation Plan

### Step 1: Update Config Schema

**Add git URL validation to config loader:**

```typescript
// lib/config-loader.ts
const dependencySchema = z.union([
  z.string(),  // npm package or git URL
  z.object({
    name: z.string(),
    version: z.string().optional(),
  }),
]);
```

**Support git URL formats:**
- `github:user/repo#branch`
- `gitlab:user/repo#tag`
- `git+https://...`
- `git+ssh://...`

### Step 2: Extend Module Resolver

**Create package module resolver:**

```typescript
// lib/module-resolver.ts

/**
 * Resolve module path - handles local and package specifiers
 */
async function resolveModulePath(spec: string): Promise<string> {
  // Local module: ./website or /abs/path
  if (spec.startsWith('.') || spec.startsWith('/')) {
    return resolveLocalModule(spec);
  }

  // Package module: @org/pkg/submodule
  return resolvePackageModule(spec);
}

/**
 * Resolve package module using standard Node/Bun resolution
 */
async function resolvePackageModule(spec: string): Promise<string> {
  // Use require.resolve to find the module
  // Bun/Node handles the resolution - no custom parsing needed
  try {
    return require.resolve(spec);
  } catch (err) {
    throw new Error(
      `Could not resolve module: ${spec}\n` +
      `Ensure the package is installed in dependencies.`
    );
  }
}
```

### Step 3: Update Module Loader

**Extend `loadModule()` to handle packages:**

```typescript
// lib/core.ts

async loadModule(moduleSpec: string): Promise<Module> {
  // Resolve path (local or package)
  const modulePath = await resolveModulePath(moduleSpec);

  // Extract group name
  const groupName = extractGroupName(moduleSpec);

  // Load and discover commands
  const module = await import(modulePath);
  const commands = discoverCommands(module);

  return { groupName, commands };
}
```

### Step 4: Integration Testing

**Create `forge-standard` repository:**
- **Repository:** `github:jdillon/forge-standard` (private, SSH access)
- **Purpose:** Standard library of reusable command modules
- **Access:** git+ssh://git@github.com/jdillon/forge-standard.git
- **Use in tests:** Real-world module loading validation

**Repository structure:**
```
forge-standard/
├── package.json          # { "name": "@jdillon/forge-standard", "exports": {...} }
├── README.md
├── help.ts              # Standard help command module
├── version.ts           # Standard version command module
└── example.ts           # Example/demo command module
```

**package.json:**
```json
{
  "name": "@jdillon/forge-standard",
  "version": "0.1.0",
  "description": "Standard library of Forge command modules",
  "type": "module",
  "peerDependencies": {
    "@planet57/forge": "^2.0.0"
  }
}
```

**Note:** No `exports` field needed - Bun/Node will resolve `@jdillon/forge-standard/help` → `help.ts` naturally.

**Test cases:**
```typescript
// tests/module-loading.test.ts

test('loads module from private git repository via SSH', async () => {
  // Config with SSH git dependency
  const config = {
    dependencies: ['git+ssh://git@github.com/jdillon/forge-standard.git'],
    modules: ['@jdillon/forge-standard'],
  };

  // Should auto-install and load
  const forge = new Forge('/path/to/project', config);
  await forge.loadConfig();

  // Verify command registered
  expect(forge.hasCommand('forge-standard')).toBe(true);
});

test('loads submodule from git package', async () => {
  const config = {
    dependencies: ['git+ssh://git@github.com/jdillon/forge-standard.git'],
    modules: ['@jdillon/forge-standard/help'],
  };

  const forge = new Forge('/path/to/project', config);
  await forge.loadConfig();

  // Only help submodule commands should be registered
  expect(forge.hasCommand('help')).toBe(true);
  expect(forge.hasCommand('version')).toBe(false);
});
```

### Step 5: Error Handling

**Failure scenarios:**
1. **Network failure** - Can't clone git repo
2. **Auth failure** - Private repo, no SSH key
3. **Missing export** - Submodule doesn't exist
4. **Invalid package** - No package.json or exports

**Error messages:**
```typescript
// Network failure
throw new Error(
  `Failed to install ${gitUrl}\n` +
  `Check your internet connection and try again.\n` +
  `To skip network operations, use --offline flag.`
);

// Auth failure
throw new Error(
  `Failed to access private repository: ${gitUrl}\n` +
  `Ensure SSH key is configured: ~/.ssh/id_rsa\n` +
  `Add key to GitHub: https://github.com/settings/keys`
);

// Module not found
throw new Error(
  `Could not resolve module: ${spec}\n` +
  `Ensure the package is installed in dependencies.`
);
```

### Step 6: Documentation

**Module authoring guide:**
- How to structure a forge module package
- Package.json exports field
- Testing locally before publishing
- Publishing to GitHub

**Example module repository:**
- `forge-example` - Reference implementation
- Sample commands
- README with usage examples
- CI/CD setup (optional)

---

## Success Criteria

- [ ] Git dependencies install via `bun add`
- [ ] Modules load from installed git packages
- [ ] Submodule loading works (`@org/pkg/submodule`)
- [ ] Private repos work via SSH
- [ ] Test module repository created
- [ ] Error messages are helpful
- [ ] Module authoring guide complete

---

## Open Questions

### Q1: How to determine group name for package modules?

**Options:**
1. **Use package name** - `@jdillon/forge-standard` → `forge-standard`
2. **Use submodule name** - `@jdillon/forge-standard/help` → `help`
3. **Allow override** - Package exports `__module__` metadata

**Recommendation:** Use submodule name (the last path segment).

```yaml
modules:
  - @jdillon/forge-standard/help      # Group: "help"
  - @jdillon/forge-standard/version   # Group: "version"
```

**Rationale:** Simpler and more intuitive. User explicitly specifies the module path, so group name should match the module name.

> detect from module filename, we presently have a wonky mechansim (or had i'm not sure if its still there) a __module__ to rename the group.  I think we do need some control.  But it may be better for the name, to have that on the config.yml side when we delcare which moduels to use, support syntax to _alias as_ to rename it.

**Revised approach based on feedback:**

Support `as:` alias syntax in config.yml for explicit group naming:

```yaml
modules:
  - @jdillon/forge-standard/help                    # Group: "help" (default)
  - @jdillon/forge-standard/version                 # Group: "version" (default)
  - { name: @jdillon/forge-standard/example, as: demo } # Group: "demo" (aliased)
```

**Implementation:**
- Default: Use last path segment as group name
- Optional: Allow `as:` to override group name
- Phase 3: Start with simple default (last segment)
- Phase 4/5: Add alias support when needed

**Benefits:**
- Config-driven (no magic `__module__` exports)
- Explicit and clear
- Easy to implement incrementally

### Q2: Should we support npm registry packages?

**Phase 3 scope:** Git only (GitHub, GitLab, generic git URLs)

**Future (Phase 4/5):** npm registry support
- Publish to npm/GitHub Packages
- Private registry authentication
- Scoped packages (@org/pkg)

**Current decision:** Git URLs are sufficient for Phase 3. npm support is a natural extension later.

> git urls for now are just fine, thsi provies the concept and other supported formats should work but we might need some minor adjustment and testing to verify.

**Note:** npm packages already work (Phase 2: `cowsay`). Phase 3 just adds git repository support. Publishing to npm registries is future work.

### Q3: How to handle version conflicts?

**Scenario:** Two modules depend on different versions of the same package.

**Phase 3 answer:** Not addressed yet. All deps go to forge home (shared).

**Future solution:** Per-module node_modules if conflicts arise.

**Current decision:** Accept this limitation for Phase 3. Add conflict detection warning.

> how does normal bun depedency resolution solve this?  i'm not super worried about this ... not yet ;-)

**Bun's approach:** Uses standard Node.js dependency resolution with deduplication and hoisting. If two packages need different versions, Bun installs both and resolves via nested node_modules.

**For Phase 3:** Trust Bun's resolution. All dependencies go to forge home's node_modules, Bun handles conflicts automatically. Not a priority to solve now.

---

## Tasks Breakdown

**High-level tasks from #12:**

```markdown
- [ ] Git URL parsing
  - [ ] `github:user/repo#branch`
  - [ ] `gitlab:user/repo#tag`
  - [ ] `git+https://...`
  - [ ] `git+ssh://...`
- [ ] Package submodule support
  - [ ] Parse `exports` from package.json
  - [ ] Load specific submodules
  - [ ] Handle whole package imports
- [ ] Integration testing
  - [ ] Create test module repository
  - [ ] Install from git
  - [ ] Load and execute commands
- [ ] Private repository support
  - [ ] SSH authentication
  - [ ] Deploy keys for CI/CD
- [ ] Documentation
  - [ ] Module authoring guide
  - [ ] Example module repository
```

**Detailed implementation tasks:**

1. **Config schema updates** (1-2 hours)
   - Add git URL validation
   - Test various URL formats

2. **Module resolver** (2-3 hours)
   - Implement `resolvePackageModule()` using `require.resolve()`
   - Handle errors gracefully
   - Much simpler without exports parsing!

3. **Module loader updates** (2-3 hours)
   - Integrate package resolver
   - Extract group names correctly (last path segment)
   - Handle errors gracefully

4. **Test module repository** (2-3 hours)
   - Create `forge-standard` repo (private)
   - Add sample commands (help, version, example)
   - Document usage

5. **Integration tests** (3-4 hours)
   - Test git dependency installation
   - Test submodule loading
   - Test private repo (manual verification)

6. **Error handling** (2-3 hours)
   - Network failures
   - Auth failures
   - Module not found
   - User-friendly messages

7. **Documentation** (3-4 hours)
   - Module authoring guide
   - Update README
   - Examples in docs/
   - Troubleshooting guide

**Total estimate:** 15-22 hours (2-3 days of focused work)

**Savings from removing exports parsing:** ~2-3 hours

---

## Trade-offs

### Simple Approach (Recommended)

**What we're doing:**
- Leverage Bun's native git support
- Use standard package.json exports
- Minimal custom code

**Benefits:**
- ✅ Less code to maintain
- ✅ Standard conventions
- ✅ Works with existing tools

**Limitations:**
- ⚠️ Relies on Bun's git handling
- ⚠️ No version conflict resolution yet
- ⚠️ Limited control over install process

### Complex Approach (Not Recommended)

**What we could do instead:**
- Implement custom git cloning
- Custom package resolution
- Version conflict detection
- Dependency graph analysis

**Benefits:**
- ✅ Full control
- ✅ Better error messages
- ✅ Version conflict handling

**Downsides:**
- ❌ Much more code
- ❌ Reinventing the wheel
- ❌ More bugs
- ❌ Harder to maintain

**Decision:** Stick with simple approach for Phase 3. Add complexity only when needed.

---

## Testing Strategy

### Manual Testing

```bash
# 1. Create test project
mkdir /tmp/forge-git-test
cd /tmp/forge-git-test
forge init

# 2. Add git dependency (private repo via SSH)
cat > .forge2/config.yml <<EOF
dependencies:
  - git+ssh://git@github.com/jdillon/forge-standard.git

modules:
  - @jdillon/forge-standard
EOF

# 3. Run forge
forge --help
# Should auto-install git dep via SSH and show forge-standard commands

# 4. Test submodule loading
cat > .forge2/config.yml <<EOF
dependencies:
  - git+ssh://git@github.com/jdillon/forge-standard.git

modules:
  - @jdillon/forge-standard/help
  - @jdillon/forge-standard/version
EOF

forge help --help
forge version --help
# Should only load specified submodules (help and version)
```

### Automated Testing

```typescript
// tests/phase3-git-modules.test.ts

describe('Phase 3: Git Module Loading', () => {
  test('installs git dependency', async () => {
    // Test auto-install with git URL
  });

  test('loads module from git package', async () => {
    // Test whole package loading
  });

  test('loads submodule from git package', async () => {
    // Test submodule loading
  });

  test('handles missing submodule gracefully', async () => {
    // Test error handling
  });
});
```

---

## Next Steps

### 1. Provision `forge-standard` Repository

**Create private GitHub repository:**

```bash
# Create new repo on GitHub (via web UI or gh CLI)
gh repo create jdillon/forge-standard --private --clone

cd forge-standard

# Create initial structure
cat > package.json <<'EOF'
{
  "name": "@jdillon/forge-standard",
  "version": "0.1.0",
  "description": "Standard library of Forge command modules",
  "type": "module",
  "peerDependencies": {
    "@planet57/forge": "^2.0.0"
  }
}
EOF

# Create sample command modules
cat > help.ts <<'EOF'
import type { ForgeCommand } from '@planet57/forge/types';

export const show: ForgeCommand = {
  description: 'Show help for a command',
  usage: '[command]',
  execute: async (options, args, context) => {
    const command = args[0];
    if (command) {
      console.log(`Help for: ${command}`);
      // TODO: Implement actual help display
    } else {
      console.log('Available commands:');
      // TODO: List all commands
    }
  },
};
EOF

cat > version.ts <<'EOF'
import type { ForgeCommand } from '@planet57/forge/types';

export const show: ForgeCommand = {
  description: 'Show version information',
  execute: async (options, args, context) => {
    console.log('Forge version: 2.0.0-alpha.1');
    console.log('forge-standard version: 0.1.0');
  },
};
EOF

cat > example.ts <<'EOF'
import type { ForgeCommand } from '@planet57/forge/types';

export const hello: ForgeCommand = {
  description: 'Say hello',
  usage: '[name]',
  execute: async (options, args, context) => {
    const name = args[0] || 'World';
    console.log(`Hello, ${name}!`);
  },
};
EOF

cat > README.md <<'EOF'
# forge-standard

Standard library of reusable Forge command modules.

## Installation

Add to your `.forge2/config.yml`:

```yaml
dependencies:
  - git+ssh://git@github.com/jdillon/forge-standard.git

modules:
  - @jdillon/forge-standard/help
  - @jdillon/forge-standard/version
```

## Available Modules

- `help` - Standard help command
- `version` - Version information
- `example` - Example/demo commands

## Usage

```bash
forge help show mycommand
forge version show
forge example hello Jason
```
EOF

# Commit and push
git add .
git commit -m "Initial forge-standard library

- Add package.json with exports
- Add help, version, example modules
- Add README with usage examples"

git push -u origin main
```

**Verify SSH access:**

```bash
# Test that SSH key works
ssh -T git@github.com

# Test cloning private repo
git clone git+ssh://git@github.com/jdillon/forge-standard.git /tmp/test-clone
```

### 2. Review this proposal

Get feedback on design decisions and approach.

### 3. Implement module resolver

Core functionality for package module loading.

### 4. Add tests

Integration and unit tests using forge-standard repo.

### 5. Update documentation

Module authoring guide based on forge-standard example.

### 6. Manual verification

Real-world testing with forge-standard.

---

## References

- **Bun git dependencies:** https://bun.sh/docs/cli/install#git
- **Package.json exports:** https://nodejs.org/api/packages.html#exports
- **Phase 2 implementation:** `lib/auto-install.ts`, `lib/forge-home.ts`
- **Current module loader:** `lib/core.ts` (loadModule, registerCommands)
