# Language Evaluation for Command Framework

## The Question

Should we build the next-gen framework in Bash, or consider alternatives like Python, Ruby, Go, or Node.js?

## Framework Requirements

Let's first establish what the framework needs to do well:

1. **Execute shell commands** - Primary use case
2. **Handle command output** - Capture, redirect, pipe
3. **Manage exit codes** - Detect failures
4. **Background processes** - Start/stop/monitor
5. **Environment variables** - Read/set/modify
6. **File operations** - Read config, write state
7. **Fast startup** - Don't slow down every command
8. **Ubiquitous** - Work on most Unix systems
9. **Minimal dependencies** - Don't require installation
10. **Easy to extend** - Users add project commands

## Language Analysis

### Bash (Current Choice)

**Pros:**
- ✅ **Native command execution** - Commands just work: `aws s3 ls`
- ✅ **Direct shell semantics** - Pipes, redirects, globs natural
- ✅ **Ubiquitous** - Pre-installed on all Unix systems
- ✅ **Zero dependencies** - No runtime to install
- ✅ **Instant startup** - No interpreter warmup
- ✅ **Users know bash** - Common skill for ops/devops
- ✅ **Direct access to shell features** - Job control, signal handling
- ✅ **No escaping needed** - Commands run as-is

**Cons:**
- ❌ **Bash 4+ requirement** - macOS ships Bash 3 (but we handle this)
- ❌ **Error-prone** - Easy to write brittle scripts
- ❌ **Limited data structures** - Arrays, associative arrays only
- ❌ **No standard library** - Must implement everything
- ❌ **Inconsistent behavior** - Varies by version/platform
- ❌ **Hard to test** - No good unit test framework
- ❌ **Weird syntax** - Brackets, quoting, expansion rules complex
- ❌ **Poor error messages** - Cryptic failures

**Command Execution Examples:**
```bash
# Native - just works
aws s3 ls

# With capture
output=$(aws s3 ls)

# Pipes natural
aws s3 ls | grep bucket

# Background jobs
terraform apply &
wait $!

# Exit codes
if terraform plan; then
  echo "Success"
fi
```

**Verdict:** ⭐⭐⭐⭐ (4/5)
Best for command execution, but language limitations hurt.

---

### Python

**Pros:**
- ✅ **Rich standard library** - JSON, HTTP, regex, etc built-in
- ✅ **Excellent data structures** - Lists, dicts, sets, etc
- ✅ **Strong ecosystem** - PyPI has everything
- ✅ **Good error messages** - Stack traces, type errors
- ✅ **Testable** - unittest, pytest widely used
- ✅ **Cross-platform** - Works on Windows too
- ✅ **Readable syntax** - Clear and consistent

**Cons:**
- ❌ **Not ubiquitous** - Not guaranteed on minimal systems
- ❌ **Version hell** - Python 2 vs 3, venv complexity
- ❌ **Command execution awkward** - subprocess.run() verbose
- ❌ **Slower startup** - Interpreter + imports add latency
- ❌ **Requires installation** - Not always available
- ❌ **Shell escaping** - Must escape/quote arguments
- ❌ **No native pipes** - Must construct manually

**Command Execution Examples:**
```python
# Simple command
import subprocess
result = subprocess.run(["aws", "s3", "ls"], capture_output=True)

# With shell features - dangerous!
subprocess.run("aws s3 ls | grep bucket", shell=True)

# Safe piping - verbose
p1 = subprocess.Popen(["aws", "s3", "ls"], stdout=subprocess.PIPE)
p2 = subprocess.Popen(["grep", "bucket"], stdin=p1.stdout, stdout=subprocess.PIPE)
output = p2.communicate()[0]

# Exit codes
try:
    subprocess.run(["terraform", "plan"], check=True)
    print("Success")
except subprocess.CalledProcessError:
    print("Failed")
```

**Verdict:** ⭐⭐⭐ (3/5)
Great language, but command execution is painful.

---

### Ruby

**Pros:**
- ✅ **Elegant syntax** - Beautiful, expressive
- ✅ **Good standard library** - Rich built-ins
- ✅ **Better command execution** - Backticks, %x{}, system()
- ✅ **Strong ecosystem** - RubyGems widely used
- ✅ **Testable** - RSpec, MiniTest
- ✅ **Metaprogramming** - Easy DSLs

**Cons:**
- ❌ **Not ubiquitous** - Must install Ruby
- ❌ **Version fragmentation** - rbenv, rvm complexity
- ❌ **Slower startup** - Interpreter warmup significant
- ❌ **Declining popularity** - Less common now
- ❌ **Still requires escaping** - Shell injection risks
- ❌ **Platform specific** - Unix-focused

**Command Execution Examples:**
```ruby
# Backticks
output = `aws s3 ls`

# System call
system("aws", "s3", "ls")

# Capture output
require 'open3'
stdout, stderr, status = Open3.capture3("aws", "s3", "ls")

# Pipes
output = `aws s3 ls | grep bucket`

# Exit codes
if system("terraform", "plan")
  puts "Success"
end
```

**Verdict:** ⭐⭐⭐ (3/5)
Better than Python for commands, but still not native.

---

### Go

**Pros:**
- ✅ **Single binary** - Easy distribution
- ✅ **Fast startup** - Native code, no interpreter
- ✅ **Cross-platform** - Compiles for Windows/Mac/Linux
- ✅ **Strong typing** - Catch errors early
- ✅ **Good tooling** - go fmt, go test built-in
- ✅ **No dependencies** - Statically linked
- ✅ **Concurrent** - Goroutines for parallelism

**Cons:**
- ❌ **Requires compilation** - Not a script anymore
- ❌ **No REPL/eval** - Can't source user code dynamically
- ❌ **Command execution verbose** - exec.Command boilerplate
- ❌ **No shell features** - Must implement pipes/redirects
- ❌ **Harder to customize** - Users can't add commands easily
- ❌ **Development cycle** - Edit, compile, test loop
- ❌ **Not a "script"** - Feels like an application

**Command Execution Examples:**
```go
// Simple command
cmd := exec.Command("aws", "s3", "ls")
output, err := cmd.Output()

// With pipes - manual setup
cmd1 := exec.Command("aws", "s3", "ls")
cmd2 := exec.Command("grep", "bucket")
pipe, _ := cmd1.StdoutPipe()
cmd2.Stdin = pipe
cmd1.Start()
cmd2.Start()
output, _ := cmd2.Output()

// Exit codes
cmd := exec.Command("terraform", "plan")
if err := cmd.Run(); err == nil {
    fmt.Println("Success")
}
```

**Key Problem:** How do users add commands?
- Can't source .go files at runtime
- Would need plugin system or config DSL
- Loses "just add a function" simplicity

**Verdict:** ⭐⭐ (2/5)
Great for distribution, terrible for extensibility.

---

### Node.js (JavaScript)

**Pros:**
- ✅ **Popular** - Most developers know JavaScript
- ✅ **Rich ecosystem** - npm has everything
- ✅ **Fast startup** - V8 is quick
- ✅ **Async built-in** - Good for concurrent commands
- ✅ **Cross-platform** - Works everywhere
- ✅ **Can eval user code** - Possible to source commands

**Cons:**
- ❌ **Requires installation** - Must install Node
- ❌ **Command execution awkward** - child_process API
- ❌ **Shell escaping needed** - Injection risks
- ❌ **npm hell** - Dependency management pain
- ❌ **Not ops culture** - DevOps folks prefer shell/Python
- ❌ **Callback/promise complexity** - Async can be tricky

**Command Execution Examples:**
```javascript
// Simple command
const { execSync } = require('child_process');
const output = execSync('aws s3 ls');

// Safe command
const { spawn } = require('child_process');
const cmd = spawn('aws', ['s3', 'ls']);

// With pipes
execSync('aws s3 ls | grep bucket');

// Or manually
const cmd1 = spawn('aws', ['s3', 'ls']);
const cmd2 = spawn('grep', ['bucket']);
cmd1.stdout.pipe(cmd2.stdin);
```

**Verdict:** ⭐⭐½ (2.5/5)
Popular language, but awkward for shell operations.

---

### Zsh

**Pros:**
- ✅ **All bash benefits** - Native command execution
- ✅ **Modern defaults** - Better array handling
- ✅ **Better completion** - More powerful compdef
- ✅ **Growing adoption** - macOS default since Catalina
- ✅ **Plugin ecosystem** - oh-my-zsh, etc
- ✅ **Backward compatible** - Most bash code works

**Cons:**
- ⚠️ **Less ubiquitous** - Not on all systems (yet)
- ⚠️ **Bash 4+ still needed?** - Would allow targeting older bash
- ⚠️ **Array syntax differs** - `$array[1]` vs `${array[0]}`
- ⚠️ **Learning curve** - New features to learn

**Verdict:** ⭐⭐⭐⭐ (4/5)
Viable alternative to Bash, but not enough benefit for incompatibility cost.

---

## Feature Comparison Matrix

| Feature | Bash | Python | Ruby | Go | Node.js | Zsh |
|---------|------|--------|------|----|---------| ----|
| Command execution | ⭐⭐⭐⭐⭐ | ⭐⭐ | ⭐⭐⭐ | ⭐⭐ | ⭐⭐ | ⭐⭐⭐⭐⭐ |
| Ubiquity | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐⭐ |
| Startup speed | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ |
| User extensibility | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐ | ⭐ | ⭐⭐⭐ | ⭐⭐⭐⭐⭐ |
| Error handling | ⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐ |
| Testing | ⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐ |
| Data structures | ⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ |
| Standard library | ⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐ |
| Cross-platform | ⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ |
| Ops culture fit | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐ | ⭐⭐⭐⭐⭐ |

## The Core Trade-off

### Shell Languages (Bash/Zsh)
**Optimize for:** Command execution, extensibility, startup speed
**Sacrifice:** Language features, safety, testability

### General Languages (Python/Ruby/Node)
**Optimize for:** Language features, safety, ecosystem
**Sacrifice:** Command execution ergonomics, startup speed

### Compiled Languages (Go)
**Optimize for:** Distribution, performance, safety
**Sacrifice:** Extensibility, development cycle

## Use Case Analysis

Let's examine actual forge/commando use cases:

### 1. Wrapper Commands
```bash
# AWS with optional vault
function command_aws {
  local aws_vault=($(aws_vault_prefix))
  "${aws_vault[@]}" aws "$@"
}
```

**Assessment:** Shell is perfect - direct command pass-through.

### 2. Sequential Operations
```bash
# Terraform workflow
function command_tf_deploy {
  terraform init
  terraform plan -out=plan.tfplan
  terraform apply plan.tfplan
}
```

**Assessment:** Shell is natural - commands just run.

### 3. Conditional Logic
```bash
# Environment-specific deploy
function command_deploy {
  local env=$1
  if [[ "$env" == "prod" ]]; then
    echo "Deploying to production..."
    aws_vault_profile="prod-admin"
  else
    aws_vault_profile="dev-admin"
  fi
  terraform apply
}
```

**Assessment:** Shell is adequate - simple conditionals work fine.

### 4. State Management
```bash
# Remember last environment
function command_deploy {
  local env="${1:-${state[last_env]}}"
  state[last_env]="$env"
  write_state
  # deploy...
}
```

**Assessment:** Shell is okay - associative arrays work.

### 5. Complex Data Processing
```bash
# Parse JSON from AWS
aws ec2 describe-instances --output json | jq -r '.Reservations[].Instances[].InstanceId'
```

**Assessment:** Shell is fine - delegate to jq, awk, etc.

### 6. Error Handling
```bash
# Handle terraform failures
if ! terraform plan; then
  echo "Plan failed, check your config"
  exit 1
fi
```

**Assessment:** Shell is basic but works.

## Real-World Comparison

Let's compare a realistic command in different languages:

### Task: Deploy with rollback on failure

**Bash:**
```bash
function command_deploy {
  local env=$1
  terraform workspace select "$env"

  if ! terraform plan -out=plan.tfplan; then
    die "Plan failed"
  fi

  terraform show plan.tfplan
  read -p "Apply? [y/N] " response

  if [[ "$response" == "y" ]]; then
    if ! terraform apply plan.tfplan; then
      warn "Apply failed, rolling back"
      terraform workspace select previous
      return 1
    fi
    state[last_deploy]="$env"
    write_state
    info "Deploy successful"
  fi
}
```
**Lines:** 18 | **Readability:** Good | **Maintainability:** Okay

**Python:**
```python
def command_deploy(env):
    subprocess.run(["terraform", "workspace", "select", env], check=True)

    try:
        subprocess.run(["terraform", "plan", "-out=plan.tfplan"], check=True)
    except subprocess.CalledProcessError:
        die("Plan failed")

    subprocess.run(["terraform", "show", "plan.tfplan"])
    response = input("Apply? [y/N] ")

    if response == "y":
        try:
            subprocess.run(["terraform", "apply", "plan.tfplan"], check=True)
            state["last_deploy"] = env
            write_state()
            info("Deploy successful")
        except subprocess.CalledProcessError:
            warn("Apply failed, rolling back")
            subprocess.run(["terraform", "workspace", "select", "previous"])
            return 1
```
**Lines:** 20 | **Readability:** Good | **Maintainability:** Good

**Assessment:** Python version is slightly longer and more verbose for command execution, but error handling is cleaner. Not a huge difference for this simple case.

## The Extensibility Problem

The **critical requirement** is that users can easily add project-specific commands:

**Bash/Zsh:**
```bash
# Just add to .forge/mycommands.bash
function command_deploy { ... }
function command_test { ... }
```
Framework sources the file → commands work.

**Python/Ruby/Node:**
```python
# Add to .forge/mycommands.py
def command_deploy(): ...
def command_test(): ...
```
Framework must:
1. Import/require the module
2. Discover functions (introspection)
3. Handle exceptions properly
4. Reload on changes (development)

**Go:**
```go
// Can't dynamically load .go files!
// Would need:
// 1. Compile-time plugin system, or
// 2. Config DSL that calls Go functions, or
// 3. Scripting language embedded (Lua, etc)
```

**Winner:** Shell languages by a landslide.

## Performance Analysis

Let's test startup time:

**Bash:**
```bash
$ time bash -c 'echo hello'
real    0m0.004s
```

**Python:**
```bash
$ time python3 -c 'print("hello")'
real    0m0.023s
```

**Ruby:**
```bash
$ time ruby -e 'puts "hello"'
real    0m0.051s
```

**Node:**
```bash
$ time node -e 'console.log("hello")'
real    0m0.044s
```

**For a framework invoked frequently, 20-50ms overhead matters.**

## Recommendation

### Stay with Bash, with caveats:

**Reasons:**
1. ✅ **Command execution is primary use case** - Bash excels here
2. ✅ **Zero installation required** - Works everywhere
3. ✅ **Instant startup** - No overhead
4. ✅ **User extensibility** - Just source files
5. ✅ **Cultural fit** - DevOps/SRE teams know bash
6. ✅ **Current codebase** - Existing forge/commando work

**Mitigations for Bash weaknesses:**
1. **Testing** - Use bats-core (Bash Automated Testing System)
2. **Linting** - Use shellcheck extensively
3. **Safety** - Provide good library functions (reduce raw bash)
4. **Documentation** - Document bash gotchas clearly
5. **Error handling** - Excellent trap-based error reporting
6. **Version** - Require Bash 4+ explicitly (with auto-upgrade)

### Alternative: Zsh

**If** you're willing to break Bash compatibility, Zsh offers:
- All bash benefits
- Better array handling
- Superior completion
- Modern defaults
- Growing adoption

**But** the benefits don't outweigh the compatibility cost yet.

### When to reconsider:

**Python/Ruby** if:
- Command execution becomes <50% of use cases
- Need complex data processing
- Want extensive plugins from ecosystem
- Target Windows primarily

**Go** if:
- Distribution becomes critical (single binary)
- Performance matters (parallel operations)
- Plugin model is acceptable (config DSL)
- Don't need easy user extensibility

## Hybrid Approach?

Could we get best of both worlds?

### Core in Bash, Plugins in Anything

```bash
# Framework discovers executables in path
# .forge/commands/deploy → any language!

# The executable gets:
# - Args as parameters
# - Context via environment vars
# - Can be bash, python, ruby, go, whatever
```

**Assessment:**
- ✅ Flexible for complex commands
- ✅ Users choose language per command
- ⚠️ More complex framework
- ⚠️ Harder to share context between commands
- ⚠️ No access to framework functions

### Lua Scripting

Embed Lua for configuration/commands:
```lua
-- .forge/commands.lua
command "deploy" {
  description = "Deploy application",
  run = function(env)
    shell("terraform workspace select " .. env)
    shell("terraform apply")
  end
}
```

**Assessment:**
- ✅ Simple, embeddable language
- ✅ Better than bash for logic
- ✅ Fast startup
- ❌ Another language to learn
- ❌ Requires lua installation
- ❌ Awkward for shell operations

## Final Verdict

**Stick with Bash** because:

1. The use case (wrapping/sequencing shell commands) is Bash's sweet spot
2. Zero-install requirement eliminates Python/Ruby/Node
3. User extensibility requirement eliminates Go
4. Performance (startup time) matters
5. Existing bash expertise in target audience
6. Current codebase investment

**Make Bash better** by:
1. Excellent error handling (stack traces)
2. Strong linting (shellcheck in CI)
3. Good testing (bats-core)
4. Helper library (reduce raw bash)
5. Clear documentation
6. Version 4+ requirement (enforced)

**The compromise** is accepting Bash's limitations (testing, safety, syntax) in exchange for its strengths (command execution, ubiquity, extensibility).

This is the **right trade-off** for a project command framework.
