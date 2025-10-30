# Understanding `reply` (Zsh) and `nameref` (Bash 5+)

**Problem**: How to return values from shell functions without the OUTPUT_PATTERN hack

---

## The Problem: Bash Function Returns

### Why We Can't Just Return Values

**Bash functions can ONLY return exit codes (0-255):**
```bash
function my_function {
  return 42  # Only numbers 0-255!
}

my_function
echo $?  # Prints: 42
```

**To return strings, we're forced to use command substitution:**
```bash
function get_name {
  echo "John"  # Goes to stdout
}

name=$(get_name)  # Capture stdout
echo "Hello, $name"
```

**This breaks if we mix user messages with return values:**
```bash
function get_name {
  echo "Looking up name..."  # Oops! Goes to stdout too
  echo "John"
}

name=$(get_name)  # Gets: "Looking up name...\nJohn"
echo "Hello, $name"  # Hello, Looking up name...
                     # John
```

**That's why we invented the OUTPUT_PATTERN hack** - all messages to stderr:
```bash
function get_name {
  println "Looking up name..." >&2  # Must use stderr
  echo "John"  # stdout for return
}
```

---

## Solution 1: Zsh's `reply` Variable

### How It Works

**Zsh has a special global variable called `reply`:**
```zsh
function get_distribution_id {
  print "Fetching distribution from AWS..."  # Can use stdout!

  local dist_id=$(aws cloudfront list-distributions ...)
  reply="$dist_id"  # Set magic variable
}

# Call function
get_distribution_id

# Read from reply
dist_id=$reply
echo "Got: $dist_id"
```

**User sees:**
```
Fetching distribution from AWS...
Got: E1ABC123
```

### Multiple Return Values

**Can return arrays too:**
```zsh
function get_user_info {
  print "Looking up user..."

  reply=(
    "John Doe"
    "john@example.com"
    "555-1234"
  )
}

get_user_info
name=$reply[1]
email=$reply[2]
phone=$reply[3]

echo "Name: $name"
echo "Email: $email"
```

### Structured Data with Associative Arrays

```zsh
typeset -gA reply  # Global associative array

function get_aws_resource {
  print "Fetching resource info..."

  reply=(
    id "E1ABC123"
    name "my-distribution"
    status "Deployed"
    region "us-east-1"
  )
}

get_aws_resource
echo "ID: $reply[id]"
echo "Name: $reply[name]"
echo "Status: $reply[status]"
```

### Pros and Cons

**Pros:**
- ✅ **Frees stdout** - Can use for messages
- ✅ **Simple syntax** - Just set `reply=value`
- ✅ **Supports arrays** - Can return multiple values
- ✅ **Supports associative arrays** - Can return structured data

**Cons:**
- ⚠️ **Global variable** - Implicit side effect
- ⚠️ **Naming collision risk** - What if two functions both use reply?
- ⚠️ **Not explicit** - Caller doesn't know function returns via reply
- ⚠️ **Zsh only** - Not portable to Bash

---

## Solution 2: Bash 5's `nameref`

### How It Works

**Nameref creates a reference to another variable by name:**
```bash
function get_distribution_id {
  local -n out_var=$1  # First parameter is the OUTPUT variable name

  println "Fetching distribution from AWS..."  # Can use stdout!

  out_var=$(aws cloudfront list-distributions ...)
}

# Caller must pass variable NAME:
local dist_id
get_distribution_id dist_id  # Pass the NAME "dist_id", not its value

echo "Got: $dist_id"
```

**User sees:**
```
Fetching distribution from AWS...
Got: E1ABC123
```

### How Nameref Works Under the Hood

**`local -n` creates an alias:**
```bash
function example {
  local -n result=$1  # $1 is "my_var"

  # Now "result" is an ALIAS for whatever variable name was passed
  result="hello"  # Actually sets the CALLER's variable
}

my_var="initial"
echo $my_var  # initial

example my_var  # Pass variable NAME
echo $my_var  # hello (was modified inside function!)
```

### Multiple Return Values

**Use multiple parameters:**
```bash
function get_user_info {
  local -n out_name=$1
  local -n out_email=$2
  local -n out_phone=$3

  println "Looking up user..."

  out_name="John Doe"
  out_email="john@example.com"
  out_phone="555-1234"
}

local name email phone
get_user_info name email phone

echo "Name: $name"
echo "Email: $email"
```

### Structured Data with Associative Arrays

**Bash 5 allows this:**
```bash
function get_aws_resource {
  local -n out_info=$1

  println "Fetching resource info..."

  # Modify the CALLER's associative array
  out_info[id]="E1ABC123"
  out_info[name]="my-distribution"
  out_info[status]="Deployed"
  out_info[region]="us-east-1"
}

# Caller declares associative array
declare -A info
get_aws_resource info

echo "ID: ${info[id]}"
echo "Name: ${info[name]}"
echo "Status: ${info[status]}"
```

### Common Pitfalls

**1. Passing value instead of name:**
```bash
local dist_id=""
get_distribution_id "$dist_id"  # WRONG! Passes empty string ""

get_distribution_id dist_id     # RIGHT! Passes the name "dist_id"
```

**2. Variable naming conflicts:**
```bash
function bad_example {
  local -n result=$1
  local result="oops"  # ERROR! Can't have local with same name
}
```

**3. Forgetting to declare variable first:**
```bash
get_distribution_id dist_id  # Error if dist_id doesn't exist!

local dist_id                # Must declare first
get_distribution_id dist_id  # Now works
```

### Pros and Cons

**Pros:**
- ✅ **Frees stdout** - Can use for messages
- ✅ **Explicit** - Function signature shows it modifies a variable
- ✅ **No global pollution** - Caller controls variable name
- ✅ **Multiple returns** - Use multiple parameters
- ✅ **Bash 5** - More portable than Zsh
- ✅ **Supports arrays** - Can return arrays and associative arrays

**Cons:**
- ⚠️ **More verbose** - Caller must declare variable first
- ⚠️ **Easy to mess up** - Must pass NAME not VALUE
- ⚠️ **Parameter position matters** - First param is "return variable"
- ⚠️ **Requires Bash 5** - Not in Bash 4

---

## Side-by-Side Comparison

### Example: Get CloudFront Distribution ID

**Current (OUTPUT_PATTERN hack):**
```bash
function get_distribution_id {
  println "Fetching distribution..." >&2  # MUST use stderr

  local dist_id=$(aws cloudfront list-distributions ...)
  echo "$dist_id"  # Return via stdout
}

dist_id=$(get_distribution_id)  # Command substitution
```

**Zsh (reply):**
```zsh
function get_distribution_id {
  print "Fetching distribution..."  # Can use stdout

  reply=$(aws cloudfront list-distributions ...)
}

get_distribution_id
dist_id=$reply
```

**Bash 5 (nameref):**
```bash
function get_distribution_id {
  local -n out_dist_id=$1

  println "Fetching distribution..."  # Can use stdout

  out_dist_id=$(aws cloudfront list-distributions ...)
}

local dist_id
get_distribution_id dist_id
```

**Python (for comparison):**
```python
def get_distribution_id():
    print("Fetching distribution...")  # Normal stdout

    dist_id = aws_cloudfront_list()
    return dist_id  # Real return

dist_id = get_distribution_id()  # Just works
```

---

## Which Should We Use?

### If Staying with Shell

**Use Bash 5 + nameref:**

**Reasons:**
1. ✅ **More explicit** than Zsh `reply` (function signature shows intent)
2. ✅ **More portable** (Bash more common than Zsh)
3. ✅ **No global pollution** (caller controls variable names)
4. ✅ **Can auto-upgrade** (like current forge does for Bash 4)

**Example pattern:**
```bash
#!/usr/bin/env bash

# Require Bash 5
if [ "${BASH_VERSINFO:-0}" -lt 5 ]; then
  # Try to re-exec with newer Bash
  for candidate in /opt/homebrew/bin/bash /usr/local/bin/bash; do
    if [ -x "$candidate" ]; then
      if "$candidate" -c '[[ ${BASH_VERSINFO[0]} -ge 5 ]]'; then
        exec "$candidate" "$0" "$@"
      fi
    fi
  done
  echo "ERROR: Bash 5+ required" >&2
  exit 2
fi

# Now we can use nameref everywhere
function get_value {
  local -n out=$1
  println "Getting value..."
  out="result"
}
```

### If Going Hybrid or Pure Language

**Use Python or Bun (real returns):**
```python
def get_value():
    print("Getting value...")
    return "result"

value = get_value()  # Natural
```

```typescript
function getValue(): string {
  console.log("Getting value...");
  return "result";
}

const value = getValue();  // Natural
```

---

## Real Forge Example: Website Commands

### Current (OUTPUT_PATTERN):

```bash
function get_cloudfront_distribution_id {
  if [[ -n "$cloudfront_distribution_id" ]]; then
    echo "$cloudfront_distribution_id"  # Return via stdout
    return 0
  fi

  println "Fetching CloudFront distribution ID..." >&2  # stderr

  local dist_id
  dist_id=$(aws cloudfront list-distributions ...)

  if [[ -n "$dist_id" ]]; then
    echo "$dist_id"  # Return via stdout
    return 0
  fi

  println "ERROR: Could not find distribution" >&2
  return 1
}

# Usage
dist_id=$(get_cloudfront_distribution_id) || return 1
println "Using distribution: $dist_id"
```

### With Bash 5 Nameref:

```bash
function get_cloudfront_distribution_id {
  local -n out_dist_id=$1

  if [[ -n "$cloudfront_distribution_id" ]]; then
    out_dist_id="$cloudfront_distribution_id"
    return 0
  fi

  println "Fetching CloudFront distribution ID..."  # Can use stdout!

  out_dist_id=$(aws cloudfront list-distributions ...)

  if [[ -z "$out_dist_id" ]]; then
    println "ERROR: Could not find distribution"
    return 1
  fi
}

# Usage
local dist_id
get_cloudfront_distribution_id dist_id || return 1
println "Using distribution: $dist_id"
```

**Benefits:**
- ✅ `println` can use stdout (no `>&2` needed)
- ✅ More explicit (function signature shows out parameter)
- ✅ No command substitution overhead
- ⚠️ Slightly more verbose at call site

---

## Summary

| Approach | Stdout Free? | Explicit? | Portable? | Intuitive? |
|----------|-------------|-----------|-----------|------------|
| **OUTPUT_PATTERN** (current) | ❌ No | ⚠️ Implicit | ✅ Bash 4+ | ⚠️ Hack |
| **Zsh reply** | ✅ Yes | ❌ Implicit | ⚠️ Zsh only | ⚠️ Magic var |
| **Bash 5 nameref** | ✅ Yes | ✅ Explicit | ✅ Bash 5+ | ⚠️ Moderate |
| **Python/TS return** | ✅ Yes | ✅ Explicit | ✅ Yes | ✅ Natural |

**Recommendation:**
- **Staying shell**: Use Bash 5 + nameref
- **Going modern**: Use Bun/Python (real returns)
- **Hybrid**: Bash 5 for framework, Bun for complex scripts

The nameref pattern is the **cleanest shell-native solution** to the OUTPUT_PATTERN problem.
