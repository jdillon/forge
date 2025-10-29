# XDG Base Directory Compliance

**Date**: 2025-10-29
**Status**: Implemented in v2 prototype

---

## Why XDG?

Following the [XDG Base Directory Specification](https://specifications.freedesktop.org/basedir-spec/) provides:

- ✅ **Cleaner home directory** - No more hidden dotfiles cluttering `~`
- ✅ **Easier backups** - Just back up `~/.config` and `~/.local/share`
- ✅ **Clear separation** - Config vs data vs cache vs executables
- ✅ **Portable** - Can override via environment variables
- ✅ **Standard** - Follows convention of modern tools (mise, uv, cargo, etc.)

---

## Forge v2 Directory Layout

### Core Directories

```bash
# Executables (in PATH)
~/.local/bin/
└── forge2                          # Main executable

# Application data
~/.local/share/forge2/
├── modules/                        # Shared modules
│   ├── aws/
│   ├── kubernetes/
│   └── terraform/
├── runtime/
│   └── bin/
│       └── bun                     # Bundled Bun binary
└── lib/
    └── core.ts                     # Framework libraries

# User configuration (optional)
~/.config/forge2/
└── config.ts                       # Global user config

# Cache (safe to delete anytime)
~/.cache/forge2/
├── module-cache/                   # Downloaded modules
└── bun-cache/                      # Bun build artifacts

# State (logs, history)
~/.local/state/forge2/
├── update-check.json               # Last update check
└── command-history.json            # Command usage stats
```

### Project Directories (Unchanged)

```bash
project/
├── .forge2/                        # Project config (prototype)
│   ├── config.ts                   # Commands and config
│   ├── state.json                  # Project state (git-tracked)
│   ├── state.local.json            # User state (gitignored)
│   └── modules/                    # Project-specific modules
└── ...

# In final version, will be .forge/
```

---

## Environment Variables

Forge respects XDG environment variables with standard fallbacks:

```bash
# Override data directory
export XDG_DATA_HOME="$HOME/my-data"
# Forge uses: $XDG_DATA_HOME/forge

# Override config directory
export XDG_CONFIG_HOME="$HOME/my-config"
# Forge uses: $XDG_CONFIG_HOME/forge

# Override cache directory
export XDG_CACHE_HOME="$HOME/my-cache"
# Forge uses: $XDG_CACHE_HOME/forge

# Override state directory
export XDG_STATE_HOME="$HOME/my-state"
# Forge uses: $XDG_STATE_HOME/forge
```

**Defaults** (when env vars not set):
- `XDG_DATA_HOME` → `~/.local/share`
- `XDG_CONFIG_HOME` → `~/.config`
- `XDG_CACHE_HOME` → `~/.cache`
- `XDG_STATE_HOME` → `~/.local/state`

---

## Implementation

### Core Framework (lib/core.ts)

```typescript
function getXDGDataHome(): string {
  return process.env.XDG_DATA_HOME || join(homedir(), '.local', 'share');
}

function getXDGConfigHome(): string {
  return process.env.XDG_CONFIG_HOME || join(homedir(), '.config');
}

function getXDGCacheHome(): string {
  return process.env.XDG_CACHE_HOME || join(homedir(), '.cache');
}

function getXDGStateHome(): string {
  return process.env.XDG_STATE_HOME || join(homedir(), '.local', 'state');
}

export function getForgePaths() {
  return {
    data: join(getXDGDataHome(), 'forge'),
    config: join(getXDGConfigHome(), 'forge'),
    cache: join(getXDGCacheHome(), 'forge'),
    state: join(getXDGStateHome(), 'forge'),
    modules: join(getXDGDataHome(), 'forge', 'modules'),
    runtime: join(getXDGDataHome(), 'forge', 'runtime'),
  };
}
```

### Module Search Path

Modules are searched in order:

1. **Project modules**: `<project>/.forge2/modules/<name>/`
2. **User modules**: `~/.local/share/forge2/modules/<name>/`
3. **System modules**: (future - for system-wide installs)

```typescript
export function findModulePath(moduleName: string, projectRoot: string): string | null {
  const paths = getForgePaths();
  const candidates = [
    join(projectRoot, '.forge2', 'modules', moduleName),
    join(paths.modules, moduleName),
  ];

  for (const path of candidates) {
    if (existsSync(join(path, 'module.ts'))) {
      return path;
    }
  }

  return null;
}
```

---

## Bun Installation (XDG-Compliant)

### Install Bun to Forge Runtime Directory

```bash
# Set Bun install location
export BUN_INSTALL="$HOME/.local/share/forge2/runtime"

# Install Bun
curl -fsSL https://bun.sh/install | bash

# Result:
# ~/.local/share/forge2/runtime/bin/bun
```

### Add to PATH

**Option 1: Symlink** (recommended)
```bash
ln -s ~/.local/share/forge2/runtime/bin/bun ~/.local/bin/bun
```

**Option 2: Add to PATH**
```bash
# In ~/.bashrc or ~/.zshrc
export PATH="$HOME/.local/share/forge2/runtime/bin:$PATH"
```

---

## Migration from v1

### Old Paths (v1 - Bash)

```bash
~/.forge/                           # Would have been used
project/.forge/                     # Project config
```

### New Paths (v2 - Bun)

```bash
~/.local/share/forge2/               # Application data
~/.local/bin/forge2                 # Executable
~/.config/forge2/                    # User config (optional)
project/.forge2/                    # Project config (prototype)
```

**No migration needed** - v2 uses completely different locations.

---

## Comparison to Other Tools

### Tools Following XDG

| Tool | Executable | Data | Config |
|------|-----------|------|--------|
| **mise** | `~/.local/bin/mise` | `~/.local/share/mise/` | `~/.config/mise/` |
| **uv** | `~/.local/bin/uv` | `~/.local/share/uv/` | `~/.config/uv/` |
| **cargo** | `~/.cargo/bin/*` | `~/.cargo/` | `~/.cargo/config.toml` |
| **forge v2** | `~/.local/bin/forge2` | `~/.local/share/forge2/` | `~/.config/forge2/` |

**Note**: Cargo is partially XDG-compliant (uses `~/.cargo` instead of `~/.local/share/cargo`)

### Legacy Tools (Non-XDG)

| Tool | Location | Issue |
|------|----------|-------|
| **vim** | `~/.vimrc`, `~/.vim/` | Clutters home |
| **bash** | `~/.bashrc`, `~/.bash_profile` | (Shell configs exempt) |
| **git** | `~/.gitconfig` | Should use `~/.config/git/config` |
| **ssh** | `~/.ssh/` | (Security tools often exempt) |

---

## Benefits for Forge Users

### 1. Clean Installation

```bash
# All forge files in one place
ls ~/.local/share/forge2/
# modules/  runtime/  lib/

# Easy to back up or remove
cp -r ~/.local/share/forge2/ /backup/
rm -rf ~/.local/share/forge2/
```

### 2. Cache Management

```bash
# Clear cache safely
rm -rf ~/.cache/forge2/

# Cache rebuilds automatically on next run
forge2 update
```

### 3. Portable Configuration

```bash
# Use different config in container
docker run -e XDG_CONFIG_HOME=/container-config myimage

# Forge uses: /container-config/forge/
```

### 4. Clear Separation

```bash
# Back up user config
cp -r ~/.config/forge2/ /backup/config/

# Back up user data (modules, etc.)
cp -r ~/.local/share/forge2/ /backup/data/

# Skip cache and state (not important)
```

---

## Future Enhancements

### Global User Config

Currently optional, but could be used for:

```typescript
// ~/.config/forge2/config.ts
export default {
  // Global module aliases
  modules: {
    aws: 'https://github.com/user/forge-aws-enhanced'
  },

  // Default flags
  defaults: {
    verbose: false,
    dryRun: false
  },

  // Update settings
  updates: {
    checkInterval: '1d',
    autoUpdate: false
  }
}
```

### State Tracking

```bash
# ~/.local/state/forge2/update-check.json
{
  "lastCheck": "2025-10-29T12:00:00Z",
  "currentVersion": "2.0.0",
  "latestVersion": "2.1.0",
  "updateAvailable": true
}

# ~/.local/state/forge2/command-history.json
{
  "commands": {
    "sync": { "count": 45, "lastUsed": "2025-10-29T11:30:00Z" },
    "publish": { "count": 23, "lastUsed": "2025-10-29T10:15:00Z" }
  }
}
```

---

## References

- **XDG Base Directory Spec**: https://specifications.freedesktop.org/basedir-spec/
- **Arch Wiki - XDG**: https://wiki.archlinux.org/title/XDG_Base_Directory
- **Modern Unix Tools**: https://github.com/ibraheemdev/modern-unix

---

## Summary

Forge v2 follows XDG standards for a cleaner, more maintainable installation:

- ✅ Executable in `~/.local/bin/` (standard location, likely in PATH)
- ✅ Data in `~/.local/share/forge2/` (modules, runtime)
- ✅ Config in `~/.config/forge2/` (optional user config)
- ✅ Cache in `~/.cache/forge2/` (safe to delete)
- ✅ State in `~/.local/state/forge2/` (logs, history)
- ✅ Respects `XDG_*` environment variables
- ✅ Mirrors FHS (Filesystem Hierarchy Standard) at user level

**This makes forge a good citizen of modern Unix systems.** 🎯
