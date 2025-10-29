Great question! The modern standard is the XDG Base Directory Specification, which defines where user-specific files should go:
Core XDG Directories
~/.config/ - User-specific configuration files

Think of this as /etc for your user
Examples: ~/.config/nvim/, ~/.config/git/config

~/.local/share/ - User-specific data files

Application data, plugins, themes
Examples: ~/.local/share/applications/ (desktop files), ~/.local/share/fonts/

~/.local/bin/ - User-specific executables

This is where you install binaries for your user
Should be in your $PATH
Used by pipx, cargo, mise, uv, etc.

~/.local/state/ - User-specific state data

Logs, history, recent files
Data that should persist between restarts but isn't important to back up

~/.cache/ - User-specific non-essential cached data

Safe to delete anytime
Examples: package manager caches, build artifacts

~/.local/lib/ - User-specific libraries (less standardized)

Some tools use this for shared libraries

Environment Variables
The spec defines these (with fallback defaults):

$XDG_CONFIG_HOME → defaults to ~/.config
$XDG_DATA_HOME → defaults to ~/.local/share
$XDG_STATE_HOME → defaults to ~/.local/state
$XDG_CACHE_HOME → defaults to ~/.cache
$XDG_BIN_HOME → non-standard, but ~/.local/bin is convention

Practical Examples
bash# User installs executables here
~/.local/bin/uv
~/.local/bin/mise

# Application data
~/.local/share/mise/installs/
~/.local/share/uv/python/

# Config files
~/.config/mise/config.toml
~/.config/git/config

# Caches (safe to delete)
~/.cache/uv/
~/.cache/mise/
```

## **Legacy vs Modern**

**Old way (still common):**
```
~/.vimrc
~/.bashrc
~/.ssh/config
~/.gitconfig
```

**Modern way:**
```
~/.config/nvim/init.vim
~/.bashrc (still here, shell configs are exempt)
~/.ssh/config (still here, security tools often exempt)
~/.config/git/config
Why It Matters

Cleaner home directory - no more 50+ dotfiles cluttering ls -la ~
Easier backups - just back up ~/.config and ~/.local/share
Clear separation - config vs data vs cache vs executables
Portable - can override via environment variables (useful in containers)

Tools Following This Standard
✅ Good citizens: systemd, neovim, fish, many Rust tools (like uv, mise)
❌ Holdouts: vim (uses ~/.vimrc), many older tools
Given your infrastructure work, you'll appreciate this mirrors the FHS (Filesystem Hierarchy Standard) concepts at the user level - /etc, /usr/share, /var/cache, etc. all have ~/.config, ~/.local/share, ~/.cache equivalents.
