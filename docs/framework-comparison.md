# Framework Comparison: Forge vs Commando

## Overview

This document compares two CLI framework approaches for bash-based project automation.

## Forge Framework

**Source**: Evolved from `cirqil/admin` and `cirqil/website` projects
**Philosophy**: Simple, modular, project-embedded framework with minimal abstractions

### Architecture

```
project/
├── forge                 # Main script (copied to project)
└── .forge/
    ├── config.bash      # Project configuration
    ├── local.bash       # User/machine-specific (gitignored)
    ├── aws.bash         # AWS/aws-vault wrapper module
    ├── terraform.bash   # Terraform wrapper module
    ├── keybase.bash     # Keybase integration module
    └── onboarding.bash  # Project-specific commands module
```

### Key Features

**Strengths:**
- **Dead simple**: Minimal abstraction, easy to understand
- **Project-embedded**: Each project has its own copy
- **Module-based**: Clean separation of concerns (aws, terraform, etc.)
- **Optional dependencies**: `aws_vault_prefix()` helper allows optional aws-vault
- **Debug logging**: `log_debug()` for troubleshooting
- **Error trapping**: Basic error handler with exit codes
- **Env var configuration**: `AWS_VAULT_USE`, `AWS_VAULT_DURATION`

**Weaknesses:**
- **No DRY**: Each project copies the same framework code
- **No versioning**: Framework updates require manual copying
- **No plugin system**: Modules are project-specific
- **No help system**: Commands don't self-document
- **Limited discovery**: No automatic command listing
- **CWD-dependent**: Must be run from project root

### Command Pattern

```bash
# Simple function-based commands
function command_aws {
  aws "$@"
}

function command_tf {
  terraform "$@"
}
```

### Configuration Pattern

```bash
# Declarative variable-based config
declare -g aws_vault_profile
aws_vault_profile="my-profile"

# Simple module sourcing
source "${forgedir}/aws.bash"
source "${forgedir}/terraform.bash"
```

---

## Commando Framework

**Source**: `jdillon/commando-bash` (2023)
**Philosophy**: Feature-rich, installable framework with advanced module and command systems

### Architecture

```
project/
├── commando.sh          # Symlink to installed commando
└── .commando/
    ├── config.sh        # Project configuration
    ├── library/         # Project-specific modules
    │   ├── aws.sh
    │   ├── git.sh
    │   └── custom.sh
    └── commando.rc      # User customizations (optional)
```

### Key Features

**Strengths:**
- **Installable**: Single install in PATH, reusable across projects
- **Module system**: Load/prepare lifecycle with dependency resolution
- **Command system**: Registry with validation and help integration
- **Help system**: Auto-generated help, command descriptions, syntax
- **Rich output**: Color formatting, log levels (fatal/error/warn/info/verbose/debug)
- **Advanced error handling**: Detailed stack traces with source/function/line info
- **Option parsing**: Built-in `-v/--verbose`, `--debug`, `--help`
- **Module discovery**: Auto-load from `library/` directory
- **CWD-aware**: Resolves config from script location

**Weaknesses:**
- **Complex**: Significant abstraction overhead
- **Learning curve**: Requires understanding module/command registration
- **Heavier**: ~500 lines of framework code
- **Convention-heavy**: Naming conventions (define_module, define_command, etc.)
- **Less obvious**: Helper functions hide actual execution

### Module Pattern

```bash
# Module lifecycle with registration
function __my_module {
  require_module util.sh  # Dependency

  # Module initialization code

  define_command 'mycommand' __mycommand_impl
}

define_module __my_module "my.sh"
```

### Command Pattern

```bash
# Command registration with help
help_define_description deploy 'Deploy application to environment'
help_define_syntax deploy '<environment> [options]'
help_define_doc deploy '
$(BOLD OPTIONS)
  -f,--force    Force deployment
  --dry-run     Preview changes only
'

function __deploy_command {
  local env="$1"
  # Implementation
}

define_command 'deploy' __deploy_command
```

### Configuration Pattern

```bash
# Module-based with lifecycle
load_modules ".commando/library" ".commando/config.sh"
prepare_modules  # Calls all module init functions
```

---

## Feature Comparison Matrix

| Feature | Forge | Commando |
|---------|-------|----------|
| **Installation** | Project-embedded | System-wide install |
| **Reusability** | Manual copy | Automatic |
| **Module System** | Basic sourcing | Load/prepare lifecycle |
| **Command Registry** | Function naming | Explicit registration |
| **Help System** | None | Auto-generated |
| **Error Handling** | Basic trap | Detailed stack traces |
| **Output Formatting** | Simple echo | Color + log levels |
| **Debug Logging** | `log_debug()` | Verbose + debug modes |
| **Option Parsing** | Manual | Built-in |
| **CWD Awareness** | No | Yes |
| **Code Size** | ~130 lines | ~480 lines |
| **Learning Curve** | Low | Medium-High |
| **Flexibility** | High | Medium |
| **Discoverability** | Low | High |

---

## Usage Examples

### Forge

```bash
# Project setup
cp forge /path/to/project/
mkdir -p /path/to/project/.forge
cat > /path/to/project/.forge/config.bash <<EOF
source "\${forgedir}/aws.bash"
source "\${forgedir}/terraform.bash"
EOF

# Usage
cd /path/to/project
./forge aws sts get-caller-identity
./forge tf plan
```

### Commando

```bash
# One-time install
curl -sSL https://raw.github.com/.../install.sh | bash -s

# Project setup
ln -s $(which commando.sh) myproject.sh
mkdir -p .commando/library

# Usage (from anywhere)
./myproject.sh help
./myproject.sh deploy production
./myproject.sh --verbose git release
```

---

## Design Goals for Next Generation

### Must Have

1. **Installable but simple**: Single script in PATH that's easy to understand
2. **CWD-aware**: Auto-discover config from current directory upward
3. **Module reusability**: Shared modules (aws, terraform) without duplication
4. **Project-specific commands**: Easy to add custom commands per project
5. **Optional features**: Help system, colors, debug logging should be opt-in
6. **Zero magic**: Clear execution flow, minimal indirection

### Nice to Have

1. **Plugin/bundle system**: Install shared modules (e.g., `forge install aws`)
2. **Version management**: Track framework version, upgrade path
3. **Command discovery**: List available commands automatically
4. **Help integration**: Simple help text for custom commands
5. **Config layers**: System → User → Project → Local
6. **Backward compatibility**: Work with existing forge projects

### Avoid

1. **Over-abstraction**: Keep it bash-like, avoid DSLs
2. **Heavy dependencies**: Stick to common Unix tools
3. **Complexity**: Prefer clarity over cleverness
4. **Convention overload**: Minimize required naming patterns

---

## Implementation Strategies

### Option A: Enhanced Forge (Evolutionary)

- Keep forge as installable script in PATH
- Discover `.forge/` config from CWD upward
- Add optional module repository in `~/.forge/modules/`
- Maintain simple sourcing model
- Add basic `forge help` command

**Pros**: Minimal breaking changes, gradual migration
**Cons**: Still somewhat manual, limited discoverability

### Option B: Commando Lite (Revolutionary)

- Strip down commando to core features
- Remove heavy abstractions (module system)
- Keep: help system, error handling, output formatting
- Add: simple plugin loading from `~/.forge/`
- Make colors/help optional

**Pros**: Rich features, proven design
**Cons**: Still complex, steeper learning curve

### Option C: Hybrid Approach (Recommended)

- Installable `forge` script with CWD-aware config discovery
- Simple module sourcing (no lifecycle/registration)
- Pluggable modules from `~/.forge/lib/` and project `.forge/`
- Optional help system via conventions (e.g., `command_foo_help()`)
- Minimal core with rich modules
- Progressive enhancement: works simple, gets better with features

**Pros**: Best of both worlds, flexible adoption
**Cons**: Requires careful design to avoid complexity creep

---

## Next Steps

1. **Prototype CWD-aware config discovery**
   - Walk up directory tree looking for `.forge/config.bash`
   - Support multiple config locations for layering

2. **Design module repository structure**
   - System: `/usr/local/share/forge/lib/`
   - User: `~/.forge/lib/`
   - Project: `.forge/lib/`

3. **Create plugin/bundle format**
   - Self-contained `.bash` files with metadata
   - Simple install/update mechanism
   - Version compatibility checks

4. **Implement optional help system**
   - Convention-based: `command_foo_help()` function
   - Auto-generation from comments
   - Fallback to simple listing

5. **Test migration path**
   - Ensure existing forge projects work
   - Provide upgrade scripts
   - Document migration guide

6. **Consider alternative implementations**
   - Pure bash (current)
   - Small C wrapper for performance?
   - Shell-agnostic (zsh/fish support)?
   - Python for better plugin management?
