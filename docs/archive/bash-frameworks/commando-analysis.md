# Commando Framework - Feature Analysis

## Overview

Commando is a Bash 4+ framework designed to add configurable commands to Unix-based projects without dependencies on heavy languages. It provides a structured way to define, organize, and execute project-specific commands with help documentation.

**Core Philosophy**: Installable framework with extensive features, module system, and rich help/discovery capabilities.

## Core Architecture

### File Structure
```
commando.sh                    # Main framework (484 lines)
.commando/
  ├── library/                 # Reusable modules
  │   ├── help.sh
  │   ├── util.sh
  │   ├── git.sh
  │   ├── aws.sh
  │   ├── maven.sh
  │   ├── ansible.sh
  │   ├── release.sh
  │   └── project.sh
  └── config.sh                # Project configuration
commando.rc                    # User overrides (optional)
```

### Bootstrap Process

1. **Initialize output helpers** (lines 479)
2. **Install error handler** (lines 481)
3. **Execute main** (lines 483)

### Main Execution Flow (lines 358-473)

```bash
__main "$@"
  ↓
Resolve basename/progname
  ↓
Determine basedir (fully-qualified)
  ↓
cd to basedir
  ↓
Parse global options (-v, --debug, -h)
  ↓
Load modules from .commando/library/ and .commando/config.sh
  ↓
Prepare all modules (call initializers)
  ↓
Source user customizations (commando.rc)
  ↓
Run command or show usage
```

## Feature Analysis

### 1. Output System (lines 34-106)

**Capabilities:**
- Bold, underline, standout formatting via tput
- Automatic color detection (8+ colors required)
- Respects terminal redirects and xtrace mode
- Leveled output: die, error, warn, info, log (verbose), debug

**Helper Functions:**
- `BOLD()` - Bold text
- `UL()` - Underlined text
- `die()` - Fatal error and exit
- `error()` - Error message to stderr
- `warn()` - Warning message to stderr
- `info()` - Info message to stderr
- `log()` - Verbose/debug message
- `debug()` - Debug-only message
- `snip_output()` - Wrap command output with markers

**Flags:**
- `verbose='false'` - Enable verbose logging
- `debug='false'` - Enable debug logging

**Assessment:**
- ✅ Clean separation of concerns
- ✅ Terminal-aware formatting
- ✅ Multiple output levels
- ⚠️ No structured logging (timestamps, levels)
- ⚠️ Global state (verbose/debug flags)

### 2. Error Handler (lines 112-215)

**Capabilities:**
- Trap ERR signal with detailed diagnostics
- Stack trace with line numbers
- Function call chain
- Source file trace
- Last command display
- Exit code reporting

**Key Features:**
```bash
trap 'on_error "LINENO" "BASH_LINENO" "${BASH_COMMAND}" "${?}"' ERR
```

**Output Example:**
```
ERROR: Unexpected failure
---
Lines [42 38]
Functions: [command_deploy __main]
Exit code: 1
Source trace:
  - /path/to/commando.sh
  - /path/to/.commando/config.sh
Last command: terraform apply
---
```

**Assessment:**
- ✅ Excellent debugging information
- ✅ Multi-line command formatting
- ✅ Source trace for sourced files
- ✅ Helpful for troubleshooting
- ⚠️ Can be verbose for expected failures
- ⚠️ No way to suppress for specific commands

### 3. Module System (lines 221-295)

**Core Data Structures:**
```bash
declare -gA defined_modules    # module_name -> initializer_fn
declare -gA loaded_modules     # module_name -> script_path
declare -gA prepared_modules   # module_name -> initializer_fn
```

**Module Lifecycle:**

1. **Load Phase** (lines 233-261)
   - Discovers .sh files in directories
   - Sources each file passing module_name as $1
   - Stores path in loaded_modules

2. **Define Phase** (within modules)
   ```bash
   function __mymodule_module {
     # module code
   }
   define_module __mymodule_module "$@"
   ```

3. **Prepare Phase** (lines 263-280)
   - Iterates all loaded modules
   - Invokes each module's initializer function
   - Marks as prepared

4. **Require Phase** (lines 282-294)
   - On-demand lazy initialization
   - Skips if already prepared
   - Allows dependencies

**Module Pattern:**
```bash
#!/bin/bash
function __mymodule_module {
  require_module util.sh  # Declare dependency

  # Module-specific globals
  declare -g my_config_var

  # Module functions
  function my_helper { ... }

  # Commands (optional)
  define_command 'mycommand' __mycommand_impl
}

define_module __mymodule_module "$@"
```

**Assessment:**
- ✅ Clean separation of load vs initialize
- ✅ Lazy loading via require_module
- ✅ Explicit dependency management
- ✅ Namespace isolation via __modulename_ prefix
- ⚠️ Verbose boilerplate (function wrapper + define_module)
- ⚠️ No version management
- ⚠️ No conflict detection
- ⚠️ Module names based on filename (inflexible)
- ❌ No way to override/extend modules

### 4. Command System (lines 301-352)

**Core Data Structure:**
```bash
declare -gA defined_commands   # command_name -> function_name
```

**Command Registration:**
```bash
define_command 'deploy' __deploy_command
```

**Command Execution:**
```bash
run_command 'deploy' arg1 arg2
  ↓
Lookup function from defined_commands
  ↓
Intercept -h/--help → run_command help deploy
  ↓
Invoke function with arguments
```

**Built-in Option Handling:**
- Automatically adds `-h` and `--help` to all commands
- Redirects to `help <command>` when invoked

**Assessment:**
- ✅ Simple registration pattern
- ✅ Automatic help integration
- ✅ Function validation at registration
- ⚠️ No namespace/prefix support
- ⚠️ No command aliases
- ⚠️ No parameter validation/parsing
- ❌ No auto-discovery (must register explicitly)
- ❌ No command completion data

### 5. Help System (lines from help.sh)

**Three-Part Documentation:**

```bash
# 1. Short description (for command list)
help_define_description 'deploy' 'Deploy application to environment'

# 2. Syntax/signature
help_define_syntax 'deploy' '<environment> [options]'

# 3. Full documentation
help_define_doc 'deploy' '\
$(BOLD DESCRIPTION)

Deploy the application to specified environment.

$(BOLD OPTIONS)

  -f, --force     Force deployment
  --dry-run       Preview changes

$(BOLD EXAMPLES)

  $basename deploy staging
  $basename deploy prod --force
'
```

**Help Command Features:**
- `commando help` - List all commands with descriptions
- `commando help <command>` - Show detailed help for command
- Auto-formatted output with bold headers
- Column-aligned command list
- Late-evaluated strings ($(BOLD) etc rendered at display time)

**Command List Display:**
```
Commands:
  deploy       Deploy application to environment
  test         Run test suite
  build        Build application
```

**Command Help Display:**
```
Deploy application to environment

USAGE

  commando deploy <environment> [options]

OPTIONS

  -h,--help   Show usage
  -f, --force     Force deployment
  --dry-run       Preview changes
```

**Assessment:**
- ✅ Structured help metadata
- ✅ Nice formatting with bold/underline
- ✅ Command discovery via help
- ✅ Consistent help format
- ⚠️ VERY verbose to configure (3 function calls per command)
- ⚠️ Late-eval strings are fragile (quoting issues)
- ⚠️ No help validation (typos not caught)
- ❌ No man page generation
- ❌ No markdown/HTML export
- ❌ No auto-generation from comments

### 6. Utility Module (util.sh)

**Argument Validation:**
```bash
require_arguments <count> "$@"        # Exactly N args
require_some_arguments <count> "$@"   # At least N args
require_zero_arguments "$@"           # No args allowed
require_configuration <var_name>      # Variable must be set
```

**Executable Resolution:**
```bash
resolve_executable 'git' git_executable
# Checks: variable → which → error
# Caches result in executables associative array
```

**Standard Tool Wrappers:**
- `rm()` - With verbose support
- `ln()` - With verbose support
- `mkdir()` - With verbose support
- `rmdirs()` - Delete directories with logging
- `mkdirs()` - Create directories with logging
- `awk()` - Wrapped for consistency

**Assessment:**
- ✅ Helpful validation functions
- ✅ Executable caching reduces lookups
- ✅ Consistent verbose output
- ⚠️ Limited set of wrapped commands
- ⚠️ No parameter escaping helpers
- ⚠️ No JSON/YAML parsing utilities

### 7. Configuration System

**Three Configuration Layers:**

1. **Library Modules** (`.commando/library/*.sh`)
   - Reusable, shared functionality
   - Can be symlinked from central location
   - Loaded first

2. **Project Config** (`.commando/config.sh`)
   - Project-specific settings
   - Command definitions
   - Module requirements
   - Committed to git

3. **User Config** (`commando.rc`)
   - User/machine-specific overrides
   - Credentials, local paths
   - Not committed (gitignored)
   - Optional

**Loading Order:**
```
library/*.sh → config.sh → commando.rc
```

**Assessment:**
- ✅ Clean separation of concerns
- ✅ User overrides without git changes
- ✅ Reusable libraries
- ⚠️ No environment-specific configs (dev/prod)
- ⚠️ No config validation
- ❌ No CWD-aware discovery (must run from basedir)

### 8. Global Options

**Supported Flags:**
- `-h, --help` - Show usage and exit
- `-v, --verbose` - Enable verbose output
- `--debug` - Enable debug output
- `--` - Stop processing options (rest is command-line)

**Option Parsing:**
- Global options BEFORE command name
- Command options AFTER command name
- Example: `commando -v deploy --force`

**Assessment:**
- ✅ Clean separation of global vs command options
- ✅ Standard Unix flag conventions
- ⚠️ Limited global options
- ❌ No --quiet flag
- ❌ No --dry-run global flag
- ❌ No config file override (-c flag)

### 9. Self-Invocation

```bash
function self {
  log "Running: $0 $*"
  "$0" "$@"
}
```

**Use Case:** Commands can recursively call other commands
```bash
function __test_all_command {
  self test unit
  self test integration
  self test e2e
}
```

**Assessment:**
- ✅ Simple and effective
- ✅ Preserves full context
- ⚠️ No cycle detection
- ⚠️ Can be confusing in logs

### 10. Installation System

**install.sh Features:**
- Downloads latest from GitHub
- Extracts to project directory
- Creates initial structure
- Makes commando.sh executable

**Distribution Model:**
- Copy entire script to project
- Project-embedded (not in PATH)
- Must run from project directory

**Assessment:**
- ✅ Simple curl | bash install
- ✅ Version-per-project isolation
- ⚠️ Duplication across projects
- ⚠️ Updates require per-project re-install
- ❌ Not in PATH (can't run from subdirs)
- ❌ No global install option
- ❌ No version management

## Strengths

1. **Rich Error Diagnostics** - Stack traces are excellent for debugging
2. **Module System** - Clean organization with explicit dependencies
3. **Help System** - Structured documentation with discovery
4. **Output Formatting** - Terminal-aware with multiple levels
5. **Utility Functions** - Helpful validators and wrappers
6. **User Overrides** - Clean separation of project vs user config

## Weaknesses

1. **Verbose Configuration** - Help system requires 3 calls per command
2. **No Auto-Discovery** - Must explicitly register everything
3. **Location Dependent** - Must run from project root directory
4. **No Completion** - No shell auto-completion support
5. **Duplication** - Same code copied to every project
6. **Module Boilerplate** - Wrapper function pattern is repetitive
7. **No Versioning** - Can't track or update module versions
8. **No Plugin System** - Can't easily share/install modules

## Module System Deep Dive

### Design Pattern

**Pros:**
- Explicit initialization control
- Lazy loading via require_module
- Clear dependency declaration
- Namespace via function prefix

**Cons:**
- Requires wrapper function + define_module boilerplate
- Module name tied to filename
- No versioning or conflict resolution
- Can't override/extend modules
- Prepared modules are all-or-nothing (can't selectively disable)

### Alternative Approaches

1. **Convention-Based**
   ```bash
   # No registration needed
   # Just source file and it works
   source lib/aws.sh
   ```

2. **Explicit Import**
   ```bash
   import aws from lib/aws.sh
   ```

3. **Auto-Discovery**
   ```bash
   # Framework scans lib/ and loads all
   ```

### Recommendation

The module system is **overly complex for the value it provides**. The lazy loading and dependency tracking are rarely needed in practice. A simpler convention-based approach would be more maintainable:

```bash
# Just source in order, handle dependencies manually
source lib/util.sh
source lib/aws.sh
source lib/terraform.sh
```

## Help System Deep Dive

### Current Design

**Pros:**
- Structured documentation
- Consistent formatting
- Command discovery
- Per-command help

**Cons:**
- Extremely verbose (3 function calls per command)
- Separate from implementation (can drift)
- No validation
- Late-eval strings are error-prone

### Better Approaches

#### 1. Convention-Based Help

```bash
function command_deploy {
  : description: Deploy application to environment
  : usage: <environment> [--force]
  : example: forge deploy staging
  # implementation
}
```

Extract help from special comments at runtime.

#### 2. Inline Documentation

```bash
function command_deploy {
  if [[ "$1" == "--help" ]]; then
    cat <<EOF
Deploy application to environment

Usage: $basename deploy <environment> [--force]

Examples:
  $basename deploy staging
  $basename deploy prod --force
EOF
    return
  fi
  # implementation
}
```

Self-documenting, but duplicates help handling.

#### 3. Metadata Functions

```bash
function command_deploy { ... }
function command_deploy_help {
  echo "description: Deploy application to environment"
  echo "usage: <environment> [--force]"
  echo "example: $basename deploy staging"
}
```

Similar to current but less boilerplate than 3 separate calls.

### Recommendation

**Option 3** (metadata functions) provides the best balance:
- Discoverable via function naming convention
- Co-located with implementation
- Structured but minimal
- Can generate various help formats

## Shell Completion Support

**Current State:** ❌ No completion support

**What's Needed:**

1. **Command List** - Generate list of available commands
2. **Option Completion** - Per-command options
3. **Argument Completion** - Context-aware (files, hosts, etc.)
4. **Dynamic Completion** - Based on current state

**Implementation Approach:**

```bash
# For bash completion
function __commando_complete {
  local cur="${COMP_WORDS[COMP_CWORD]}"
  local prev="${COMP_WORDS[COMP_CWORD-1]}"

  if [[ $COMP_CWORD -eq 1 ]]; then
    # Complete command names
    COMPREPLY=( $(compgen -W "$(list_commands)" -- "$cur") )
  else
    # Delegate to command-specific completion
    local cmd="${COMP_WORDS[1]}"
    if type -t "command_${cmd}_complete" >/dev/null; then
      "command_${cmd}_complete" "$cur" "$prev"
    fi
  fi
}

complete -F __commando_complete commando
```

## Summary

Commando provides a **feature-rich but heavyweight** framework for project commands. It excels at:
- Error diagnostics
- Structured help
- Module organization
- Output formatting

But suffers from:
- Location dependence (must run from project root)
- Excessive boilerplate (modules, help)
- Duplication (copied to each project)
- No modern conveniences (completion, auto-discovery)

**Bottom Line:** The module and help systems are **over-engineered** for typical use cases. The core ideas are sound, but the implementation adds too much ceremony. A new framework should keep the good parts (error handling, output, help) but simplify modules and add CWD-awareness.
