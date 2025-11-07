# Standard Library Example (Git URL)

This example demonstrates using the `@planet57/forge-standard` package loaded from a **git repository** to load reusable command modules.

## What This Shows

- Loading modules from **git repositories** using `git+ssh://` protocol
- SSH authentication for private repositories
- Package submodule syntax: `@planet57/forge-standard/hello`
- Group name derived from submodule: `hello`
- Auto-install from git on first use

## Setup

### 1. Ensure SSH authentication is configured

```bash
# Test SSH access to GitHub
ssh -T git@github.com

# Should see: Hi <username>! You've successfully authenticated...
```

### 2. Run commands (auto-install will happen automatically)

```bash
cd examples/standard-git

# Use local dev CLI (./forge symlink ensures correct version)
./forge --help

# Use commands from forge-standard
./forge hello greet World
./forge hello greet Jason
./forge hello info
```

**Note:** The `./forge` symlink points to `../../bin/forge-dev` to ensure you're testing the local development version, not the installed version.

## Expected Output

### First Run (with auto-install)

```bash
$ ./forge --help
Installing dependencies...
  + @planet57/forge-standard@git+ssh://git@github.com/jdillon/forge-standard.git
Restarting to pick up dependency changes...

Usage: forge [options] [command]

Commands:
  hello greet [name]  - Greet someone
  hello info          - Show module info
```

### Subsequent Runs

```bash
$ ./forge hello greet Jason
Hello, Jason!
Loaded from forge-standard package

$ ./forge hello info
Module: @planet57/forge-standard/hello
Version: 0.1.0
Commands: greet, info
```

## How It Works

1. **Config declares dependency**: `git+ssh://git@github.com/jdillon/forge-standard.git`
2. **Auto-install**: On first run, Forge clones the git repo and installs to `~/.local/share/forge/node_modules/@planet57/forge-standard/`
3. **SSH authentication**: Uses your SSH keys (~/.ssh/id_rsa) automatically
4. **Module loading**: `@planet57/forge-standard/hello` resolves to `hello.ts`
5. **Group name**: Last path segment `hello` becomes the command group
6. **Commands registered**: `greet` and `info` commands under `hello` group
7. **Restart mechanism**: Exit code 42 signals wrapper to restart after dependency install

## Configuration

See `.forge2/config.yml`:

```yaml
dependencies:
  # Git URL with SSH authentication
  - git+ssh://git@github.com/jdillon/forge-standard.git

modules:
  - "@planet57/forge-standard/hello"
```

## Git URL Formats Supported

**SSH (recommended for private repos):**
```yaml
dependencies:
  - git+ssh://git@github.com/jdillon/forge-standard.git
  - git+ssh://git@github.com/jdillon/forge-standard.git#main  # Specific branch
  - git+ssh://git@github.com/jdillon/forge-standard.git#v1.0.0  # Specific tag
```

**HTTPS (public repos):**
```yaml
dependencies:
  - git+https://github.com/jdillon/forge-standard.git
  - github:jdillon/forge-standard  # GitHub shorthand (HTTPS only)
```

## Related Examples

- **examples/standard** - Uses `file:` URL for local development
- **examples/deps** - Uses npm package (cowsay)

## Related Files

- **forge-standard repo**: https://github.com/jdillon/forge-standard
- **Installed location**: `~/.local/share/forge/node_modules/@planet57/forge-standard/`
- **Module resolver**: `lib/module-resolver.ts`
- **Package manager**: `lib/package-manager.ts`
- **Phase 2 & 3 docs**: `docs/wip/module-system/`

## Troubleshooting

**Error: "Failed to install git+ssh://..."**
- Check SSH keys: `ssh -T git@github.com`
- Ensure key is added to GitHub: https://github.com/settings/keys
- Try manual install: `cd ~/.local/share/forge && bun add git+ssh://git@github.com/jdillon/forge-standard.git`

**Error: "Permission denied (publickey)"**
- SSH key not configured or not added to ssh-agent
- Run: `ssh-add ~/.ssh/id_rsa`

**Module not loading after install:**
- Check forge home: `ls ~/.local/share/forge/node_modules/@planet57/`
- Verify package.json has correct name: `cat ~/.local/share/forge/node_modules/@planet57/forge-standard/package.json`
- Try clean reinstall: Remove from forge home and run `./forge --help` again
