# Help Systems, Command Discovery, and Shell Completion

## The Challenge

Users need to:
1. **Discover** what commands are available
2. **Learn** what each command does
3. **Remember** command syntax
4. **Complete** commands while typing

Current state:
- **Forge**: No help system, manual reading of code
- **Commando**: Extensive help but very verbose to configure

Goal: **Automatic, low-friction, useful documentation**

## Requirements Analysis

### Must Have
1. List available commands
2. Show basic help for each command
3. Work with zero configuration (sensible defaults)
4. Support tab completion

### Should Have
5. Show command usage/syntax
6. Show examples
7. Group related commands
8. Show command aliases

### Nice to Have
9. Generate man pages
10. Export to markdown/HTML
11. Search commands
12. Interactive help

## Design Principles

1. **Auto-discovery over registration** - Find commands automatically
2. **Convention over configuration** - Use naming patterns
3. **Progressive enhancement** - Basic works by default, better with opt-in metadata
4. **DRY** - Don't repeat information
5. **Co-located** - Help near implementation

## Solution Space

### Level 0: No Help (Current Forge)

**User Experience:**
```bash
$ forge help
Unknown command: help

$ forge
usage: forge <command> [options]
```

Users must read source code to discover commands.

**Assessment:** ❌ Unacceptable for anything but personal scripts

---

### Level 1: Auto-Discovery with Basic Listing

**Implementation:**
```bash
function command_help {
  echo "Available commands:"
  compgen -A function | grep '^command_' | sed 's/^command_//' | sort
}
```

**User Experience:**
```bash
$ forge help
Available commands:
  aws
  deploy
  status
  terraform
  tf_apply
  tf_init
  tf_plan
```

**Assessment:** ✅ Minimal, automatic, better than nothing

---

### Level 2: One-Line Descriptions via Convention

**Implementation Pattern 1: Comment Above Function**
```bash
# Deploy application to environment
function command_deploy {
  ...
}
```

Extract via:
```bash
grep -B1 '^function command_' config.bash | awk ...
```

**Implementation Pattern 2: First Line of Function**
```bash
function command_deploy {
  : 'Deploy application to environment'
  ...
}
```

The `:` is a no-op, string is metadata.

**Implementation Pattern 3: Help Variable**
```bash
function command_deploy {
  ...
}
command_deploy_description="Deploy application to environment"
```

**User Experience:**
```bash
$ forge help
Available commands:
  deploy      Deploy application to environment
  status      Show deployment status
  terraform   Run terraform with aws-vault
  tf_init     Initialize terraform
```

**Assessment:** ✅ Good balance of effort vs value

---

### Level 3: Full Help with Metadata Functions

**Implementation:**
```bash
function command_deploy {
  local env=$1
  # implementation
}

function command_deploy_help {
  cat <<EOF
Usage: $basename deploy <environment> [options]

Deploy application to specified environment.

Arguments:
  environment    Target environment (dev, staging, prod)

Options:
  -f, --force    Skip confirmation prompt
  --dry-run      Show what would be deployed

Examples:
  $basename deploy staging
  $basename deploy prod --dry-run
EOF
}
```

**Discovery:**
```bash
# List commands
compgen -A function | grep '^command_' | grep -v '_help$'

# Show help
if type -t "command_${cmd}_help" >/dev/null; then
  "command_${cmd}_help"
fi
```

**User Experience:**
```bash
$ forge help deploy
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
```

**Assessment:** ✅ Excellent for complex commands, optional for simple ones

---

### Level 4: Structured Metadata (Commando Style)

**Implementation:**
```bash
function command_deploy {
  # implementation
}

help_define_description deploy 'Deploy application to environment'
help_define_syntax deploy '<environment> [options]'
help_define_doc deploy '\
$(BOLD ARGUMENTS)
  environment    Target environment

$(BOLD OPTIONS)
  -f, --force    Skip confirmation
  --dry-run      Preview only

$(BOLD EXAMPLES)
  $basename deploy staging
'
```

**Assessment:** ❌ Too verbose, separates help from code

---

## Recommended Approach: Hybrid

### Tier 1: Auto-Discovery (Always)

Every command is automatically discoverable:
```bash
$ forge help
Available commands:
  deploy
  status
  test
  ...
```

### Tier 2: One-Liners (Optional)

Add a description variable:
```bash
function command_deploy { ... }
command_deploy_description="Deploy application to environment"
```

Now shows in listing:
```bash
$ forge help
Available commands:
  deploy     Deploy application to environment
  status     Show deployment status
```

### Tier 3: Full Help (Optional)

Add a help function:
```bash
function command_deploy_help {
  cat <<EOF
Usage: forge deploy <environment> [options]
...
EOF
}
```

Now `forge help deploy` shows full details.

### Implementation

```bash
function command_help {
  local cmd="${1:-}"

  if [[ -z "$cmd" ]]; then
    # List all commands
    echo "Available commands:"
    echo ""

    local -a commands
    readarray -t commands < <(compgen -A function | grep '^command_' | grep -v '_help$' | sed 's/^command_//' | sort)

    # Find max command name length for formatting
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
        printf "  %s\n" "$cmd"
      fi
    done

    echo ""
    echo "Run '$basename help <command>' for more details."
  else
    # Show help for specific command
    local help_fn="command_${cmd}_help"
    if type -t "$help_fn" >/dev/null 2>&1; then
      "$help_fn"
    else
      # Fallback to basic help
      echo "Command: $cmd"
      local desc_var="command_${cmd}_description"
      local desc="${!desc_var:-No description available}"
      echo "$desc"
      echo ""
      echo "Usage: $basename $cmd [arguments]"
    fi
  fi
}

define_command help command_help
```

## Shell Completion

Shell completion is critical for good UX. Users type `forge d<TAB>` → `forge deploy`

### Bash Completion Implementation

**Basic completion script:**
```bash
# File: completions/forge-completion.bash
_forge_complete() {
  local cur="${COMP_WORDS[COMP_CWORD]}"
  local prev="${COMP_WORDS[COMP_CWORD-1]}"
  local cmd="${COMP_WORDS[1]}"

  # Complete command names
  if [[ $COMP_CWORD -eq 1 ]]; then
    local commands=$(cd "$(find_forge_dir)/.." && ./forge help-list-commands 2>/dev/null)
    COMPREPLY=( $(compgen -W "$commands" -- "$cur") )
    return
  fi

  # Delegate to command-specific completion
  if type -t "_forge_complete_${cmd}" >/dev/null 2>&1; then
    "_forge_complete_${cmd}" "$cur" "$prev"
  fi
}

complete -F _forge_complete forge
```

**Command-specific completion:**
```bash
# In command definition
function command_deploy_complete {
  local cur="$1"
  # Suggest environments
  COMPREPLY=( $(compgen -W "dev staging prod" -- "$cur") )
}

# Or via convention:
function command_deploy_complete {
  local cur="$1"
  # Read from config
  local envs="${deploy_environments[@]}"
  COMPREPLY=( $(compgen -W "$envs" -- "$cur") )
}
```

**Framework Helper:**
```bash
# Add to forge script
function command_help_list_commands {
  # Output just command names for completion
  compgen -A function | grep '^command_' | grep -v '_help$' | sed 's/^command_//'
}
```

### Zsh Completion Implementation

**Basic completion script:**
```bash
# File: completions/_forge
#compdef forge

_forge() {
  local -a commands
  commands=(
    ${(f)"$(forge help-list-commands 2>/dev/null)"}
  )

  if (( CURRENT == 2 )); then
    _describe 'command' commands
  else
    local cmd=${words[2]}
    if (( $+functions[_forge_complete_$cmd] )); then
      _forge_complete_$cmd
    fi
  fi
}

_forge
```

**Command-specific completion:**
```zsh
_forge_complete_deploy() {
  local -a envs
  envs=('dev:Development environment' 'staging:Staging environment' 'prod:Production environment')
  _describe 'environment' envs
}
```

### Installation

**For bash:**
```bash
# In ~/.bashrc or project setup
source /path/to/forge/completions/forge-completion.bash
```

**For zsh:**
```zsh
# In ~/.zshrc
fpath=(/path/to/forge/completions $fpath)
autoload -U compinit && compinit
```

**Auto-installation:**
```bash
# forge init command
function command_init_completion {
  case "$SHELL" in
    */bash)
      local rc="$HOME/.bashrc"
      echo "source \"$basedir/completions/forge-completion.bash\"" >> "$rc"
      echo "Added to $rc"
      ;;
    */zsh)
      local rc="$HOME/.zshrc"
      echo "fpath=(\"$basedir/completions\" \$fpath)" >> "$rc"
      echo "Added to $rc"
      ;;
  esac
}
```

## Advanced: Context-Aware Completion

Completion can be intelligent:

```bash
# Complete terraform workspace names
function command_deploy_complete {
  local cur="$1"
  local workspaces=$(terraform workspace list 2>/dev/null | sed 's/^[* ] //')
  COMPREPLY=( $(compgen -W "$workspaces" -- "$cur") )
}

# Complete git branches
function command_release_complete {
  local cur="$1"
  local branches=$(git branch 2>/dev/null | sed 's/^[* ] //')
  COMPREPLY=( $(compgen -W "$branches" -- "$cur") )
}

# Complete files matching pattern
function command_deploy_config_complete {
  local cur="$1"
  COMPREPLY=( $(compgen -f -X '!*.yaml' -- "$cur") )
}

# Complete from environment variable
function command_connect_complete {
  local cur="$1"
  COMPREPLY=( $(compgen -W "${DEPLOY_HOSTS}" -- "$cur") )
}
```

## Help Command Aliases

Support common patterns:
```bash
forge help deploy      # Full help
forge deploy --help    # Same
forge deploy -h        # Same
```

**Implementation:**
```bash
function run_command {
  local cmd="$1"; shift

  # Intercept help flags
  for arg in "$@"; do
    case $arg in
      -h|--help)
        command_help "$cmd"
        return
        ;;
    esac
  done

  # Run actual command
  local fn="command_$cmd"
  "$fn" "$@"
}
```

## Grouping Commands

For projects with many commands, grouping helps:

```bash
function command_help {
  echo "Deployment commands:"
  # List command_deploy_*
  echo ""
  echo "Testing commands:"
  # List command_test_*
  echo ""
  echo "Utility commands:"
  # List others
}
```

**Convention:**
- `command_deploy` → Deployment group
- `command_deploy_staging` → Deployment group
- `command_test_unit` → Testing group

**Implementation:**
```bash
# Group by prefix
local -A groups
for cmd in "${commands[@]}"; do
  local prefix="${cmd%%_*}"
  groups[$prefix]+="$cmd "
done

# Display by group
for group in "${!groups[@]}"; do
  echo "${group} commands:"
  for cmd in ${groups[$group]}; do
    echo "  $cmd"
  done
done
```

## Examples and Usage

Users learn best from examples. Help should show:

```bash
function command_deploy_help {
  cat <<EOF
Usage: forge deploy <environment> [options]

Deploy application to specified environment.

Examples:
  # Deploy to staging
  forge deploy staging

  # Deploy to production with confirmation
  forge deploy prod

  # Dry-run mode
  forge deploy prod --dry-run

  # Force deploy without prompt
  forge deploy prod --force
EOF
}
```

## Auto-Generated Help

Can we extract help from the code itself?

### From Parameter Usage

```bash
function command_deploy {
  local env="${1:?environment required}"
  local region="${2:-us-east-1}"
  # ...
}
```

Could extract:
- Required: `environment`
- Optional: `region` (default: us-east-1)

### From Comments

```bash
# @description Deploy application to environment
# @usage <environment> [region]
# @arg environment Target environment (required)
# @arg region AWS region (optional, default: us-east-1)
# @option --force Skip confirmation
# @example forge deploy staging
# @example forge deploy prod us-west-2
function command_deploy {
  # ...
}
```

Parse comments to generate help.

**Assessment:**
- Interesting but adds complexity
- Comments can drift from implementation
- Not worth the magic for this use case

## Man Page Generation

For installed frameworks, man pages are nice:

```bash
forge --generate-man > /usr/local/share/man/man1/forge.1
man forge
```

**Format:**
```
.TH FORGE 1 "October 2024" "Forge 2.0" "User Commands"
.SH NAME
forge \- project command framework
.SH SYNOPSIS
.B forge
[\fIcommand\fR] [\fIargs\fR...]
.SH DESCRIPTION
Forge is a command framework for project-specific commands.
...
```

**Generation:**
```bash
function generate_man_page {
  cat << 'EOF'
.TH FORGE 1 "$(date +"%B %Y")" "Forge 2.0" "User Commands"
...
EOF
  # Iterate commands and generate sections
}
```

## Interactive Help

For complex commands, interactive prompt:

```bash
$ forge deploy
Environment? (dev/staging/prod): prod
Region? [us-east-1]: us-west-2
Confirm deploy to prod in us-west-2? [y/N]: y
Deploying...
```

**Implementation:**
```bash
function command_deploy {
  local env="${1:-}"
  local region="${2:-us-east-1}"

  if [[ -z "$env" ]]; then
    read -p "Environment? (dev/staging/prod): " env
  fi

  if [[ -z "$region" ]]; then
    read -p "Region? [$region]: " region_input
    region="${region_input:-$region}"
  fi

  echo "Deploying to $env in $region..."
}
```

## Summary Recommendation

### Implement a 3-Tier Help System

**Tier 1: Auto-Discovery (Zero Config)**
```bash
forge help  # Lists all commands
```

**Tier 2: One-Line Descriptions (Minimal Config)**
```bash
command_deploy_description="Deploy application to environment"
```

**Tier 3: Full Help (Opt-In)**
```bash
function command_deploy_help { ... }
```

### Add Shell Completion

Provide completion scripts for bash/zsh:
- Command name completion
- Optional: command-specific argument completion

### Keep It Simple

**Don't:**
- ❌ Require registration of every command
- ❌ Separate help from implementation
- ❌ Complex metadata formats
- ❌ Auto-generation from comments

**Do:**
- ✅ Auto-discover commands
- ✅ Use simple conventions
- ✅ Make help optional
- ✅ Co-locate help with code
- ✅ Provide good examples

### Implementation Checklist

- [ ] `command_help` function for listing
- [ ] Support `command_NAME_description` variables
- [ ] Support `command_NAME_help` functions
- [ ] Intercept `-h`/`--help` flags
- [ ] Create bash completion script
- [ ] Create zsh completion script
- [ ] Add `help-list-commands` hidden command for completion
- [ ] Support command-specific completion via `command_NAME_complete`
- [ ] Format output nicely (column alignment)
- [ ] Show usage in fallback help

This provides **excellent UX with minimal configuration burden**.
