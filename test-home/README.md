# Test Home - Mock XDG Installation

This directory simulates a real forge installation in a user's home directory.

## Structure

```
test-home/  (simulates ~/)
├── .local/
│   ├── bin/
│   │   └── forge2 -> ../../forge2  (symlink to executable)
│   ├── share/
│   │   └── forge -> ../..          (symlink to repo root)
│   └── state/
├── .config/
└── .cache/
```

## Simulates Real Installation

In a real installation:

```bash
# User clones repo to XDG data directory
git clone https://github.com/jdillon/forge ~/.local/share/forge2

# Symlink executable to PATH
ln -s ~/.local/share/forge2/forge2 ~/.local/bin/forge2

# Directory structure:
~/.local/share/forge2/       # This repo
├── lib/core.ts
├── forge2
└── ...

~/.local/bin/forge2         # Symlink to above
```

## Testing

### Run with Test PATH

```bash
# Set PATH to use test-home
export PATH="$PWD/test-home/.local/bin:$PATH"

# Verify forge2 is found
which forge2
# Should show: /Users/jason/ws/jdillon/forge-bash/test-home/.local/bin/forge2

# Run commands
cd examples/website
forge2 help
forge2 build
forge2 info
```

### Test CWD-Aware Discovery

```bash
# Works from project root
cd examples/website
forge2 info

# Works from subdirectory
cd examples/website/dist
forge2 info

# Works from anywhere with --root
cd ~
forge2 --root=/path/to/examples/website info
```

## Module Testing (Future)

When modules are added:

```bash
# Create a test module
mkdir -p test-home/.local/share/forge2/modules/aws-test
echo 'export default { ... }' > test-home/.local/share/forge2/modules/aws-test/module.ts

# Module will be found in search path:
# 1. <project>/.forge2/modules/aws-test/
# 2. test-home/.local/share/forge2/modules/aws-test/  <- Found here
```

## Installation Script (Future)

Eventually, users will install like this:

```bash
# Automated install script
curl -fsSL https://forge.sh/install.sh | bash

# Or manual install
git clone https://github.com/jdillon/forge ~/.local/share/forge2
ln -s ~/.local/share/forge2/forge2 ~/.local/bin/forge2

# Verify
forge2 --version
```

## Uninstall

```bash
# Remove executable symlink
rm ~/.local/bin/forge2

# Remove application data
rm -rf ~/.local/share/forge

# Optionally remove config/cache/state
rm -rf ~/.config/forge
rm -rf ~/.cache/forge
rm -rf ~/.local/state/forge
```

## Why This Structure?

This follows XDG Base Directory Specification:
- **~/.local/bin/** - User executables (should be in PATH)
- **~/.local/share/** - Application data
- **~/.config/** - User configuration
- **~/.cache/** - Non-essential cached data
- **~/.local/state/** - State data (logs, history)

Same pattern as: mise, uv, cargo, and other modern CLI tools.
