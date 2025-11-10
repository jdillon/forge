# Standard Library Example

This example demonstrates using the `@jdillon/forge-standard` package to load reusable command modules.

## What This Shows

- Loading modules from packages installed to forge home
- Using `file:` protocol for local development
- Package submodule syntax: `@jdillon/forge-standard/hello`
- Group name derived from submodule: `hello`

## Setup

### 1. Install forge-standard to forge home

```bash
cd ~/.local/share/forge
bun add file:../../../forge-standard
```

This creates symlinks, so changes to forge-standard are immediately reflected.

### 2. Run commands

```bash
cd examples/standard

# Use local dev CLI (./forge symlink ensures correct version)
./forge --help

# Use commands from forge-standard
./forge hello greet World
./forge hello greet Jason
./forge hello info
```

**Note:** The `./forge` symlink points to `../../bin/forge` to ensure you're testing the local development version, not the installed version.

## Expected Output

```bash
$ ./forge hello greet Jason
Hello, Jason!
Loaded from forge-standard package

$ ./forge hello info
Module: @jdillon/forge-standard/hello
Version: 0.1.0
Commands: greet, info
```

## How It Works

1. **Config declares dependency**: `file:../../../forge-standard` (relative path)
2. **Auto-install**: Forge installs to `~/.local/share/forge/node_modules/@jdillon/forge-standard/`
3. **Module loading**: `@jdillon/forge-standard/hello` resolves to `hello.ts`
4. **Group name**: Last path segment `hello` becomes the command group
5. **Commands registered**: `greet` and `info` commands under `hello` group

## Configuration

See `.forge2/config.yml`:

```yaml
dependencies:
  - file:../../../forge-standard  # Relative path for portability

modules:
  - "@jdillon/forge-standard/hello"
```

## Production vs Development

**Development** (current):
```yaml
dependencies:
  - file:/Users/jason/ws/jdillon/forge-standard  # Local symlink
```

**Production** (future):
```yaml
dependencies:
  - git+ssh://git@github.com/jdillon/forge-standard.git  # Git repo
```

## Related

- **forge-standard source**: `/Users/jason/ws/jdillon/forge-standard/`
- **Installed location**: `~/.local/share/forge/node_modules/@jdillon/forge-standard/`
- **Module resolver**: `lib/module-resolver.ts`
- **Phase 3 docs**: `docs/wip/module-system/phase3-implementation-proposal.md`
