# Forge Framework - Feature Analysis

## Overview

Forge is a minimal Bash 4+ framework for project-specific command macros. It emphasizes simplicity, directness, and ease of adding new commands with minimal ceremony.

**Core Philosophy**: Simple, project-embedded, minimal abstraction, easy to understand and extend.

## Core Architecture

### File Structure
```
forge                          # Main script (135 lines)
.forge/
  ├── config.bash              # Project configuration (sources modules/commands)
  ├── local.bash               # User-specific config (gitignored)
  ├── state.bash               # Persistent state (generated)
  ├── aws.bash                 # AWS/aws-vault module
  ├── terraform.bash           # Terraform module
  ├── keybase.bash             # Keybase module
  └── onboarding.bash          # Project-specific commands
```

### Bootstrap Process

1. **Set strict mode** - `errexit`, `nounset`, `pipefail`
2. **Install error trap** - Custom on_error handler
3. **Check Bash version** - Require 4+, auto-upgrade if possible
4. **Resolve paths** - basename, basedir, forgedir
5. **Execute main** - Parse command and dispatch

### Main Execution Flow (lines 96-134)

```bash
main "$@"
  ↓
Source .forge/config.bash
  ↓
Source .forge/local.bash (if exists)
  ↓
Extract command from $1
  ↓
Shift arguments
  ↓
If no command: use command_default or show usage
  ↓
Lookup "command_<name>" function
  ↓
If found: read_state() then invoke function
  ↓
If not found: show error and usage
```

## Feature Analysis

### 1. Bash Version Handling (lines 18-32)

**Auto-Upgrade Logic:**
```bash
if [ "${BASH_VERSINFO:-0}" -lt 4 ]; then
  for candidate in /opt/homebrew/bin/bash /usr/local/bin/bash /opt/local/bin/bash; do
    if [ -x "$candidate" ] && [ "$candidate" != "${BASH:-}" ]; then
      if "$candidate" -c '[[ ${BASH_VERSINFO[0]} -ge 4 ]]'; then
        exec "$candidate" "$0" "$@"
      fi
    fi
  done
  echo "ERROR: Incompatible Bash detected"
  exit 2
fi
```

**Features:**
- Automatically re-execs with newer bash if found
- Checks Homebrew, MacPorts locations
- Prevents infinite re-exec loop
- Clear error message if no compatible bash

**Assessment:**
- ✅ Excellent macOS compatibility
- ✅ Transparent to user
- ✅ Prevents common "Bash 3 on macOS" issue
- ⚠️ Only checks specific paths (could use PATH search)

### 2. Error Handling (lines 7-16)

**Error Trap:**
```bash
function on_error {
  local exit_code=$?
  echo "" >&2
  echo "ERROR: forge command failed with exit code $exit_code" >&2
  echo "Command: $basename $*" >&2
  exit $exit_code
}

trap 'on_error "$@"' ERR
```

**Assessment:**
- ✅ Simple and clear
- ✅ Shows command that failed
- ✅ Preserves exit code
- ⚠️ Less detailed than Commando (no stack trace)
- ⚠️ Shows forge invocation, not failing bash command

### 3. Core Functions (lines 46-74)

**die()**
```bash
function die {
  echo "$1"
  exit 1
}
```
Simple fatal error with message.

**usage()**
```bash
function usage {
  set +o nounset
  local syntax="$1"
  set -o nounset

  if [[ -z "$syntax" ]]; then
    echo "usage: $basename <command> [options]"
  else
    echo "usage: $basename $syntax"
  fi
  exit 2
}
```
Shows usage with optional custom syntax.

**self()**
```bash
function self {
  $0 "$@"
}
```
Re-invoke forge with arguments.

**log_debug()**
```bash
function log_debug {
  echo "[DEBUG] > $@" >&2
}
```
Debug logging to stderr.

**Assessment:**
- ✅ Minimal but sufficient
- ✅ Easy to understand
- ⚠️ No verbose/debug flags (always on or always off)
- ⚠️ No warning/info levels
- ⚠️ No color/formatting

### 4. State Management (lines 76-94)

**State System:**
```bash
declare -A state
declare -g state_file="$forgedir/state.bash"

function write_state() {
  echo "# $(date)" > "$state_file"
  for key in "${!state[@]}"; do
    echo "$key=${state[$key]}" >> "$state_file"
  done
}

function read_state() {
  if [[ -e "$state_file" ]]; then
    while IFS='=' read -r key value; do
       # Skip lines that are comments or empty
      [[ "$key" =~ ^#.*$ || -z "$key" ]] && continue
      state["$key"]="$value"
    done < "$state_file"
  fi
}
```

**Usage Pattern:**
```bash
function command_deploy {
  state["last_deploy_env"]="$1"
  state["last_deploy_time"]="$(date +%s)"
  write_state
  # ... deploy logic
}

function command_status {
  echo "Last deployed to: ${state[last_deploy_env]}"
  echo "Last deploy time: $(date -r ${state[last_deploy_time]})"
}
```

**Features:**
- Associative array for key-value storage
- Persisted to `.forge/state.bash`
- Auto-loaded before command execution
- Manual write (call `write_state()`)

**Assessment:**
- ✅ Simple and effective
- ✅ Human-readable format
- ✅ Useful for remembering previous values
- ⚠️ Must manually call write_state()
- ⚠️ No value escaping (breaks with special chars)
- ⚠️ No atomic writes (risk of corruption)
- ⚠️ Loaded even if not needed
- ❌ No state validation or typing

### 5. Command System (lines 113-131)

**Command Pattern:**
```bash
# Define a command by creating a function
function command_deploy {
  local env="$1"
  echo "Deploying to $env..."
}

# Commands are auto-discovered from function name
# No registration needed!
```

**Command Discovery:**
```bash
local fn="command_$command"
if [[ "$(type -t $fn)" = 'function' ]]; then
  read_state
  $fn "$@"
else
  echo "Unknown command: $command"
  usage
fi
```

**Assessment:**
- ✅ **BRILLIANT SIMPLICITY** - Just name function `command_<name>`
- ✅ Zero boilerplate
- ✅ Auto-discovery via bash type checking
- ✅ Easy to add new commands
- ✅ Clear naming convention
- ⚠️ No help metadata
- ⚠️ No command listing
- ❌ No parameter validation

### 6. Default Command (lines 44, 113-120)

```bash
declare -g command_default
command_default=""

if [[ -z "$command" ]]; then
  if [[ -n "$command_default" ]]; then
    self "$command_default"
  else
    usage
  fi
fi
```

**Usage:**
```bash
# In config.bash
command_default="status"

# Now just running "forge" shows status
```

**Assessment:**
- ✅ Nice UX for common case
- ✅ Simple to configure
- ⚠️ Only supports single default (no smart defaults)

### 7. Configuration System (lines 97-103)

**Two Configuration Layers:**

1. **Project Config** (`.forge/config.bash`)
   ```bash
   source "${forgedir}/aws.bash"
   source "${forgedir}/terraform.bash"
   source "${forgedir}/onboarding.bash"

   aws_vault_profile="myproject-admin"
   ```

2. **Local Config** (`.forge/local.bash`)
   ```bash
   # User-specific overrides
   aws_vault_profile="myproject-dev"
   aws_vault_use=false
   ```

**Loading Order:**
```
config.bash → local.bash
```

**Assessment:**
- ✅ Clean separation
- ✅ Local overrides without git
- ✅ Explicit module loading (control order)
- ✅ Pure bash (no parsing needed)
- ⚠️ Order dependencies (aws before terraform)
- ⚠️ Must manually source each module
- ❌ No CWD-aware discovery (must run from basedir)

### 8. Module Pattern (aws.bash example)

**Structure:**
```bash
# 1. Module configuration
declare -g aws_vault_use
aws_vault_use="${AWS_VAULT_USE:-true}"

declare -g aws_vault_exe
aws_vault_exe="$(command -v aws-vault || true)"

declare -g aws_vault_profile
declare -g aws_vault_options
aws_vault_options="--duration=${AWS_VAULT_DURATION:-15m}"

declare -g aws_exe
aws_exe="$(command -v aws || true)"

# 2. Validation
if [[ -z "$aws_exe" ]]; then
  echo "ERROR: aws-cli not found in PATH" >&2
  exit 1
fi

# 3. Helper functions
function aws_vault { ... }
function aws_vault_prefix { ... }
function aws { ... }

# 4. Forge commands (optional)
function command_aws { ... }
```

**Key Patterns:**
- Global variable declarations
- Tool discovery via `command -v`
- Environment variable overrides
- Helper functions for internal use
- Optional command exports

**Reusability:**
- Functions and variables available to other modules
- Example: terraform.bash uses `aws_vault_prefix()`
- Clean namespace via descriptive names

**Assessment:**
- ✅ Simple and clear
- ✅ Self-contained
- ✅ Reusable by other modules
- ✅ Environment variable integration
- ✅ Explicit validation
- ⚠️ No formal dependency declaration
- ⚠️ Global namespace pollution risk
- ⚠️ Must manually manage load order

### 9. AWS/Terraform Integration

**aws.bash Features:**
- Optional aws-vault wrapper
- Configurable via `AWS_VAULT_USE` env var
- Profile-based authentication
- Transparent wrapping of aws CLI
- Helper function `aws_vault_prefix()` for other tools

**terraform.bash Features:**
- Uses aws-vault prefix automatically
- Convenience commands: `tf_init`, `tf_plan`, `tf_apply`
- Alias: `tf` → `terraform`
- Project-specific commands: `tf_reformat`, `tf_unlock`

**Assessment:**
- ✅ Real-world, practical modules
- ✅ Good separation of concerns
- ✅ Reusable patterns
- ✅ Flexible (can disable aws-vault)

### 10. Strict Mode (lines 3-5)

```bash
set -o errexit
set -o nounset
set -o pipefail
```

**Benefits:**
- Exit on command failure
- Exit on undefined variable
- Pipeline failures propagate

**Assessment:**
- ✅ Prevents silent failures
- ✅ Catches typos early
- ⚠️ Can be too strict (sometimes you want failures)
- ⚠️ Requires `set +o` wrapping for intentional checks

## Real-World Example: Admin Project

From `/Users/jason/ws/cirqil/admin/.forge/`:

**Files:**
- `config.bash` - Sources modules, sets aws_vault_profile
- `local.bash` - User overrides (gitignored)
- `aws.bash` - AWS/aws-vault wrapper
- `terraform.bash` - Terraform with aws-vault
- `keybase.bash` - Keybase integration
- `onboarding.bash` - 14KB of project-specific commands (!)

**onboarding.bash** contains:
- User provisioning commands
- Database setup
- Environment deployment
- Secret management
- Development workflows

**Assessment:**
- ✅ Proves forge works for complex real projects
- ✅ Clean separation of shared vs project-specific
- ⚠️ Large project files get unwieldy
- ⚠️ No command organization/grouping

## Strengths

1. **Extreme Simplicity** - Only 135 lines of core code
2. **Zero Boilerplate** - Just name function `command_<name>`
3. **Auto-Discovery** - Commands discovered via bash type checking
4. **Pure Bash** - No external dependencies
5. **Explicit Control** - Manual sourcing gives load order control
6. **State System** - Simple persistence mechanism
7. **Practical** - Real modules for AWS, Terraform
8. **Auto-Upgrade** - Handles Bash 3 on macOS automatically

## Weaknesses

1. **No Help System** - Can't discover available commands
2. **Location Dependent** - Must run from project root
3. **No Module Reuse** - Must copy modules to each project
4. **Manual Module Loading** - Must source each module explicitly
5. **No Completion** - No shell auto-completion
6. **Limited Output** - No verbose/debug flags, no colors
7. **Basic Error Handling** - No stack traces
8. **State System Limitations** - No escaping, no atomicity
9. **No Parameter Validation** - Up to each command

## Comparison to Commando

| Feature | Forge | Commando |
|---------|-------|----------|
| Lines of code | 135 | 484 |
| Command registration | Auto (naming) | Manual (define_command) |
| Module system | Source files | Load/prepare system |
| Help system | None | Extensive (3 calls/cmd) |
| Error handling | Basic | Detailed stack trace |
| Output formatting | Minimal | Rich (colors, levels) |
| State persistence | Key-value file | None |
| CWD-aware | No | No |
| Installation | Copy to project | Copy to project |
| Completion | No | No |

## What Makes Forge Great

### The `command_<name>` Pattern

This is **forge's killer feature**. Compare:

**Forge:**
```bash
function command_deploy {
  local env="$1"
  terraform apply
}
```

**Commando:**
```bash
function __deploy_command {
  local env="$1"
  terraform apply
}
define_command 'deploy' __deploy_command
help_define_description 'deploy' 'Deploy to environment'
help_define_syntax 'deploy' '<env>'
```

Forge's approach is **3x simpler** with zero loss of functionality.

### Configuration as Code

Sourcing bash files for config is brilliant because:
- No parsing needed
- Full programming capability
- Easy to understand (it's just bash)
- Can use logic/conditionals
- Native to the language

Example:
```bash
# config.bash
if [[ "$USER" == "jason" ]]; then
  aws_vault_profile="admin"
else
  aws_vault_profile="developer"
fi
```

### State System Utility

While simple, the state system enables useful patterns:
```bash
# Remember last environment
function command_deploy {
  local env="${1:-${state[last_env]}}"
  state[last_env]="$env"
  write_state
  # ... deploy to $env
}

# Easy redeploy
function command_redeploy {
  command_deploy "${state[last_env]}"
}
```

## What Forge Needs

1. **CWD-Aware Discovery** - Find `.forge/` from any subdirectory
2. **Shared Module Repository** - Stop copying aws.bash everywhere
3. **Minimal Help** - Simple command listing and basic help
4. **Shell Completion** - Tab-complete commands
5. **Optional Verbose** - Debug flag for troubleshooting
6. **Better Errors** - Show which command failed (not just forge)

## Design Philosophy

Forge embodies **radical simplicity**:
- Minimal abstraction
- Convention over configuration
- Leverage bash features
- Don't hide the magic
- Easy to understand
- Easy to extend

This is the **right philosophy** for a project command framework.

## Recommendation

**Forge's core design is superior to Commando.** The auto-discovery command pattern and configuration-as-code approach are brilliant. The framework should:

1. **Keep** the command pattern (naming convention)
2. **Keep** the configuration approach (source files)
3. **Keep** the simplicity (minimal code)
4. **Keep** the state system
5. **Add** CWD-aware discovery
6. **Add** shared module repository
7. **Add** minimal help (auto-generated from functions)
8. **Add** shell completion support
9. **Consider** optional verbose/debug flags

The result would be **forge with batteries included** - maintaining its simplicity while adding the conveniences users expect.
