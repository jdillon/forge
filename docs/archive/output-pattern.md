# Output Pattern: println, log_debug, and echo

**Created**: 2025-10-29
**Status**: Current Implementation Pattern
**Concern**: Design limitation due to Bash function return value constraints

---

## Current Pattern

### Three Output Functions

#### 1. `println` - User-Facing Messages (stderr)
**Usage**: All informational, status, warning, and error messages shown to users.

**Implementation**:
```bash
function println {
  echo "$@" >&2
}
```

**Examples**:
```bash
println "==> Syncing website to $bucket"
println "✓ Sync complete"
println "ERROR: Bucket not found"
println "WARNING: No index.html found"
```

#### 2. `log_debug` - Debug Messages (stderr)
**Usage**: Debug output for troubleshooting, hidden unless debug mode is enabled.

**Implementation**:
```bash
function log_debug {
  println "[DEBUG] > $@"
}
```

**Examples**:
```bash
log_debug "Using aws-vault profile: $aws_vault_profile"
log_debug "CloudFront distribution ID: $dist_id"
```

#### 3. `echo` - Function Return Values & File Writes (stdout)
**Usage**:
- Return values from functions (via command substitution)
- Writing content to files

**Examples**:
```bash
# Function return value
function website_bucket_name {
  echo "cirqil-website-cirqil-com-${website_env}-origin"
}
bucket=$(website_bucket_name)  # Command substitution captures stdout

# File write
echo "# $(date)" > "$state_file"
echo "$key=$value" >> "$state_file"
```

---

## The Pattern in Action

### ✅ Good: Function with Return Value
```bash
function get_cloudfront_distribution_id {
  if [[ -n "$cloudfront_distribution_id" ]]; then
    echo "$cloudfront_distribution_id"  # Return value (stdout)
    return 0
  fi

  println "Fetching CloudFront distribution ID from AWS..."  # User message (stderr)

  local dist_id
  dist_id=$(aws cloudfront list-distributions ...)

  if [[ -n "$dist_id" ]]; then
    echo "$dist_id"  # Return value (stdout)
    return 0
  fi

  println "ERROR: Could not find CloudFront distribution"  # Error message (stderr)
  return 1
}

# Usage
dist_id=$(get_cloudfront_distribution_id) || return 1
println "Using distribution: $dist_id"
```

### ❌ Bad: Mixing stdout messages with return values
```bash
function get_cloudfront_distribution_id {
  echo "Fetching CloudFront distribution ID..."  # BAD: Goes to stdout
  local dist_id=$(aws cloudfront list-distributions ...)
  echo "$dist_id"  # Return value mixed with user messages!
}

# Result: Caller gets "Fetching CloudFront distribution ID...\nE1QNCONB10TP5N"
dist_id=$(get_cloudfront_distribution_id)  # Broken!
```

---

## Design Rationale

### Why All User Messages Go to stderr

**Problem**: Bash functions can only return numeric exit codes (0-255). To return strings, we must use `echo` to stdout and capture via command substitution `$(...)`.

**Consequence**: If we mixed user-facing messages on stdout, they would corrupt function return values.

**Solution**: Segregate output streams:
- **stdout**: Reserved exclusively for function return values and file writes
- **stderr**: All human-readable output (info, warnings, errors, debug)

### Example of the Problem

```bash
# If we used stdout for messages:
function build_publish_dir {
  echo "Building publish directory..."  # Oops, goes to stdout
  echo "Copying files..."                # Oops, goes to stdout
  echo "$publish_dir"                     # Return value
}

# Caller breaks:
dir=$(build_publish_dir)
# $dir now contains: "Building publish directory...\nCopying files...\n/tmp/publish-20251029"
cd "$dir"  # ERROR: No such file or directory
```

---

## Design Concern & Future Consideration

### The Limitation

**Current Reality**: We're forced to send **all** informational output to stderr, even though stderr is conventionally reserved for errors and warnings.

**Unix Convention Violation**:
- **stdout**: Normal program output (what we want for info messages)
- **stderr**: Error messages and diagnostics (what we're using for everything)

### Why This Matters

#### 1. **Semantic Clarity**
```bash
# Traditional Unix tool:
./tool --info          # Info to stdout, errors to stderr
./tool --info 2>err.log  # Can redirect errors separately

# Our current pattern:
./forge website_publish staging          # ALL output to stderr
./forge website_publish staging 2>err.log  # Oops, hides all messages!
```

#### 2. **Pipeline Composability**
```bash
# Can't easily pipe informational output:
./forge website_list staging | grep ".html"  # Doesn't work, output on stderr
./forge website_list staging 2>&1 | grep ".html"  # Ugly workaround
```

#### 3. **User Experience**
```bash
# Users can't separate info from errors:
./forge website_publish staging 2>errors.log  # Hides everything, not just errors
```

### Root Cause

Bash's limitation: Functions can't return complex data structures, forcing us to:
1. Use stdout for return values (command substitution)
2. Push everything else to stderr (to avoid corrupting returns)

---

## Future Redesign Options

When reconsidering the architecture, here are potential approaches:

### Option 1: Structured Return Values
Use global variables or associative arrays instead of command substitution:

```bash
# Instead of:
dist_id=$(get_cloudfront_distribution_id)

# Use global variables:
get_cloudfront_distribution_id  # Sets global $cloudfront_distribution_id
echo "Using distribution: $cloudfront_distribution_id"

# Pro: Info can go to stdout
# Con: Implicit side effects, harder to track
```

### Option 2: Explicit Output Channels
Add verbosity flags to control what goes where:

```bash
# Normal mode: info to stdout, errors to stderr
./forge website_publish staging

# Quiet mode: only return values to stdout
./forge website_publish staging --quiet

# Verbose mode: everything to stderr (current behavior)
./forge website_publish staging --verbose
```

### Option 3: Separate Query vs. Action Commands
- **Query commands** return values on stdout (machine-readable)
- **Action commands** show info on stderr (human-readable)

```bash
# Query (stdout):
./forge website_bucket_name staging  # Returns: cirqil-website-...

# Action (stderr):
./forge website_publish staging      # Shows progress messages
```

### Option 4: Different Language
Move to a language with proper return types (Go, Rust, Python) where:
- Functions can return complex data structures
- stdout/stderr usage aligns with Unix conventions
- No need for command substitution hacks

---

## Summary

**Current Pattern Works But Is Non-Ideal**:
- ✅ **Functional**: Gets the job done
- ✅ **Consistent**: Clear pattern across codebase
- ⚠️ **Violates conventions**: stderr used for all output
- ⚠️ **Limits composability**: Can't pipe informational output
- ⚠️ **Forces workarounds**: `2>&1` required for filters

**Root Issue**: Bash's string return limitation forces architectural compromise.

**Recommendation**: Document this pattern clearly, but consider future redesign in a language with proper return types and data structures.

---

## Implementation Checklist

When writing new forge commands:

- [ ] User-facing messages use `println`
- [ ] Debug messages use `log_debug`
- [ ] Function return values use `echo` (stdout)
- [ ] File writes use `echo > file`
- [ ] Never mix stdout messages in functions that return values
- [ ] Document return value in function comment

---

## References

- Main forge script: `forge`
- Helper functions: `.forge/aws.bash`, `.forge/terraform.bash`, `.forge/website.bash`
- Initial implementation: 2025-10-29 (commit: TBD)
