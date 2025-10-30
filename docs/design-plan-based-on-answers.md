# Forge 2.0 Design Plan - Based on Jason's Answers

**Date**: 2025-10-29
**Status**: Prototype Phase
**Approach**: Quick prototypes to explore options

---

## Executive Summary

Based on your answers, here's the design direction:

### Core Decisions

1. **Installation**: Git clone to `~/.forge`, manual + auto-update
2. **Language**: Bash 5 + Bun hybrid (prototype both approaches)
3. **Config Discovery**: Walk up tree (like git), with CLI flag/env var override
4. **Modules**: Hybrid (project > user > system), explicit loading
5. **State**: Structured (JSON or YAML), both project + user scope
6. **Help**: Simple descriptions + usage, optional full help
7. **Completion**: Important (Phase 2), basic + intermediate
8. **Priority**: 1. CWD-aware, 2. Modules, 3. Updates, 4. Completion, 5. Errors, 6. Help

---

## Architecture Overview

### Directory Structure

```
~/.forge/                       # Framework install
├── bin/
│   └── forge                   # Main executable
├── lib/
│   ├── core.bash               # Helper library
│   ├── aws.bash                # Shared module
│   ├── terraform.bash          # Shared module
│   └── kubernetes/             # Module bundle
│       ├── module.bash
│       └── helpers.ts          # Bun helper
├── completions/
│   ├── forge.bash              # Bash completion
│   └── _forge                  # Zsh completion
└── .git/                       # Git repo for updates

~/.config/forge/                # User config (modern location)
└── config.bash                 # User overrides

project/
├── forge/                      # Visible directory (not hidden)
│   ├── config.bash             # Project config
│   ├── local.bash              # User/machine specific (gitignored)
│   ├── state.json              # Project state
│   ├── state.local.json        # User state (gitignored)
│   ├── commands.bash           # Project commands
│   └── scripts/
│       └── analyze.ts          # Bun scripts when needed
└── .gitignore                  # Ignore forge/local.bash, forge/state.local.json
```

### Key Design Choices

**Installation**: `~/.forge` (standard)
- Git-based for versioning and updates
- Modern user config: `~/.config/forge/` (optional)

**Project Config**: `project/forge/` (visible, not hidden)
- Your reasoning: Hidden `.forge` for install, visible `forge/` for project
- Helps group related files
- More discoverable than `.forge`

**Naming**: Keep "forge" (no rename needed)

---

## Phase 1: CWD-Aware Core (Priority 1)

### Goal
Run `forge <command>` from any subdirectory in a project.

### Implementation

**Config Discovery Algorithm:**
```bash
function find_forge_dir {
  # 1. Check CLI flag: forge --root=/path/to/project deploy
  if [[ -n "${FORGE_ROOT:-}" ]]; then
    if [[ -d "$FORGE_ROOT/forge" ]]; then
      echo "$FORGE_ROOT/forge"
      return 0
    fi
  fi

  # 2. Check environment variable
  if [[ -n "${FORGE_PROJECT:-}" ]]; then
    if [[ -d "$FORGE_PROJECT/forge" ]]; then
      echo "$FORGE_PROJECT/forge"
      return 0
    fi
  fi

  # 3. Walk up directory tree (like git)
  local dir="$PWD"
  while [[ "$dir" != "/" && "$dir" != "" ]]; do
    if [[ -d "$dir/forge" ]]; then
      echo "$dir/forge"
      return 0
    fi
    # Also check for .forge (backward compat during transition)
    if [[ -d "$dir/.forge" ]]; then
      echo "$dir/.forge"
      return 0
    fi
    dir=$(dirname "$dir")
  done

  return 1
}

# Usage
forgedir=$(find_forge_dir) || die "No forge/ directory found. Run from a forge project."
basedir=$(dirname "$forgedir")
```

**Nested Projects (Monorepo):**
- Like git: stops at first `forge/` directory found
- User can override with `--root` flag or `FORGE_PROJECT` env var
- Future: Add "contextual commands" (commands that know about parent projects)

### Testing
```bash
cd ~/project/src/components/foo/bar
forge deploy  # Works! Finds ~/project/forge/

cd ~/project
FORGE_PROJECT=/other/project forge deploy  # Uses /other/project

forge --root=/specific/project deploy  # Explicit override
```

---

## Phase 2: Module System (Priority 2)

### Goal
Share common modules across projects, eliminate duplication.

### Module Loading

**Search Path (precedence order):**
1. Project: `$basedir/forge/lib/` (highest priority)
2. User: `~/.config/forge/lib/` or `~/.forge/lib/`
3. System: `~/.forge/lib/` (installed with framework)

**Explicit Loading:**
```bash
# In project/forge/config.bash
load_module aws          # Searches project → user → system
load_module terraform    # Declares dependency order
load_module my_project   # Project-specific module
```

**Implementation:**
```bash
function load_module {
  local module_name=$1
  local module_file="${module_name}.bash"
  local tried=()

  # Search path
  local search_paths=(
    "$forgedir/lib"           # Project
    ~/.config/forge/lib       # User (modern)
    ~/.forge/lib              # System
  )

  for dir in "${search_paths[@]}"; do
    local path="$dir/$module_file"
    if [[ -f "$path" ]]; then
      log_debug "Loading module: $module_name from $path"
      source "$path"
      return 0
    fi
    tried+=("$path")
  done

  die "Module '$module_name' not found. Tried: ${tried[*]}"
}
```

### Module Dependencies

**Declaration in module:**
```bash
# In terraform.bash
# FORGE_REQUIRES: aws

# Validate at runtime
if ! type -t aws_vault_prefix >/dev/null; then
  die "terraform module requires aws module"
fi
```

**Framework reads requirements:**
```bash
function check_module_requirements {
  local module_file=$1
  local requires=$(grep '^# FORGE_REQUIRES:' "$module_file" | cut -d: -f2)

  for req in $requires; do
    if ! module_loaded "$req"; then
      warn "Module $module_file requires $req (loading it now)"
      load_module "$req"
    fi
  done
}
```

### Module Bundles (Multi-File)

**Structure:**
```
~/.forge/lib/kubernetes/
├── module.bash           # Main entry point (commands)
├── lib/
│   └── helpers.bash      # Bash utilities
└── scripts/
    └── validator.ts      # Bun helpers
```

**Loading:**
```bash
function load_module {
  # ... search logic ...

  # Check if it's a directory (bundle)
  if [[ -d "$path" ]]; then
    if [[ -f "$path/module.bash" ]]; then
      source "$path/module.bash"

      # Auto-load lib/*.bash helpers
      for helper in "$path/lib"/*.bash; do
        [[ -f "$helper" ]] && source "$helper"
      done

      return 0
    fi
  fi

  # Regular file
  source "$path"
}
```

---

## Phase 3: Auto-Update System (Priority 3)

### Goal
Keep forge and modules updated automatically.

### Update Command

```bash
function command_forge_update {
  local check_only=false

  # Parse flags
  while [[ $# -gt 0 ]]; do
    case $1 in
      --check) check_only=true; shift ;;
      *) die "Unknown option: $1" ;;
    esac
  done

  cd ~/.forge || die "Forge installation not found"

  if ! [[ -d .git ]]; then
    die "Forge was not installed via git. Cannot auto-update."
  fi

  # Fetch latest
  log_info "Checking for updates..."
  git fetch origin --quiet

  # Check if updates available
  local local_rev=$(git rev-parse HEAD)
  local remote_rev=$(git rev-parse origin/main)

  if [[ "$local_rev" == "$remote_rev" ]]; then
    log_info "Forge is up to date ($(git rev-parse --short HEAD))"
    return 0
  fi

  log_info "Update available: $local_rev → $remote_rev"

  if $check_only; then
    return 0
  fi

  # Show changes
  log_info "Changes:"
  git log --oneline HEAD..origin/main

  # Confirm
  if ! confirm "Update forge?"; then
    log_info "Update cancelled"
    return 0
  fi

  # Update
  log_info "Updating forge..."
  git pull origin main

  log_success "Forge updated successfully"
  log_info "Restart your shell to use the new version"
}
```

**Auto-check on startup:**
```bash
# In ~/.forge/bin/forge
function check_for_updates {
  local last_check_file=~/.forge/.last_update_check
  local now=$(date +%s)

  # Check once per day
  if [[ -f "$last_check_file" ]]; then
    local last_check=$(cat "$last_check_file")
    local age=$((now - last_check))
    if [[ $age -lt 86400 ]]; then
      return  # Checked recently
    fi
  fi

  # Update check timestamp
  echo "$now" > "$last_check_file"

  # Background check (don't slow down command)
  (
    cd ~/.forge
    git fetch origin --quiet
    local local_rev=$(git rev-parse HEAD)
    local remote_rev=$(git rev-parse origin/main 2>/dev/null)

    if [[ -n "$remote_rev" && "$local_rev" != "$remote_rev" ]]; then
      println "📦 Forge update available. Run: forge update"
    fi
  ) &
}

# Only check on interactive commands (not scripts)
if [[ -t 1 ]]; then
  check_for_updates
fi
```

### Module Updates

**Modules in `~/.forge/lib/` update with forge:**
```bash
cd ~/.forge && git pull  # Updates framework + bundled modules
```

**User modules in `~/.config/forge/lib/` managed separately:**
```bash
# User installs module:
forge module install https://github.com/user/forge-aws ~/.config/forge/lib/

# User updates module:
forge module update aws
```

---

## Phase 4: Shell Completion (Priority 4)

### Goal
Tab completion for commands and arguments.

### Basic Completion (A + B)

**Bash:**
```bash
# ~/.forge/completions/forge.bash
_forge_complete() {
  local cur="${COMP_WORDS[COMP_CWORD]}"
  local prev="${COMP_WORDS[COMP_CWORD-1]}"

  # Complete command names
  if [[ $COMP_CWORD -eq 1 ]]; then
    local commands=$(forge --list-commands 2>/dev/null)
    COMPREPLY=( $(compgen -W "$commands" -- "$cur") )
    return
  fi

  # Command-specific completion (if defined)
  local cmd="${COMP_WORDS[1]}"
  if type -t "_forge_complete_${cmd}" >/dev/null 2>&1; then
    "_forge_complete_${cmd}" "$cur" "$prev"
    return
  fi

  # Default: file completion
  COMPREPLY=( $(compgen -f -- "$cur") )
}

complete -F _forge_complete forge
```

**Framework support:**
```bash
function command___list_commands {
  # Hidden command for completion
  compgen -A function | grep '^command_' | grep -v '^command___' | sed 's/^command_//'
}
```

**Command-specific completion:**
```bash
# In project/forge/commands.bash
function command_deploy {
  local env=$1
  # ... deploy logic
}

# Optional completion
function _forge_complete_deploy {
  local cur=$1
  # Static options
  COMPREPLY=( $(compgen -W "dev staging production" -- "$cur") )
}
```

**Advanced completion (C - opt-in):**
```bash
function _forge_complete_deploy {
  local cur=$1
  # Dynamic: query terraform workspaces
  local workspaces=$(terraform workspace list 2>/dev/null | sed 's/^[* ] //')
  COMPREPLY=( $(compgen -W "$workspaces" -- "$cur") )
}
```

---

## Phase 5: Better Error Handling (Priority 5)

### Goal
Configurable error verbosity (simple by default, detailed with --debug).

### Implementation

**Debug mode:**
```bash
declare -g debug_mode=false

# Parse global flags
for arg in "$@"; do
  case $arg in
    --debug)
      debug_mode=true
      shift
      ;;
  esac
done

# Or via environment
if [[ "${FORGE_DEBUG:-}" == "true" ]]; then
  debug_mode=true
fi
```

**Error trap:**
```bash
function on_error {
  local exit_code=$?

  if $debug_mode; then
    println ""
    println "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    println "ERROR: Command failed"
    println "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    println "Exit code: $exit_code"
    println "Working directory: $PWD"
    println "Command: $basename $*"
    println ""
    println "Stack trace:"
    println "  Functions: ${FUNCNAME[*]}"
    println "  Source: ${BASH_SOURCE[*]}"
    println "  Lines: ${BASH_LINENO[*]}"
    println "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  else
    println ""
    println "ERROR: forge command failed with exit code $exit_code"
    println "Command: $basename $*"
    println ""
    println "Run with --debug for more details"
  fi

  exit $exit_code
}
```

**Debug logging:**
```bash
function log_debug {
  if $debug_mode; then
    println "[DEBUG] $*"
  fi
}

# Usage in code
log_debug "Loading module: $module_name from $path"
log_debug "Searching for forge/ in: $dir"
log_debug "Running: aws cloudfront list-distributions"
```

---

## Phase 6: Simple Help System (Priority 6)

### Goal
Basic discoverability without commando's verbosity.

### Implementation

**Auto-discovery:**
```bash
function command_help {
  local cmd="${1:-}"

  if [[ -z "$cmd" ]]; then
    # List all commands
    println "Available commands:"
    println ""

    local -a commands
    readarray -t commands < <(
      compgen -A function | \
      grep '^command_' | \
      grep -v '_help$' | \
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

    println ""
    println "Run 'forge help <command>' for more details"
  else
    # Show command help
    local help_fn="command_${cmd}_help"
    if type -t "$help_fn" >/dev/null 2>&1; then
      "$help_fn"
    else
      local desc_var="command_${cmd}_description"
      local desc="${!desc_var:-No description available}"
      println "$desc"
      println ""
      println "Usage: forge $cmd [arguments]"
    fi
  fi
}
```

**User adds simple description:**
```bash
function command_deploy {
  local env=$1
  # ... implementation
}
command_deploy_description="Deploy application to environment"
```

**Optional full help:**
```bash
function command_deploy_help {
  cat <<EOF
Usage: forge deploy <environment> [options]

Deploy application to specified environment.

Arguments:
  environment    Target environment (dev, staging, prod)

Options:
  -f, --force    Skip confirmation prompt
  --dry-run      Show what would be deployed

Examples:
  forge deploy staging
  forge deploy prod --dry-run
EOF
}
```

---

## State Management

### Structured State (JSON or YAML)

**Your preference**: JSON or YAML, lean toward YAML

**My recommendation**: **JSON** for simplicity
- Bash has `jq` available most places
- YAML parsing in bash requires external tool (yq)
- JSON is simpler to read/write from scripts

**Structure:**
```json
{
  "project": {
    "last_deploy_env": "staging",
    "last_deploy_time": "2024-10-29T12:00:00Z"
  },
  "user": {
    "default_env": "dev",
    "preferences": {
      "auto_confirm": false
    }
  }
}
```

**Implementation:**
```bash
# Read state
function read_state {
  if [[ -f "$forgedir/state.json" ]]; then
    # Read into associative array
    while IFS='=' read -r key value; do
      state["$key"]="$value"
    done < <(jq -r '.project | to_entries[] | "\(.key)=\(.value)"' "$forgedir/state.json")
  fi

  if [[ -f "$forgedir/state.local.json" ]]; then
    # Read user state
    while IFS='=' read -r key value; do
      user_state["$key"]="$value"
    done < <(jq -r '.user | to_entries[] | "\(.key)=\(.value)"' "$forgedir/state.local.json")
  fi
}

# Write state
function write_state {
  local tmp=$(mktemp)

  # Build JSON
  jq -n --arg env "${state[last_deploy_env]}" \
        --arg time "$(date -u +%Y-%m-%dT%H:%M:%SZ)" \
        '{
          project: {
            last_deploy_env: $env,
            last_deploy_time: $time
          }
        }' > "$tmp"

  mv "$tmp" "$forgedir/state.json"
}
```

**Helper library functions:**
```bash
function state_get {
  local key=$1
  echo "${state[$key]}"
}

function state_set {
  local key=$1
  local value=$2
  state["$key"]="$value"
}

function state_save {
  write_state
}
```

---

## Bash 5 vs Bun - The Decision

### Based on Your Context

**You said**: "I'm still thinking through what is best, so lets explore some options in prototypes."

### Recommendation: Prototype Both

**Option A**: Pure Bash 5 + Helper Library
- Solves OUTPUT_PATTERN with nameref
- Rich helper library reduces raw bash pain
- No dependencies (only Bash 5)

**Option B**: Bash 5 + Bun Hybrid
- Bash for framework & simple commands
- Bun for complex logic (parsing, APIs)
- Best of both worlds

**Option C**: Pure Bun
- Everything in TypeScript
- `$` operator makes commands easy
- Type safety everywhere

### Prototype Plan

**Week 1**: Bash 5 prototype
- CWD-aware discovery
- Module loading
- Nameref pattern
- Helper library
- Test with cirqil/website

**Week 2**: Bun hybrid prototype
- Same features
- Delegate complex tasks to .ts
- Test with same project

**Week 3**: Compare and decide
- Which feels better?
- Performance?
- Ease of adding commands?

---

## Git-Based Module Distribution

### Your preference: "strongly consider git-based"

**Module installation:**
```bash
forge module install https://github.com/jdillon/forge-aws
# Clones to ~/.forge/lib/aws/
```

**Implementation:**
```bash
function command_module {
  local action=$1
  shift

  case $action in
    install)
      local url=$1
      local name=$(basename "$url" .git)
      local dest=~/.forge/lib/$name

      if [[ -d "$dest" ]]; then
        die "Module $name already installed"
      fi

      log_info "Installing module: $name"
      git clone "$url" "$dest"
      log_success "Module $name installed"
      ;;

    update)
      local name=$1
      local dest=~/.forge/lib/$name

      if [[ ! -d "$dest" ]]; then
        die "Module $name not installed"
      fi

      log_info "Updating module: $name"
      (cd "$dest" && git pull)
      log_success "Module $name updated"
      ;;

    remove)
      local name=$1
      local dest=~/.forge/lib/$name

      if [[ ! -d "$dest" ]]; then
        die "Module $name not installed"
      fi

      if confirm "Remove module $name?"; then
        rm -rf "$dest"
        log_success "Module $name removed"
      fi
      ;;

    list)
      log_info "Installed modules:"
      for mod in ~/.forge/lib/*/; do
        local name=$(basename "$mod")
        if [[ -d "$mod/.git" ]]; then
          local rev=$(cd "$mod" && git rev-parse --short HEAD)
          echo "  $name ($rev)"
        else
          echo "  $name (not git-based)"
        fi
      done
      ;;
  esac
}
```

**Module versioning via git:**
```bash
# Install specific version
forge module install https://github.com/jdillon/forge-aws#v2.0

# Or after install
cd ~/.forge/lib/aws
git checkout v2.0
```

---

## Next Steps

### Immediate Actions

1. **Create Bash 5 prototype**
   - Implement CWD-aware discovery
   - Module loading system
   - Helper library
   - Test with real project

2. **Create Bun hybrid prototype**
   - Same features in bash
   - Add Bun delegation examples
   - Compare experience

3. **Document findings**
   - Which feels better?
   - Performance comparison
   - Ease of use

4. **Decide on approach**
   - Based on prototype experience
   - Then proceed with full implementation

### Implementation Priority

Based on your ranking: `1, 2, 8, 4, 5, 3 ... 6, 7`

1. ✅ **CWD-aware config discovery** - Phase 1
2. ✅ **Shared module repository** - Phase 2
3. ✅ **Auto-update mechanism** - Phase 3
4. ✅ **Shell completion** - Phase 4
5. ✅ **Better error handling** - Phase 5
6. ✅ **Help system** - Phase 6
7. ⏸️ **Testing support** - Later (you don't write tests)
8. ⏸️ **Module versioning** - Via git (built-in)

---

## Open Questions for Prototyping

1. **Config location**: `~/.forge` vs `~/.config/forge` vs both?
2. **Project dir**: `forge/` vs `.forge/` vs support both during transition?
3. **Bash 5 nameref**: Does it feel natural in practice?
4. **Bun delegation**: How often do you need it? Is it worth the dependency?
5. **State format**: JSON vs YAML in practice?

We'll answer these through prototyping.

**Ready to build the first prototype?** 🚀
