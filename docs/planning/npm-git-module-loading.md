# npm/git Module Loading

**Status**: Planned
**Priority**: High
**Complexity**: High
**Target Version**: v2.2
**Issue**: [#5](https://github.com/jdillon/forge/issues/5)

---

## Overview

Enable Forge to load modules from npm packages and git repositories, not just local `.forge2/` directories.

---

## Motivation

**Why we need this**:
- Makes modules truly reusable across projects
- Leverages existing npm/git ecosystems
- Enables version pinning and dependency management
- Standard pattern for modern development tools

**Current limitation**:
- Modules must be in project's `.forge2/` directory
- No version management
- Manual copying required
- No dependency resolution

---

## Dependencies

**Requires**:
- [#2 Module distribution system](https://github.com/jdillon/forge/issues/2) - Must be complete first
- Module registry infrastructure
- Package resolution logic

**Already have**:
- Module loading system in `lib/core.ts`
- State management for tracking installed modules

---

## Design

### Module Sources

**Support three source types**:

1. **Local filesystem** (current, keep for compatibility)
   ```
   .forge2/
   └── commands/
       └── mycommand.ts
   ```

2. **npm packages**
   ```json
   {
     "forge2Modules": {
       "@myorg/forge-aws": "^1.2.0",
       "forge-terraform": "~2.0.1"
     }
   }
   ```

3. **git repositories**
   ```yaml
   # .forge2/config.yml
   modules:
     - github:jdillon/forge-website#v1.0.0
     - gitlab:myorg/forge-custom#main
     - git+ssh://git@private.com/repo.git#feature-branch
   ```

### Architecture

```
┌───────────────────────────────────────────┐
│         Module Resolution                 │
├───────────────────────────────────────────┤
│  1. Check config.yml for module sources   │
│  2. Resolve each source type:             │
│     • Local: .forge2/                     │
│     • npm: node_modules/@org/pkg          │
│     • git: .forge2/cache/git/...          │
│  3. Load modules from resolved locations  │
│  4. Register commands in Commander        │
└───────────────────────────────────────────┘

┌───────────────────┐  ┌────────────────────┐  ┌─────────────────┐
│  Local Resolver   │  │   npm Resolver     │  │  Git Resolver   │
├───────────────────┤  ├────────────────────┤  ├─────────────────┤
│ • Read .forge2/   │  │ • Read package.json│  │ • Parse git URL │
│ • Load *.ts files │  │ • Install if needed│  │ • Clone/fetch   │
│ • Immediate       │  │ • Load from        │  │ • Checkout ref  │
│                   │  │   node_modules/    │  │ • Cache locally │
└───────────────────┘  └────────────────────┘  └─────────────────┘
```

### Module Resolution Order

**Priority** (first match wins):
1. Local `.forge2/` (highest priority, for overrides/development)
2. npm packages in `node_modules/`
3. Git repositories in `.forge2/cache/git/`

**Rationale**: Local modules can override installed ones for testing/development

### Configuration Formats

#### Option 1: package.json (npm-style)
```json
{
  "name": "my-project",
  "forge2Modules": {
    "@myorg/forge-aws": "^1.2.0",
    "forge-terraform": "~2.0.1"
  },
  "forge2ModulesGit": [
    "github:jdillon/forge-website#v1.0.0",
    "gitlab:myorg/forge-custom#main"
  ]
}
```

#### Option 2: .forge2/config.yml (current config file)
```yaml
modules:
  # npm packages
  - npm:@myorg/forge-aws@^1.2.0
  - npm:forge-terraform@~2.0.1

  # git repos
  - github:jdillon/forge-website#v1.0.0
  - gitlab:myorg/forge-custom#main
  - git+ssh://git@private.com/repo.git#feature

  # local (for compatibility)
  - local:./custom-commands
```

#### Option 3: Hybrid (recommended)
- Use `package.json` for npm packages (standard node workflow)
- Use `.forge2/config.yml` for git sources (keeps forge config together)

### npm Package Structure

**Forge module as npm package**:

```
@myorg/forge-aws/
├── package.json
│   {
│     "name": "@myorg/forge-aws",
│     "version": "1.2.0",
│     "main": "dist/index.js",
│     "forge2": {
│       "group": "aws",
│       "description": "AWS deployment commands"
│     }
│   }
├── dist/
│   ├── index.js           # exports all commands
│   ├── s3.js
│   └── ec2.js
└── README.md
```

**Discovery**: Look for `forge2` field in package.json

### Git Repository Structure

**Forge module as git repo**:

```
forge-website/
├── .forge2module          # Marker file (indicates this is a forge2 module)
├── package.json           # Standard metadata
├── commands/
│   ├── deploy.ts
│   └── build.ts
└── README.md
```

**Discovery**: Check for `.forge2module` marker or `forge2` in package.json

---

## Implementation Plan

### Phase 1: Module Resolver

1. **Create resolver interface**: `lib/resolvers/`
   ```typescript
   interface ModuleResolver {
       resolve(source: string): Promise<string>; // Returns path to module
       supports(source: string): boolean;
   }
   ```

2. **Implement resolvers**:
   - `LocalResolver`: Already works (`.forge2/` loading)
   - `NpmResolver`: Load from `node_modules/`
   - `GitResolver`: Clone/fetch git repos

3. **Update core.ts**: Use resolvers before loading modules

### Phase 2: npm Package Support

1. **Parse package.json**: Read `forge2Modules` field
2. **Install packages**: Run `bun install` if packages missing
3. **Discover modules**: Scan `node_modules/` for forge2-compatible packages
4. **Load and register**: Use existing module loading logic

### Phase 3: Git Repository Support

1. **Parse git URLs**: Support github:, gitlab:, git+ssh:, git+https:
2. **Clone/fetch**: Use `simple-git` or shell out to `git clone`
3. **Cache**: Store in `.forge2/cache/git/<hash>/`
4. **Checkout ref**: Support branches, tags, commit SHAs
5. **Update strategy**: `forge2 module update` re-fetches

### Phase 4: Version Management

1. **Lock file**: Create `.forge2/modules.lock` (like package-lock.json)
2. **Version resolution**: Handle semver ranges
3. **Update command**: `forge2 module update [name]`
4. **Prune command**: `forge2 module prune` (remove unused)

---

## Open Questions

1. **npm install integration**:
   - Should `forge2` run `bun install` automatically?
   - Or require user to run it separately?
   - What about CI/CD environments?

2. **Git authentication**:
   - Use SSH keys (user's git config)?
   - Support tokens in URLs?
   - How to handle private repos?

3. **Caching strategy**:
   - Cache git repos permanently or temporary?
   - Where to store cache (`.forge2/cache/` or `~/.cache/forge2/`)?
   - How to invalidate cache?

4. **Module namespace conflicts**:
   - What if two packages export same command group?
   - Priority/override rules?
   - Error or merge?

5. **Workspace support**:
   - How to handle monorepos?
   - Support workspaces in package.json?
   - Load modules from multiple projects?

6. **Performance**:
   - Lazy loading of npm/git modules?
   - Cache resolved paths?
   - Parallel loading?

---

## Testing Strategy

1. **Unit tests**:
   - Resolver implementations
   - URL parsing
   - Version resolution

2. **Integration tests**:
   - Load from test npm package
   - Load from test git repo
   - Priority resolution (local > npm > git)

3. **End-to-end tests**:
   - Install module from npm
   - Install module from github
   - Run commands from external modules

---

## Success Criteria

- ✅ Can load modules from npm packages
- ✅ Can load modules from git repositories
- ✅ Version pinning works (semver for npm, refs for git)
- ✅ Local modules override installed ones
- ✅ Existing local-only projects still work (backward compatible)
- ✅ Module installation is fast (<5s for typical module)
- ✅ Clear error messages for resolution failures

---

## Alternatives Considered

**Single source only**:
- npm-only: Simpler, but excludes private git repos
- git-only: Flexible, but no npm ecosystem integration
- Hybrid (recommended): Best of both worlds ✅

**Module discovery**:
- Scan all node_modules: Too slow, many false positives
- Explicit manifest: More control, recommended ✅

**Git storage**:
- Clone to node_modules: Conflicts with npm
- Separate cache: Cleaner, recommended ✅

---

## Security Considerations

1. **Code execution**: External modules run arbitrary code
   - Trust model: User explicitly installs modules
   - Sandboxing: Not practical for CLI framework
   - Best practice: Only install from trusted sources

2. **Supply chain attacks**:
   - npm packages can be compromised
   - Git repos can change after installation
   - Mitigation: Lock file with integrity hashes

3. **Private data**:
   - Modules might access project files/credentials
   - Document security model clearly
   - Recommend reviewing module code before installation

---

## Related

- **Roadmap**: [roadmap.md](./roadmap.md)
- **Issue**: [#5](https://github.com/jdillon/forge/issues/5)
- **Dependency**: [#2 Module distribution](https://github.com/jdillon/forge/issues/2)
- **Module loading**: `lib/core.ts`
- **Module distribution design**: [module-sharing-private.md](./module-sharing-private.md)
