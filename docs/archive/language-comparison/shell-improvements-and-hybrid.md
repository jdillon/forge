# Shell Improvements & Hybrid Approaches

**Created**: 2025-10-29
**Context**: Deep dive into Zsh/Bash 5+ improvements, helper libraries, and hybrid architectures

---

## Part 1: Zsh Function Handling Improvements

### What Zsh Does Better Than Bash 4

#### 1. Return Values via `reply` Variable

**Bash (current OUTPUT_PATTERN hack):**
```bash
function get_distribution_id {
  println "Fetching distribution..." >&2  # Must use stderr!
  echo "E1ABC123"  # Return via stdout (corrupts if mixed)
}

dist_id=$(get_distribution_id)  # Command substitution required
```

**Zsh (with `reply`):**
```zsh
function get_distribution_id {
  print "Fetching distribution..."  # Can use stdout!
  reply="E1ABC123"  # Set special variable
}

get_distribution_id  # Just call it
dist_id=$reply  # Read from reply
```

**Assessment:**
- ✅ **Solves OUTPUT_PATTERN** - stdout free for messages
- ✅ **Cleaner than command substitution**
- ⚠️ **Global variable** (implicit side effect)
- ⚠️ **Still not as clean as real returns**

#### 2. Associative Array Returns

**Zsh can return complex data:**
```zsh
typeset -gA reply

function get_resource_info {
  print "Fetching resource info..."
  reply=(
    id "E1ABC123"
    name "my-distribution"
    status "Deployed"
  )
}

get_resource_info
print "ID: $reply[id]"
print "Name: $reply[name]"
print "Status: $reply[status]"
```

**Assessment:**
- ✅ **Can return structured data**
- ✅ **No JSON parsing needed for simple cases**
- ⚠️ **Still global variable pattern**
- ⚠️ **Not as nice as Python dicts or TS objects**

#### 3. Better Array Handling

**Bash 4:**
```bash
local arr=("a" "b" "c")
echo "${arr[@]}"  # All elements
echo "${arr[0]}"  # First (0-indexed)
echo "${#arr[@]}" # Length
```

**Zsh:**
```zsh
local arr=("a" "b" "c")
print $arr      # All elements (no [@] needed!)
print $arr[1]   # First (1-indexed - more intuitive)
print $#arr     # Length (cleaner syntax)
```

**Assessment:**
- ✅ **More intuitive defaults**
- ✅ **1-indexed like most languages**
- ⚠️ **Breaking change from Bash**

#### 4. Anonymous Functions

**Zsh has lambda-like functions:**
```zsh
# Create a scope without polluting namespace
() {
  local temp_var="value"
  # Do work
  # temp_var dies here
}

# With parameters
() {
  local env=$1
  local bucket=$2
  # Deploy logic here
} staging my-bucket
```

**Assessment:**
- ✅ **Good for scoping**
- ✅ **Avoid function name pollution**
- ⚠️ **Unusual syntax**
- ⚠️ **Not a game-changer for forge use case**

#### 5. Advanced Parameter Expansion

**Zsh has more powerful expansions:**
```zsh
# Split string into array
files=(${(s:,:)string})  # Split on comma

# Unique elements
unique=(${(u)array})

# Sort
sorted=(${(o)array})

# Case modification
upper=${(U)string}
lower=${(L)string}
```

**Assessment:**
- ✅ **Reduces need for external commands** (sed, awk, sort)
- ✅ **Cleaner than Bash parameter expansion**
- ⚠️ **Syntax still weird**

---

## Part 2: Bash 5+ Improvements

### What's New in Bash 5.0+ (Released 2019)

#### 1. Nameref Improvements

**Bash 4:**
```bash
function set_value {
  local -n ref=$1
  ref="new value"
}

my_var=""
set_value my_var
echo $my_var  # "new value"
```

**Bash 5:**
```bash
# Same as Bash 4, but:
# - Better error messages
# - Fixed bugs with nameref in arrays
# - nameref can reference another nameref
```

**Assessment:**
- ✅ **Nameref is the "proper" way to return values in Bash**
- ✅ **Avoids OUTPUT_PATTERN hack**
- ⚠️ **More verbose than Python/TS returns**
- ⚠️ **Still feels like a workaround**

**Usage in Forge:**
```bash
function get_distribution_id {
  local -n out=$1  # First param is return variable name

  println "Fetching distribution..."  # Can use stdout now!

  out=$(aws cloudfront list-distributions ...)
}

# Call it:
local dist_id
get_distribution_id dist_id  # Pass variable name
echo "Distribution: $dist_id"
```

**Pros vs Current OUTPUT_PATTERN:**
- ✅ **stdout available for messages**
- ✅ **Explicit return parameter**
- ✅ **No command substitution overhead**

**Cons:**
- ⚠️ **Caller must declare variable first**
- ⚠️ **More verbose at call site**
- ⚠️ **Easy to forget and pass value instead of name**

#### 2. Associative Array Improvements

**Bash 5 allows `declare -A` in functions:**
```bash
function get_resource_info {
  local -n result=$1
  declare -A result  # Works in Bash 5!

  result[id]="E1ABC123"
  result[name]="my-distribution"
  result[status]="Deployed"
}

declare -A info
get_resource_info info
echo "ID: ${info[id]}"
```

**Assessment:**
- ✅ **Can return structured data**
- ✅ **Better than multiple return variables**
- ⚠️ **Still verbose compared to Python dicts**

#### 3. `$EPOCHSECONDS` and `$EPOCHREALTIME`

**Bash 5:**
```bash
# Unix timestamp (seconds)
echo $EPOCHSECONDS

# High-resolution (seconds.microseconds)
echo $EPOCHREALTIME

# No more $(date +%s) needed!
```

**Assessment:**
- ✅ **Faster than calling date**
- ✅ **Good for timestamps in state system**

#### 4. `wait -n` and `wait -p`

**Bash 5 job control improvements:**
```bash
# Start multiple background jobs
terraform plan &
aws s3 sync &
docker build &

# Wait for first to complete
wait -n

# Wait and get PID of completed job
wait -p completed_pid
echo "Job $completed_pid completed"
```

**Assessment:**
- ✅ **Better parallel job control**
- ✅ **Useful for concurrent deployments**

---

## Part 3: Zsh vs Bash 5 for Forge

### Comparison: OUTPUT_PATTERN Solutions

| Approach | Bash 4 (current) | Bash 5 (nameref) | Zsh (reply) | Python/TS |
|----------|------------------|------------------|-------------|-----------|
| **Syntax** | `$(func)` | `func varname` | `func; $reply` | `var = func()` |
| **stdout** | ❌ Reserved | ✅ Free | ✅ Free | ✅ Free |
| **Explicit** | ⚠️ Implicit | ✅ Explicit param | ⚠️ Global var | ✅ return statement |
| **Verbosity** | Low | Medium | Low | Low |
| **Intuitive** | ⚠️ Hack | ⚠️ Workaround | ⚠️ Magic variable | ✅ Natural |

### Recommendation: Bash 5 + Nameref

**If staying with shell**, use Bash 5 with nameref pattern:

```bash
#!/usr/bin/env bash

# Require Bash 5
if [ "${BASH_VERSINFO:-0}" -lt 5 ]; then
  die "Forge requires Bash 5+"
fi

# Return values via nameref
function get_distribution_id {
  local -n out_dist_id=$1

  println "Fetching CloudFront distribution..."

  out_dist_id=$(aws cloudfront list-distributions ...)

  if [[ -z "$out_dist_id" ]]; then
    println "ERROR: Distribution not found"
    return 1
  fi
}

# Usage
function command_invalidate {
  local dist_id
  get_distribution_id dist_id || return 1

  println "Invalidating distribution: $dist_id"
  aws cloudfront create-invalidation --distribution-id "$dist_id" ...
}
```

**Pros:**
- ✅ **Solves OUTPUT_PATTERN cleanly**
- ✅ **More explicit than Zsh `reply`**
- ✅ **Bash 5 widely available** (macOS via Homebrew, most Linux)
- ✅ **Can use auto-upgrade trick** from current forge

**Cons:**
- ⚠️ **Still more verbose than Python/TS**
- ⚠️ **Bash 5 not default on macOS** (but we handle this)

---

## Part 4: Helper Library (Reduce Raw Bash)

### What I Mean by "Helper Library"

**Problem**: Raw Bash is error-prone and verbose.

**Solution**: Provide utility functions that wrap common patterns safely.

### Example Helper Library

**File: `~/.forge/lib/core.bash`**

```bash
#!/usr/bin/env bash
# Forge Core Utilities
# Automatically loaded by forge framework

#═══════════════════════════════════════════════════════════════════════════
# Logging & Output
#═══════════════════════════════════════════════════════════════════════════

function log_info {
  println "[INFO] $*"
}

function log_warn {
  println "[WARN] $*"
}

function log_error {
  println "[ERROR] $*"
}

function log_success {
  println "[✓] $*"
}

function log_debug {
  if [[ "${FORGE_DEBUG:-}" == "true" ]]; then
    println "[DEBUG] $*"
  fi
}

#═══════════════════════════════════════════════════════════════════════════
# Command Execution with Logging
#═══════════════════════════════════════════════════════════════════════════

# Run command with debug logging
function run {
  log_debug "Running: $*"
  "$@"
}

# Run command quietly (suppress stdout/stderr)
function run_quiet {
  "$@" >/dev/null 2>&1
}

# Run command, die on failure
function run_or_die {
  if ! "$@"; then
    die "Command failed: $*"
  fi
}

# Run command, capture output, die on failure
function capture_or_die {
  local -n out_var=$1
  shift

  if ! out_var=$("$@" 2>&1); then
    die "Command failed: $*"
  fi
}

#═══════════════════════════════════════════════════════════════════════════
# Validation Helpers
#═══════════════════════════════════════════════════════════════════════════

function require_command {
  local cmd="$1"
  if ! command -v "$cmd" >/dev/null 2>&1; then
    die "Required command not found: $cmd"
  fi
}

function require_env {
  local var="$1"
  if [[ -z "${!var:-}" ]]; then
    die "Required environment variable not set: $var"
  fi
}

function require_file {
  local file="$1"
  if [[ ! -f "$file" ]]; then
    die "Required file not found: $file"
  fi
}

function require_dir {
  local dir="$1"
  if [[ ! -d "$dir" ]]; then
    die "Required directory not found: $dir"
  fi
}

function require_args {
  local expected=$1
  local actual=$2
  if [[ $actual -lt $expected ]]; then
    die "Expected $expected arguments, got $actual"
  fi
}

#═══════════════════════════════════════════════════════════════════════════
# User Input Helpers
#═══════════════════════════════════════════════════════════════════════════

# Prompt for yes/no confirmation
function confirm {
  local prompt="${1:-Continue?}"
  local default="${2:-n}"

  local yn
  if [[ "$default" == "y" ]]; then
    read -p "$prompt [Y/n] " yn
    yn="${yn:-y}"
  else
    read -p "$prompt [y/N] " yn
    yn="${yn:-n}"
  fi

  [[ "$yn" =~ ^[Yy] ]]
}

# Prompt for input with default
function prompt {
  local -n out_value=$1
  local message="$2"
  local default="${3:-}"

  if [[ -n "$default" ]]; then
    read -p "$message [$default]: " out_value
    out_value="${out_value:-$default}"
  else
    read -p "$message: " out_value
  fi
}

# Select from options
function select_option {
  local -n out_selection=$1
  shift
  local options=("$@")

  println "Select an option:"
  for i in "${!options[@]}"; do
    println "  $((i+1)). ${options[$i]}"
  done

  local selection
  while true; do
    read -p "Enter number (1-${#options[@]}): " selection
    if [[ "$selection" =~ ^[0-9]+$ ]] && \
       [[ $selection -ge 1 ]] && \
       [[ $selection -le ${#options[@]} ]]; then
      out_selection="${options[$((selection-1))]}"
      break
    fi
    println "Invalid selection. Try again."
  done
}

#═══════════════════════════════════════════════════════════════════════════
# Path & File Utilities
#═══════════════════════════════════════════════════════════════════════════

# Get absolute path
function abspath {
  local -n out_path=$1
  local path="$2"
  out_path="$(cd "$(dirname "$path")" && pwd)/$(basename "$path")"
}

# Create temp file with optional content
function temp_file {
  local -n out_file=$1
  local content="${2:-}"

  out_file=$(mktemp)
  if [[ -n "$content" ]]; then
    echo "$content" > "$out_file"
  fi
}

# Create temp directory
function temp_dir {
  local -n out_dir=$1
  out_dir=$(mktemp -d)
}

# Safe remove (only removes if path is under specific directory)
function safe_remove {
  local path="$1"
  local allowed_prefix="$2"

  # Resolve to absolute paths
  local abs_path
  abspath abs_path "$path"
  local abs_prefix
  abspath abs_prefix "$allowed_prefix"

  # Check path starts with prefix
  if [[ "$abs_path" != "$abs_prefix"* ]]; then
    die "Refusing to remove $abs_path (not under $abs_prefix)"
  fi

  rm -rf "$abs_path"
}

#═══════════════════════════════════════════════════════════════════════════
# JSON Utilities (requires jq)
#═══════════════════════════════════════════════════════════════════════════

function json_get {
  local -n out_value=$1
  local json="$2"
  local query="$3"

  require_command jq
  out_value=$(echo "$json" | jq -r "$query")
}

function json_get_array {
  local -n out_array=$1
  local json="$2"
  local query="$3"

  require_command jq
  readarray -t out_array < <(echo "$json" | jq -r "$query")
}

#═══════════════════════════════════════════════════════════════════════════
# Retry & Timeout Utilities
#═══════════════════════════════════════════════════════════════════════════

function retry {
  local max_attempts=$1
  shift
  local delay=${1:-5}
  shift

  local attempt=1
  while [[ $attempt -le $max_attempts ]]; do
    log_debug "Attempt $attempt/$max_attempts: $*"

    if "$@"; then
      return 0
    fi

    if [[ $attempt -lt $max_attempts ]]; then
      log_warn "Failed. Retrying in ${delay}s..."
      sleep "$delay"
    fi

    ((attempt++))
  done

  log_error "Failed after $max_attempts attempts"
  return 1
}

function timeout {
  local duration=$1
  shift

  # Run command with timeout
  ( "$@" ) &
  local pid=$!

  ( sleep "$duration" && kill -TERM "$pid" 2>/dev/null ) &
  local watcher=$!

  if wait "$pid" 2>/dev/null; then
    kill -TERM "$watcher" 2>/dev/null
    return 0
  else
    log_error "Command timed out after ${duration}s"
    return 124
  fi
}

#═══════════════════════════════════════════════════════════════════════════
# Parallel Execution (Bash 5+)
#═══════════════════════════════════════════════════════════════════════════

function parallel {
  local -a pids=()

  # Start all commands in background
  for cmd in "$@"; do
    $cmd &
    pids+=($!)
  done

  # Wait for all to complete
  local failed=0
  for pid in "${pids[@]}"; do
    if ! wait "$pid"; then
      ((failed++))
    fi
  done

  return $failed
}
```

### Usage in User Commands

**Instead of raw Bash:**
```bash
function command_deploy {
  local env=$1

  if [[ -z "$env" ]]; then
    echo "ERROR: Environment required"
    return 1
  fi

  if ! command -v terraform >/dev/null; then
    echo "ERROR: terraform not found"
    return 1
  fi

  echo "Deploying to $env..."

  terraform workspace select "$env"
  if [[ $? -ne 0 ]]; then
    echo "ERROR: Failed to select workspace"
    return 1
  fi

  terraform apply
}
```

**With helper library:**
```bash
function command_deploy {
  local env=$1
  require_args 1 $#

  require_command terraform

  log_info "Deploying to $env..."

  run_or_die terraform workspace select "$env"
  run_or_die terraform apply

  log_success "Deploy complete"
}
```

**Benefits:**
- ✅ **Less error-prone** (validation helpers)
- ✅ **More readable** (semantic function names)
- ✅ **Consistent** (standardized logging, error handling)
- ✅ **Less raw Bash** (hide the weird syntax)
- ✅ **Still just Bash** (no new language)

---

## Part 5: Hybrid Approach

### Concept: Bash Framework + Language-Specific Helpers

**Core Idea**: Framework in Bash, heavy lifting in other languages when needed.

### Architecture

```
forge (bash)
  ↓
.forge/config.bash (loads modules)
  ↓
command_* functions (bash)
  ↙     ↓     ↘
 python  bun  ruby  (when bash isn't enough)
```

### Pattern 1: Bash Command Delegates to Script

**File: `.forge/commands.bash`**
```bash
function command_analyze_logs {
  local logfile=$1
  require_args 1 $#
  require_file "$logfile"

  log_info "Analyzing logs..."

  # Delegate to Python for complex processing
  "$forgedir/scripts/analyze_logs.py" "$logfile"
}

function command_deploy {
  local env=$1
  require_args 1 $#

  log_info "Deploying to $env..."

  # Bash is fine for command orchestration
  terraform workspace select "$env"
  terraform apply
}
```

**File: `.forge/scripts/analyze_logs.py`**
```python
#!/usr/bin/env python3
import sys
import json
from collections import Counter

logfile = sys.argv[1]

# Python excels at text processing
with open(logfile) as f:
    errors = [line for line in f if 'ERROR' in line]

# Analyze patterns
error_counts = Counter(
    line.split('[')[1].split(']')[0]
    for line in errors
    if '[' in line
)

# Output results
print(json.dumps(error_counts, indent=2))
```

**Assessment:**
- ✅ **Use right tool for the job**
- ✅ **Bash for commands, Python for processing**
- ✅ **Scripts are executable** (shebang line)
- ✅ **Can be in any language** (Python, Ruby, TS, etc.)

### Pattern 2: Module Bundles

**Concept**: A module can include multiple files/languages.

**Structure:**
```
~/.forge/modules/
└── aws-enhanced/
    ├── module.bash       # Main interface (command_* functions)
    ├── cost-analyzer.py  # Python helper
    ├── log-parser.ts     # Bun/Deno helper
    └── README.md         # Documentation
```

**File: `module.bash`**
```bash
#!/usr/bin/env bash
# AWS Enhanced Module

declare -g aws_module_dir
aws_module_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

function command_aws_costs {
  local period="${1:-month}"

  log_info "Analyzing AWS costs for $period..."

  # Get cost data from AWS
  local cost_data
  cost_data=$(aws ce get-cost-and-usage \
    --time-period Start=2024-01-01,End=2024-12-31 \
    --granularity MONTHLY \
    --metrics BlendedCost)

  # Delegate to Python for analysis
  echo "$cost_data" | "$aws_module_dir/cost-analyzer.py" "$period"
}

function command_aws_logs {
  local log_group=$1
  require_args 1 $#

  log_info "Parsing CloudWatch logs..."

  # Get logs from AWS
  aws logs tail "$log_group" --follow=false --format short | \
    bun "$aws_module_dir/log-parser.ts"
}
```

**File: `cost-analyzer.py`**
```python
#!/usr/bin/env python3
import json
import sys

cost_data = json.load(sys.stdin)
period = sys.argv[1]

# Complex analysis in Python
# (Pandas, matplotlib, whatever you need)
total = sum(
    float(result['Total']['BlendedCost']['Amount'])
    for result in cost_data['ResultsByTime']
)

print(f"Total cost for {period}: ${total:.2f}")
```

**File: `log-parser.ts`**
```typescript
#!/usr/bin/env bun
// TypeScript for async processing

const lines = await Bun.stdin.text();

// Parse and analyze
const errors = lines.split('\n')
  .filter(line => line.includes('ERROR'))
  .map(line => JSON.parse(line));

// Group by error type
const grouped = errors.reduce((acc, err) => {
  acc[err.type] = (acc[err.type] || 0) + 1;
  return acc;
}, {});

console.log(JSON.stringify(grouped, null, 2));
```

### Pattern 3: Polyglot Module Loading

**Framework discovers language and executes appropriately:**

```bash
function load_module {
  local module_name=$1
  local module_path=$(find_module "$module_name")

  if [[ ! -d "$module_path" ]]; then
    die "Module not found: $module_name"
  fi

  # Load main module file based on language
  if [[ -f "$module_path/module.bash" ]]; then
    source "$module_path/module.bash"
  elif [[ -f "$module_path/module.sh" ]]; then
    source "$module_path/module.sh"
  elif [[ -f "$module_path/mod.ts" ]]; then
    # TypeScript module (Deno/Bun)
    eval "$(bun "$module_path/mod.ts" --export-commands)"
  elif [[ -f "$module_path/__init__.py" ]]; then
    # Python module
    eval "$(python3 "$module_path/__init__.py" --export-commands)"
  else
    die "No entry point found in module: $module_name"
  fi
}
```

### Hybrid: Comparison of Approaches

| Approach | Complexity | Flexibility | Performance | User Experience |
|----------|------------|-------------|-------------|-----------------|
| **Pure Bash** | Low | Low | Fast | Simple but limited |
| **Pure Python/TS** | Medium | High | Medium | Consistent but verbose for commands |
| **Bash + Python scripts** | Low | High | Fast (Bash), Slow (Python) | Best of both? |
| **Bash + Bun scripts** | Low | High | Fast (both) | Compelling! |
| **Polyglot modules** | High | Very High | Varies | Complex to maintain |

### Recommended Hybrid: Bash + Bun

**Why Bun specifically:**

1. ✅ **Fast startup** (<10ms, vs Python's 20-30ms)
2. ✅ **`$` operator** makes command execution easy from TS
3. ✅ **Single binary** (easy to install requirement)
4. ✅ **TypeScript** (type safety when you need it)
5. ✅ **npm ecosystem** (when you need packages)

**Architecture:**
```bash
# Main framework: Bash
forge (bash 5+)
  ↓
# Commands: Bash by default
command_deploy() { ... }  # Pure bash
  ↓
# Complex logic: Delegate to Bun when needed
command_analyze() {
  bun "$forgedir/scripts/analyze.ts" "$@"
}
```

**Example Module Bundle:**

```
~/.forge/modules/kubernetes/
├── module.bash           # Bash interface
├── helm-helper.bash      # Bash utilities
├── manifest-validator.ts # Bun script
└── log-analyzer.ts       # Bun script
```

**module.bash:**
```bash
function command_k8s_deploy {
  local env=$1

  # Bash for command orchestration
  log_info "Deploying to $env..."

  # Validate manifests with TypeScript
  bun "$k8s_module_dir/manifest-validator.ts" k8s/*.yaml || return 1

  # Deploy with kubectl
  kubectl apply -f k8s/

  log_success "Deployed to $env"
}

function command_k8s_logs {
  local pod=$1

  # Get logs from kubectl
  kubectl logs -f "$pod" | \
    # Parse with TypeScript
    bun "$k8s_module_dir/log-analyzer.ts"
}
```

---

## Part 6: Recommendations

### If Staying Pure Shell

**Best Option: Bash 5 + Nameref + Helper Library**

1. ✅ **Require Bash 5** (with auto-upgrade like current forge)
2. ✅ **Use nameref pattern** for returns (solves OUTPUT_PATTERN)
3. ✅ **Provide rich helper library** (reduce raw bash)
4. ✅ **Keep user extensibility simple** (source .bash files)

**Example:**
```bash
#!/usr/bin/env bash

if [ "${BASH_VERSINFO:-0}" -lt 5 ]; then
  # Auto-upgrade logic here
  die "Forge requires Bash 5+"
fi

# Load helpers
source ~/.forge/lib/core.bash

# User commands use helpers
function command_deploy {
  local env=$1
  require_args 1 $#

  local dist_id
  get_distribution_id dist_id || return 1  # nameref pattern

  log_info "Deploying to $env..."
  run_or_die terraform apply
}
```

### If Going Hybrid

**Best Option: Bash 5 + Bun Scripts**

**Why this combo:**
- ✅ **Bash for framework** (commands, orchestration)
- ✅ **Bun for complex logic** (parsing, processing, APIs)
- ✅ **Fast startup on both** (<10ms)
- ✅ **Simple delegation** (just exec the script)
- ✅ **User choice** (use bash or bun per command)

**Installation:**
```bash
# Users install Bun once
curl -fsSL https://bun.sh/install | bash

# Forge requires it
require_command bun
```

**Module structure:**
```
~/.forge/
├── bin/forge               # Bash framework
├── lib/
│   ├── core.bash           # Bash helpers
│   ├── aws.bash            # Pure bash module
│   └── k8s/                # Hybrid module
│       ├── module.bash     # Bash interface
│       └── helpers.ts      # Bun helpers
```

### If Going Pure Language

**Best Option: Bun + TypeScript**

Based on LANGUAGE_SYNTAX_COMPARISON.md:
- ⭐ **Bun scored 42/50** (highest)
- ⭐ **`$` operator** makes commands nearly as easy as bash
- ⭐ **Fast, modern, type-safe**

---

## Part 7: Decision Matrix

### Quick Decision Guide

| Your Need | Recommendation |
|-----------|----------------|
| **Simplicity above all** | Bash 5 + Helper Library |
| **Type safety important** | Bun + TypeScript |
| **Can't require installs** | Bash 5 (auto-upgrade) |
| **Complex data processing** | Bash + Bun Hybrid |
| **Team with JS/TS experience** | Bun + TypeScript |
| **Team with shell experience** | Bash 5 + Helpers |
| **Need operator overloading** | None (but Bun's `$` is close) |
| **Want best of both worlds** | Bash + Bun Hybrid ⭐ |

### My Top Recommendation: Bash + Bun Hybrid

**Rationale:**

1. **Framework stays Bash** - familiar, fast, great for commands
2. **Helper library** reduces raw bash pain
3. **Nameref pattern** solves OUTPUT_PATTERN cleanly
4. **Bun available** for when bash isn't enough
5. **User choice** - write commands in bash or TS
6. **Bundled modules** can include both
7. **Migration path** - start bash, add TS gradually

**Example Project:**
```
myproject/
├── forge -> ~/.forge/bin/forge    # Symlink to installed forge
└── .forge/
    ├── config.bash                # Load modules
    ├── commands.bash              # Bash commands
    └── scripts/
        └── complex-task.ts        # Bun when needed
```

Would you like me to prototype this hybrid approach?
