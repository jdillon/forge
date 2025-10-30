# Comprehensive Recommendations for Next-Gen Framework

## Executive Summary

After deep analysis of both forge and commando frameworks, I recommend **evolving forge** with these key improvements:

1. ✅ **Keep Bash** - Best fit for the use case
2. ✅ **Keep the name "forge"** - It's good, no need to change
3. ✅ **Keep command pattern** - `command_<name>` auto-discovery is brilliant
4. ✅ **Add CWD-awareness** - Major UX improvement
5. ✅ **Add module repository** - Eliminate duplication
6. ✅ **Add minimal help** - Auto-discovery + optional metadata
7. ✅ **Add shell completion** - Expected modern feature
8. ❌ **Avoid commando's complexity** - Module/help systems too verbose

**Bottom Line:** Forge's core design is superior. Add conveniences without sacrificing simplicity.

---

## Architecture: The Big Picture

### Current State (Forge)
```
project/
├── forge                 # Copy in each project
└── .forge/
    ├── config.bash       # Sources modules manually
    ├── local.bash        # User overrides
    ├── aws.bash          # Copied from other project
    ├── terraform.bash    # Copied from other project
    └── mycommands.bash   # Project-specific

Problems:
- Must run from project root
- Duplicate aws.bash across projects
- No help/discovery
- Updates require manual copying
```

### Proposed State (Forge 2.0)
```
~/.forge/
├── bin/forge             # Installed once
├── lib/
│   ├── aws.bash          # Shared across projects
│   ├── terraform.bash    # Shared across projects
│   └── docker.bash       # Shared across projects
└── completions/
    ├── forge.bash        # Bash completion
    └── _forge            # Zsh completion

project/
└── .forge/
    ├── config.bash       # Load shared modules
    ├── local.bash        # User overrides (gitignored)
    └── commands.bash     # Project commands

Usage:
$ cd project/src/components/  # Any subdirectory
$ forge deploy                # Works! Finds .forge/ upward
$ forge help                  # Lists all commands
$ forge d<TAB>                # Completes to "deploy"
```

**Benefits:**
- Run from anywhere in project
- Shared modules, no duplication
- Built-in help and completion
- Easy updates (`cd ~/.forge && git pull`)

---

## Feature-by-Feature Recommendations

### 1. Installation & Distribution

**Recommendation: Git Clone + PATH**

```bash
# One-time installation
git clone https://github.com/jdillon/forge ~/.forge
echo 'export PATH="$HOME/.forge/bin:$PATH"' >> ~/.bashrc

# Updates
cd ~/.forge && git pull
```

**Rationale:**
- ✅ Like jenv/tfenv - familiar pattern
- ✅ Easy to customize (it's just files)
- ✅ Version control (git log, branches)
- ✅ No sudo required
- ✅ Easy rollback (git checkout)

**Bonus: Install script for convenience**
```bash
curl -sSL https://forge.sh/install.sh | bash
```

---

### 2. CWD-Aware Config Discovery

**Recommendation: Walk Up Directory Tree**

```bash
function find_forge_dir {
  local dir="$PWD"
  while [[ "$dir" != "/" && "$dir" != "" ]]; do
    if [[ -d "$dir/.forge" ]]; then
      echo "$dir/.forge"
      return 0
    fi
    dir=$(dirname "$dir")
  done
  return 1
}

# Support override
if [[ -n "${FORGE_ROOT:-}" ]]; then
  forgedir="$FORGE_ROOT/.forge"
else
  forgedir=$(find_forge_dir) || die "No .forge/ directory found"
fi
basedir=$(dirname "$forgedir")
```

**Features:**
- Works from any project subdirectory
- Honors `FORGE_ROOT` environment variable
- Clear error if not in a forge project
- Compatible with git, npm, cargo behavior

---

### 3. Module System

**Recommendation: Hybrid Loading with Precedence**

**Structure:**
```
# System (installed with forge)
~/.forge/lib/
  ├── core.bash        # Utilities always loaded
  ├── aws.bash         # Optional module
  └── terraform.bash   # Optional module

# User (custom additions)
~/.forge/local/lib/
  └── myutils.bash

# Project (project-specific)
project/.forge/lib/
  └── projectutils.bash
```

**Loading Order:**
```bash
# 1. Core utilities (always)
source ~/.forge/lib/core.bash

# 2. Requested modules (explicit)
# In project .forge/config.bash:
load_module aws         # Checks project → user → system
load_module terraform

# 3. Project libs (auto)
for lib in .forge/lib/*.bash; do
  source "$lib"
done

# 4. Project config
source .forge/config.bash

# 5. Local overrides
source .forge/local.bash (if exists)
```

**load_module function:**
```bash
function load_module {
  local name="$1"
  local tried=()

  # Search path
  for dir in \
    "$forgedir/lib" \
    "$HOME/.forge/local/lib" \
    "$HOME/.forge/lib"
  do
    local path="$dir/${name}.bash"
    if [[ -f "$path" ]]; then
      source "$path"
      log_debug "Loaded module: $name from $path"
      return 0
    fi
    tried+=("$path")
  done

  die "Module '$name' not found. Tried: ${tried[*]}"
}
```

**Benefits:**
- ✅ Shared modules (no duplication)
- ✅ Project can override (highest precedence)
- ✅ Clear, explicit loading
- ✅ Good error messages

---

### 4. Help System

**Recommendation: 3-Tier Auto-Discovery**

**Tier 1: Automatic List (Zero Config)**
```bash
$ forge help
Available commands:
  deploy
  status
  test
  tf
```

**Tier 2: One-Line Descriptions (Optional)**
```bash
# Add in command file:
command_deploy_description="Deploy application to environment"

$ forge help
Available commands:
  deploy    Deploy application to environment
  status    Show current deployment status
  test      Run test suite
```

**Tier 3: Full Help (Optional)**
```bash
# Add help function:
function command_deploy_help {
  cat <<EOF
Usage: $basename deploy <environment> [options]

Deploy application to specified environment.

Arguments:
  environment    Target environment (dev, staging, prod)

Options:
  -f, --force    Skip confirmation
  --dry-run      Preview only

Examples:
  $basename deploy staging
  $basename deploy prod --dry-run
EOF
}

$ forge help deploy
Usage: forge deploy <environment> [options]
...
```

**Implementation:**
```bash
function command_help {
  local cmd="${1:-}"

  if [[ -z "$cmd" ]]; then
    # List commands
    echo "Available commands:"
    echo ""

    local -a commands
    readarray -t commands < <(
      compgen -A function | \
      grep '^command_' | \
      grep -v '_help$' | \
      grep -v '_complete$' | \
      grep -v '_description$' | \
      sed 's/^command_//' | \
      sort
    )

    local max_len=0
    for cmd in "${commands[@]}"; do
      [[ ${#cmd} -gt $max_len ]] && max_len=${#cmd}
    done

    for cmd in "${commands[@]}"; do
      local desc_var="command_${cmd}_description"
      local desc="${!desc_var:-}"
      if [[ -n "$desc" ]]; then
        printf "  %-${max_len}s  %s\n" "$cmd" "$desc"
      else
        echo "  $cmd"
      fi
    done
  else
    # Show command help
    local help_fn="command_${cmd}_help"
    if type -t "$help_fn" >/dev/null 2>&1; then
      "$help_fn"
    else
      local desc_var="command_${cmd}_description"
      local desc="${!desc_var:-No description available}"
      echo "Command: $cmd"
      echo "$desc"
      echo ""
      echo "Usage: $basename $cmd [arguments]"
    fi
  fi
}
```

**Benefits:**
- ✅ Zero config for basic usage
- ✅ Progressive enhancement
- ✅ Co-located with implementation
- ✅ Not verbose like commando

---

### 5. Shell Completion

**Recommendation: Include Completion Scripts**

**Bash completion:**
```bash
# ~/.forge/completions/forge.bash
_forge_complete() {
  local cur="${COMP_WORDS[COMP_CWORD]}"
  local prev="${COMP_WORDS[COMP_CWORD-1]}"

  if [[ $COMP_CWORD -eq 1 ]]; then
    # Complete command names
    local commands=$(
      forge --list-commands 2>/dev/null || \
      compgen -A function | grep '^command_' | sed 's/^command_//'
    )
    COMPREPLY=( $(compgen -W "$commands" -- "$cur") )
    return
  fi

  # Command-specific completion
  local cmd="${COMP_WORDS[1]}"
  if type -t "command_${cmd}_complete" >/dev/null 2>&1; then
    "command_${cmd}_complete" "$cur" "$prev"
  fi
}

complete -F _forge_complete forge
```

**Hidden command for completion:**
```bash
function command___list_commands {
  compgen -A function | \
    grep '^command_' | \
    grep -v '^command___' | \
    sed 's/^command_//'
}
```

**Installation:**
```bash
# Manual
echo 'source ~/.forge/completions/forge.bash' >> ~/.bashrc

# Or setup command
forge setup-completion
```

**Command-specific completion (optional):**
```bash
function command_deploy_complete {
  local cur="$1"
  # Static suggestions
  COMPREPLY=( $(compgen -W "dev staging prod" -- "$cur") )
}

function command_deploy_complete {
  local cur="$1"
  # Dynamic from terraform
  local workspaces=$(terraform workspace list 2>/dev/null | sed 's/^[* ] //')
  COMPREPLY=( $(compgen -W "$workspaces" -- "$cur") )
}
```

---

### 6. Error Handling

**Recommendation: Configurable Verbosity**

**Default (simple):**
```bash
ERROR: forge command failed with exit code 1
Command: forge deploy prod
```

**With --debug flag:**
```bash
ERROR: Command failed
---
Exit code: 1
Working directory: /home/user/project
Command: forge deploy prod
Failed command: terraform apply
Line: 42
Function: command_deploy
Source: /home/user/project/.forge/config.bash

Last 5 commands:
  terraform workspace select prod
  terraform plan -out=plan.tfplan
  terraform show plan.tfplan
  terraform apply plan.tfplan  ← FAILED
---
```

**Implementation:**
```bash
declare -g debug_mode=false

# Parse global flags
for arg in "$@"; do
  case $arg in
    --debug) debug_mode=true; shift ;;
    --) break ;;
  esac
done

function on_error {
  local exit_code=$?

  if $debug_mode; then
    echo "ERROR: Command failed" >&2
    echo "---" >&2
    echo "Exit code: $exit_code" >&2
    echo "Working directory: $PWD" >&2
    echo "Command: $basename $*" >&2
    echo "Function: ${FUNCNAME[@]}" >&2
    echo "Source: ${BASH_SOURCE[@]}" >&2
    echo "---" >&2
  else
    echo "" >&2
    echo "ERROR: forge command failed with exit code $exit_code" >&2
    echo "Command: $basename $*" >&2
    echo "" >&2
    echo "Run with --debug for more details" >&2
  fi

  exit $exit_code
}
```

---

### 7. State System

**Recommendation: Keep Simple, Add Escaping**

**Current issues:**
```bash
state["key"]="value with 'quotes'"  # Breaks
state["key"]="value
with newline"  # Breaks
```

**Improved version:**
```bash
function write_state {
  local tmpfile="${state_file}.tmp"
  {
    echo "# Generated by forge on $(date)"
    for key in "${!state[@]}"; do
      # Use printf %q for safe escaping
      printf "state[%q]=%q\n" "$key" "${state[$key]}"
    done
  } > "$tmpfile"

  # Atomic write
  mv "$tmpfile" "$state_file"
}

function read_state {
  if [[ -f "$state_file" ]]; then
    # Source file safely
    source "$state_file"
  fi
}
```

**Benefits:**
- ✅ Handles quotes, newlines, special chars
- ✅ Atomic writes (no corruption)
- ✅ Still human-readable (mostly)
- ✅ Backward compatible with simple values

---

### 8. Language Choice

**Recommendation: Stick with Bash**

**Rationale:**
1. ✅ Command execution is primary use case (Bash excels)
2. ✅ Zero dependencies (pre-installed)
3. ✅ Instant startup (no interpreter overhead)
4. ✅ User extensibility (just source .bash files)
5. ✅ Cultural fit (DevOps/SRE teams)
6. ✅ Current investment (forge/commando working)

**Mitigations for Bash limitations:**
1. **Testing** - Document bats-core usage
2. **Linting** - Run shellcheck in CI
3. **Safety** - Provide good utility functions
4. **Version** - Require Bash 4+ with auto-upgrade
5. **Docs** - Document common gotchas

---

### 9. Naming

**Recommendation: Keep "forge"**

**Rationale:**
1. ✅ Already working well
2. ✅ Strong metaphor (building/crafting)
3. ✅ Professional and memorable
4. ✅ No migration needed
5. ✅ Better than "commando" (shorter, less aggressive)

**If you must change:** Use "kit" (short, clear, professional)

---

## Implementation Roadmap

### Phase 1: CWD-Aware Core (Week 1)

**Goal:** Basic CWD-awareness working

**Tasks:**
1. Implement `find_forge_dir()` function
2. Update path resolution in main script
3. Test with existing cirqil projects
4. Ensure backward compatibility

**Success:** Can run `forge` from project subdirectories

---

### Phase 2: Module System (Week 2)

**Goal:** Shared module repository

**Tasks:**
1. Create `~/.forge/lib/` structure
2. Implement `load_module()` function
3. Move aws.bash, terraform.bash to shared location
4. Update projects to use load_module
5. Test module precedence

**Success:** Multiple projects share same modules

---

### Phase 3: Help System (Week 3)

**Goal:** Command discovery and help

**Tasks:**
1. Implement `command_help` function
2. Add auto-discovery of commands
3. Support `command_NAME_description` variables
4. Support `command_NAME_help` functions
5. Intercept `-h`/`--help` flags

**Success:** `forge help` lists commands, `forge help deploy` shows details

---

### Phase 4: Completion (Week 4)

**Goal:** Shell completion support

**Tasks:**
1. Create bash completion script
2. Create zsh completion script
3. Add `command___list_commands` helper
4. Support `command_NAME_complete` functions
5. Add `forge setup-completion` command
6. Test in both shells

**Success:** Tab completion works for commands and arguments

---

### Phase 5: Polish (Week 5)

**Goal:** Production-ready

**Tasks:**
1. Improve error handling (debug mode)
2. Fix state system escaping
3. Add comprehensive documentation
4. Create migration guide
5. Write tests (bats-core)
6. Run shellcheck, fix issues

**Success:** Ready for production use

---

## Migration Path

### For Existing Projects

**Option A: Keep old forge (backward compatible)**
```bash
# Detect old-style forge
if [[ "$0" == *"/.forge/"* ]]; then
  # Running from project-embedded forge (old style)
  use_old_behavior=true
fi
```

**Option B: Migrate (recommended)**

**Step 1:** Install new forge
```bash
git clone https://github.com/jdillon/forge ~/.forge
export PATH="$HOME/.forge/bin:$PATH"
```

**Step 2:** Update project
```bash
cd ~/project
# Remove old forge script
rm forge

# Update .forge/config.bash
cat > .forge/config.bash <<'EOF'
# Load shared modules
load_module aws
load_module terraform

# Project-specific config
aws_vault_profile="myproject-admin"

# Load project commands
source "${forgedir}/mycommands.bash"
EOF
```

**Step 3:** Test
```bash
cd ~/project/src/anywhere
forge help
forge deploy dev
```

---

## Core Utilities Library

**Recommendation:** Provide standard utilities

**~/.forge/lib/core.bash:**
```bash
# Logging
function log_info { echo "[INFO] $*" >&2; }
function log_warn { echo "[WARN] $*" >&2; }
function log_error { echo "[ERROR] $*" >&2; }
function log_debug { $debug_mode && echo "[DEBUG] $*" >&2; }

# Validation
function require_command {
  local cmd="$1"
  command -v "$cmd" >/dev/null || die "Required command not found: $cmd"
}

function require_env {
  local var="$1"
  [[ -n "${!var}" ]] || die "Required environment variable not set: $var"
}

function require_file {
  local file="$1"
  [[ -f "$file" ]] || die "Required file not found: $file"
}

# Prompts
function confirm {
  local prompt="${1:-Continue?}"
  local response
  read -p "$prompt [y/N] " response
  [[ "$response" =~ ^[Yy]$ ]]
}

function prompt {
  local var="$1"
  local message="$2"
  local default="${3:-}"
  read -p "$message ${default:+[$default] }" value
  eval "$var=\"${value:-$default}\""
}

# Execution
function run {
  log_debug "Running: $*"
  "$@"
}

function run_quiet {
  "$@" >/dev/null 2>&1
}

function run_or_die {
  "$@" || die "Command failed: $*"
}
```

---

## Success Metrics

### For Framework
- [ ] Can install once, use in multiple projects
- [ ] Can run from any project subdirectory
- [ ] Can share modules across projects
- [ ] Can discover available commands
- [ ] Can complete commands in shell
- [ ] Backward compatible with existing projects

### For Users
- [ ] New project setup < 5 minutes
- [ ] Adding command < 10 lines of code
- [ ] Finding commands without reading source
- [ ] Module sharing reduces duplication 80%+
- [ ] Framework core < 300 lines

---

## What NOT to Do

Based on commando analysis:

❌ **Don't** require explicit command registration
```bash
define_command 'deploy' command_deploy  # NO!
```
✅ **Do** auto-discover via naming convention
```bash
function command_deploy { ... }  # YES!
```

❌ **Don't** separate help from implementation
```bash
help_define_description deploy '...'  # NO!
help_define_syntax deploy '...'
help_define_doc deploy '...'
```
✅ **Do** co-locate help with command
```bash
function command_deploy { ... }
function command_deploy_help { ... }  # YES!
```

❌ **Don't** create complex module system
```bash
define_module __mymodule_module "$@"  # NO!
require_module other_module
prepare_modules
```
✅ **Do** use simple sourcing
```bash
load_module aws  # YES! (with search path)
```

❌ **Don't** require learning domain-specific syntax
✅ **Do** use standard bash conventions

---

## Final Thoughts

The goal is to create **forge with batteries included** while maintaining its core simplicity. The key insights:

1. **Forge's design is fundamentally right** - Command naming pattern, configuration as code, minimal abstraction
2. **Add convenience, not complexity** - CWD-awareness, modules, help, completion
3. **Commando's lessons** - What not to do (over-engineering)
4. **Stay in bash** - Right tool for the job
5. **Keep it hackable** - Users should understand and modify

**Bottom line:** Evolution, not revolution. Make forge better without losing what makes it great.
