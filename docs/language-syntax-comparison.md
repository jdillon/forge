# Language Syntax Comparison for Command Framework

**Purpose**: Compare Bash, Python, TypeScript (Deno/Bun), Ruby, and other candidates for implementing a command framework like forge.

**Evaluation Criteria**: Based on real forge command patterns from cirqil projects.

---

## Languages Evaluated

1. **Bash** - Current implementation
2. **Python** - Popular, rich ecosystem
3. **TypeScript (Deno)** - Modern, type-safe, single binary
4. **TypeScript (Bun)** - Fast startup, modern runtime
5. **Ruby** - Elegant, good command execution
6. **Go** - Fast, single binary (included for completeness)
7. **Rust** - Performance, safety (emerging option)

---

## Real-World Patterns from Forge Commands

Based on analysis of actual forge commands, here are the common patterns we need:

### Pattern 1: Simple Command Execution
```bash
aws s3 sync . "s3://$bucket/"
terraform apply
```

### Pattern 2: Command with Captured Output
```bash
dist_id=$(aws cloudfront list-distributions --query "..." --output text)
```

### Pattern 3: Conditional Execution
```bash
if aws s3api head-bucket --bucket "$bucket" 2>/dev/null; then
  echo "Bucket exists"
fi
```

### Pattern 4: Pipes and Filters
```bash
terraform workspace list | sed 's/^[* ] //'
```

### Pattern 5: Multiline String Heredoc
```bash
read -r -d '' email_body <<EOF
Hi $name,
Your account is ready...
EOF
```

### Pattern 6: Error Handling
```bash
dist_id=$(get_cloudfront_distribution_id) || return 1
```

### Pattern 7: Flag Parsing
```bash
while [[ $# -gt 0 ]]; do
  case "$1" in
    -w|--wait) wait_flag=true; shift ;;
    *) echo "Unknown: $1"; return 1 ;;
  esac
done
```

### Pattern 8: Building Paths and Temp Files
```bash
local timestamp=$(date +%Y%m%d%H%M%S)
local publish_dir="$basedir/tmp/publish-${env}-${timestamp}"
mkdir -p "$publish_dir"
```

### Pattern 9: File Operations
```bash
cp -R "$webroot_dir/"* "$publish_dir/" 2>/dev/null || true
rm -rf "$publish_dir"
```

### Pattern 10: Arrays and Iteration
```bash
local common_flags=(
  --sse AES256
  --cache-control "public, max-age=3600"
)
aws s3 sync . "s3://$bucket/" "${common_flags[@]}"
```

---

## Comparison Table: Key Features

| Feature | Bash | Python | TypeScript (Deno) | TypeScript (Bun) | Ruby | Go | Rust |
|---------|------|--------|-------------------|------------------|------|----|----- |
| **Installation** | ✅ Pre-installed | ⚠️ Usually present | ❌ Must install | ❌ Must install | ❌ Must install | ❌ Must compile | ❌ Must compile |
| **Startup Time** | ✅ <5ms | ⚠️ 20-30ms | ⚠️ 10-20ms | ✅ <10ms | ⚠️ 50ms | ✅ <5ms | ✅ <5ms |
| **Single Binary** | ✅ Yes | ❌ No | ✅ Yes | ✅ Yes | ❌ No | ✅ Yes | ✅ Yes |
| **Command Execution** | ✅✅✅ Native | ⚠️⚠️ Verbose | ⚠️⚠️ Verbose | ⚠️⚠️ Verbose | ⚠️ Moderate | ⚠️⚠️ Verbose | ⚠️⚠️ Verbose |
| **Pipes** | ✅✅✅ Native | ❌ Manual | ❌ Manual | ❌ Manual | ⚠️ Moderate | ❌ Manual | ❌ Manual |
| **Return Values** | ❌ Stdout hack | ✅ Proper | ✅ Proper | ✅ Proper | ✅ Proper | ✅ Proper | ✅ Proper |
| **Error Handling** | ⚠️ Basic | ✅ Exceptions | ✅ Exceptions | ✅ Exceptions | ✅ Exceptions | ✅ Error values | ✅ Result types |
| **Type Safety** | ❌ None | ⚠️ Optional | ✅ Built-in | ✅ Built-in | ❌ None | ✅ Strong | ✅ Strong |
| **Standard Library** | ⚠️ Minimal | ✅ Rich | ✅ Modern | ✅ Modern | ✅ Good | ✅ Good | ✅ Good |
| **Package Manager** | ❌ None | ✅ pip | ✅ Built-in | ✅ Built-in | ✅ gem | ✅ Built-in | ✅ Cargo |
| **User Extensibility** | ✅✅✅ Source files | ✅ Import | ✅ Import | ✅ Import | ✅ Load/require | ❌ Compile | ❌ Compile |
| **Testing** | ⚠️ bats | ✅ pytest | ✅ Built-in | ✅ Built-in | ✅ RSpec | ✅ Built-in | ✅ Built-in |

---

## Pattern-by-Pattern Comparison

### Pattern 1: Simple Command Execution

**Bash** ✅✅✅
```bash
aws s3 sync . "s3://$bucket/"
terraform apply
```
**Native, perfect.**

---

**Python** ⚠️⚠️
```python
import subprocess

subprocess.run(["aws", "s3", "sync", ".", f"s3://{bucket}/"])
subprocess.run(["terraform", "apply"])
```
**Verbose but explicit.**

---

**TypeScript (Deno)** ⚠️⚠️
```typescript
const cmd1 = new Deno.Command("aws", {
  args: ["s3", "sync", ".", `s3://${bucket}/`]
});
await cmd1.output();

const cmd2 = new Deno.Command("terraform", { args: ["apply"] });
await cmd2.output();
```
**Verbose, requires permissions.**

---

**TypeScript (Bun)** ⚠️
```typescript
import { $ } from "bun";

await $`aws s3 sync . s3://${bucket}/`;
await $`terraform apply`;
```
**Much better! Template literals for commands.**

---

**Ruby** ⚠️
```ruby
system("aws", "s3", "sync", ".", "s3://#{bucket}/")
system("terraform", "apply")
```
**Better than Python, not as nice as Bash.**

---

**Go** ⚠️⚠️
```go
cmd := exec.Command("aws", "s3", "sync", ".", fmt.Sprintf("s3://%s/", bucket))
cmd.Run()

cmd = exec.Command("terraform", "apply")
cmd.Run()
```
**Verbose and repetitive.**

---

**Rust** ⚠️⚠️
```rust
use std::process::Command;

Command::new("aws")
    .args(&["s3", "sync", ".", &format!("s3://{}/", bucket)])
    .status()?;

Command::new("terraform").args(&["apply"]).status()?;
```
**Similar to Go, verbose.**

---

### Pattern 2: Command with Captured Output

**Bash** ✅✅✅
```bash
dist_id=$(aws cloudfront list-distributions \
  --query "..." --output text)

# Check success
if [[ -z "$dist_id" ]]; then
  echo "Failed to get distribution ID"
fi
```
**Perfect for this use case.**

---

**Python** ⚠️
```python
result = subprocess.run(
    ["aws", "cloudfront", "list-distributions",
     "--query", "...", "--output", "text"],
    capture_output=True,
    text=True
)
dist_id = result.stdout.strip()

if not dist_id:
    print("Failed to get distribution ID")
```
**More verbose but explicit error handling.**

---

**TypeScript (Deno)** ⚠️
```typescript
const cmd = new Deno.Command("aws", {
  args: ["cloudfront", "list-distributions", "--query", "...", "--output", "text"],
});
const { stdout } = await cmd.output();
const distId = new TextDecoder().decode(stdout).trim();

if (!distId) {
  console.log("Failed to get distribution ID");
}
```
**Verbose with encoding complexity.**

---

**TypeScript (Bun)** ✅
```typescript
const distId = await $`aws cloudfront list-distributions --query "..." --output text`.text();

if (!distId.trim()) {
  console.log("Failed to get distribution ID");
}
```
**Much cleaner! Template literals shine here.**

---

**Ruby** ⚠️
```ruby
dist_id = `aws cloudfront list-distributions --query "..." --output text`.strip

if dist_id.empty?
  puts "Failed to get distribution ID"
end
```
**Backticks make this nice and concise.**

---

**Go** ⚠️⚠️
```go
cmd := exec.Command("aws", "cloudfront", "list-distributions",
    "--query", "...", "--output", "text")
output, err := cmd.Output()
if err != nil {
    return err
}
distID := strings.TrimSpace(string(output))

if distID == "" {
    fmt.Println("Failed to get distribution ID")
}
```
**Verbose but explicit error handling.**

---

### Pattern 3: Conditional Execution

**Bash** ✅✅✅
```bash
if aws s3api head-bucket --bucket "$bucket" 2>/dev/null; then
  echo "Bucket exists"
else
  echo "Bucket not found"
  return 1
fi
```
**Perfect. Exit code is the condition.**

---

**Python** ⚠️
```python
try:
    subprocess.run(
        ["aws", "s3api", "head-bucket", "--bucket", bucket],
        check=True,
        capture_output=True
    )
    print("Bucket exists")
except subprocess.CalledProcessError:
    print("Bucket not found")
    return False
```
**Exception-based, more verbose.**

---

**TypeScript (Bun)** ✅
```typescript
try {
  await $`aws s3api head-bucket --bucket ${bucket}`.quiet();
  console.log("Bucket exists");
} catch (e) {
  console.log("Bucket not found");
  return false;
}
```
**Clean with `.quiet()` to suppress output.**

---

**Ruby** ✅
```ruby
if system("aws", "s3api", "head-bucket", "--bucket", bucket, out: File::NULL, err: File::NULL)
  puts "Bucket exists"
else
  puts "Bucket not found"
  return false
end
```
**Good. `system()` returns boolean based on exit code.**

---

### Pattern 4: Pipes and Filters

**Bash** ✅✅✅
```bash
workspaces=$(terraform workspace list | sed 's/^[* ] //')
```
**Native pipes, perfect.**

---

**Python** ❌❌
```python
# Manual pipe construction
p1 = subprocess.Popen(["terraform", "workspace", "list"],
                      stdout=subprocess.PIPE)
p2 = subprocess.Popen(["sed", "s/^[* ] //"],
                      stdin=p1.stdout,
                      stdout=subprocess.PIPE)
workspaces = p2.communicate()[0].decode().strip()

# Or shell=True (dangerous):
workspaces = subprocess.run(
    "terraform workspace list | sed 's/^[* ] //'",
    shell=True,
    capture_output=True,
    text=True
).stdout.strip()

# Or do it in Python:
result = subprocess.run(["terraform", "workspace", "list"],
                       capture_output=True, text=True)
import re
workspaces = re.sub(r'^[* ] ', '', result.stdout, flags=re.MULTILINE)
```
**Painful. Three bad options.**

---

**TypeScript (Bun)** ⚠️
```typescript
// Shell-style pipes not supported, must chain
const output = await $`terraform workspace list`.text();
const workspaces = output.split('\n')
  .map(line => line.replace(/^[* ] /, ''))
  .filter(line => line);
```
**Have to do filtering in TypeScript.**

---

**Ruby** ⚠️
```ruby
# Backticks with shell pipe (easiest but has injection risk)
workspaces = `terraform workspace list | sed 's/^[* ] //'`.strip

# Or Open3 for safety
require 'open3'
stdout, = Open3.capture2("terraform workspace list | sed 's/^[* ] //'")
workspaces = stdout.strip
```
**Backticks make it easy, but shell injection risk.**

---

### Pattern 5: Multiline Strings / Heredoc

**Bash** ✅
```bash
read -r -d '' email_body <<EOF
Hi $name,

Your AWS account is ready.
Login URL: $url

Best regards,
Infrastructure Team
EOF
```
**Heredoc with variable interpolation.**

---

**Python** ✅
```python
email_body = f"""Hi {name},

Your AWS account is ready.
Login URL: {url}

Best regards,
Infrastructure Team"""
```
**f-strings make this clean.**

---

**TypeScript** ✅
```typescript
const emailBody = `Hi ${name},

Your AWS account is ready.
Login URL: ${url}

Best regards,
Infrastructure Team`;
```
**Template literals are perfect for this.**

---

**Ruby** ✅
```ruby
email_body = <<~HEREDOC
  Hi #{name},

  Your AWS account is ready.
  Login URL: #{url}

  Best regards,
  Infrastructure Team
HEREDOC
```
**Squiggly heredoc (`<<~`) is nice.**

---

### Pattern 6: Error Handling

**Bash** ⚠️
```bash
dist_id=$(get_cloudfront_distribution_id) || return 1

# Or with explicit check
if ! check_bucket_exists; then
  echo "ERROR: Bucket check failed"
  return 1
fi
```
**Exit codes, simple but limited.**

---

**Python** ✅
```python
try:
    dist_id = get_cloudfront_distribution_id()
except Exception as e:
    print(f"ERROR: {e}")
    return False

# Or explicit check
if not check_bucket_exists():
    print("ERROR: Bucket check failed")
    return False
```
**Exceptions with context.**

---

**TypeScript** ✅
```typescript
try {
  const distId = await getCloudFrontDistributionId();
} catch (e) {
  console.log(`ERROR: ${e.message}`);
  return false;
}

// Or explicit check
if (!await checkBucketExists()) {
  console.log("ERROR: Bucket check failed");
  return false;
}
```
**Modern async/await with exceptions.**

---

**Ruby** ✅
```ruby
begin
  dist_id = get_cloudfront_distribution_id
rescue => e
  puts "ERROR: #{e.message}"
  return false
end

# Or explicit check
unless check_bucket_exists
  puts "ERROR: Bucket check failed"
  return false
end
```
**Exception handling with nice syntax (`unless`).**

---

### Pattern 7: Flag Parsing

**Bash** ⚠️
```bash
wait_flag=false
while [[ $# -gt 0 ]]; do
  case "$1" in
    -w|--wait)
      wait_flag=true
      shift
      ;;
    *)
      echo "ERROR: Unknown option: $1"
      return 1
      ;;
  esac
done
```
**Manual but flexible.**

---

**Python** ✅
```python
import argparse

parser = argparse.ArgumentParser()
parser.add_argument('-w', '--wait', action='store_true')
args = parser.parse_args()

wait_flag = args.wait
```
**Built-in argument parser, excellent.**

---

**TypeScript (Deno)** ✅
```typescript
import { parseArgs } from "@std/cli/parse-args";

const flags = parseArgs(Deno.args, {
  boolean: ["wait"],
  alias: { w: "wait" }
});

const waitFlag = flags.wait;
```
**Good standard library support.**

---

**TypeScript (Bun)** ✅
```typescript
import { parseArgs } from "util";

const { values } = parseArgs({
  args: Bun.argv.slice(2),
  options: {
    wait: { type: 'boolean', short: 'w' }
  }
});

const waitFlag = values.wait;
```
**Node-compatible API.**

---

**Ruby** ✅
```ruby
require 'optparse'

options = {}
OptionParser.new do |opts|
  opts.on("-w", "--wait", "Wait for completion") do
    options[:wait] = true
  end
end.parse!

wait_flag = options[:wait]
```
**Good built-in option parser.**

---

### Pattern 8: File System Operations

**Bash** ✅✅
```bash
local timestamp=$(date +%Y%m%d%H%M%S)
local publish_dir="$basedir/tmp/publish-${env}-${timestamp}"
mkdir -p "$publish_dir"

cp -R "$webroot_dir/"* "$publish_dir/" 2>/dev/null || true
rm -rf "$publish_dir"
```
**Shell commands are native.**

---

**Python** ✅
```python
import shutil
from pathlib import Path
from datetime import datetime

timestamp = datetime.now().strftime("%Y%m%d%H%M%S")
publish_dir = Path(basedir) / "tmp" / f"publish-{env}-{timestamp}"
publish_dir.mkdir(parents=True, exist_ok=True)

shutil.copytree(webroot_dir, publish_dir, dirs_exist_ok=True)
shutil.rmtree(publish_dir)
```
**Good Path API since Python 3.4.**

---

**TypeScript (Deno)** ✅
```typescript
const timestamp = new Date().toISOString().replace(/[-:]/g, '').slice(0, 14);
const publishDir = `${basedir}/tmp/publish-${env}-${timestamp}`;
await Deno.mkdir(publishDir, { recursive: true });

await Deno.copyFile(source, dest);  // Files
// For directories, need to write recursive function or use library

await Deno.remove(publishDir, { recursive: true });
```
**Good for simple ops, needs helper for recursive copy.**

---

**TypeScript (Bun)** ✅
```typescript
const timestamp = new Date().toISOString().replace(/[-:]/g, '').slice(0, 14);
const publishDir = `${basedir}/tmp/publish-${env}-${timestamp}`;

await Bun.write(dest, Bun.file(source));  // Files
// Or use shell:
await $`mkdir -p ${publishDir}`;
await $`cp -R ${webrootDir}/* ${publishDir}/`;
await $`rm -rf ${publishDir}`;
```
**Can fallback to shell commands easily.**

---

**Ruby** ✅
```ruby
require 'fileutils'

timestamp = Time.now.strftime("%Y%m%d%H%M%S")
publish_dir = "#{basedir}/tmp/publish-#{env}-#{timestamp}"
FileUtils.mkdir_p(publish_dir)

FileUtils.cp_r("#{webroot_dir}/.", publish_dir)
FileUtils.rm_rf(publish_dir)
```
**Excellent FileUtils module.**

---

### Pattern 9: Working with JSON

**Bash** ❌
```bash
# Must use external tool (jq)
aws ec2 describe-instances --output json | \
  jq -r '.Reservations[].Instances[].InstanceId'

# Or parse with Python one-liner
aws ec2 describe-instances --output json | \
  python3 -c "import sys, json; ..."
```
**No native JSON support.**

---

**Python** ✅✅
```python
import json

result = subprocess.run(
    ["aws", "ec2", "describe-instances", "--output", "json"],
    capture_output=True,
    text=True
)
data = json.loads(result.stdout)
instance_ids = [
    inst['InstanceId']
    for res in data['Reservations']
    for inst in res['Instances']
]
```
**Native JSON, excellent.**

---

**TypeScript** ✅✅
```typescript
const output = await $`aws ec2 describe-instances --output json`.text();
const data = JSON.parse(output);
const instanceIds = data.Reservations
  .flatMap(res => res.Instances)
  .map(inst => inst.InstanceId);
```
**Native JSON, excellent.**

---

**Ruby** ✅
```ruby
require 'json'

output = `aws ec2 describe-instances --output json`
data = JSON.parse(output)
instance_ids = data['Reservations']
  .flat_map { |res| res['Instances'] }
  .map { |inst| inst['InstanceId'] }
```
**Native JSON, good.**

---

### Pattern 10: Arrays and Spreading

**Bash** ⚠️
```bash
local common_flags=(
  --sse AES256
  --cache-control "public, max-age=3600"
)

aws s3 sync . "s3://$bucket/" \
  --delete \
  "${common_flags[@]}" \
  "$@"
```
**Arrays work but syntax is weird (`[@]`).**

---

**Python** ✅
```python
common_flags = [
    "--sse", "AES256",
    "--cache-control", "public, max-age=3600"
]

subprocess.run([
    "aws", "s3", "sync", ".", f"s3://{bucket}/",
    "--delete",
    *common_flags,
    *extra_args
])
```
**Clean with `*` spread operator.**

---

**TypeScript (Bun)** ✅
```typescript
const commonFlags = [
  "--sse", "AES256",
  "--cache-control", "public, max-age=3600"
];

await $`aws s3 sync . s3://${bucket}/ --delete ${commonFlags}`;
```
**Template literal handles array spreading.**

---

**Ruby** ✅
```ruby
common_flags = [
  "--sse", "AES256",
  "--cache-control", "public, max-age=3600"
]

system("aws", "s3", "sync", ".", "s3://#{bucket}/",
       "--delete",
       *common_flags,
       *extra_args)
```
**Clean with `*` splat operator.**

---

## User Extensibility Pattern

How do users add new commands?

### Bash ✅✅✅
```bash
# .forge/commands.bash
function command_deploy() {
  local env=$1
  echo "Deploying to $env..."
  terraform apply
}

# Framework sources the file - just works
```
**Perfect. Zero ceremony.**

---

### Python ✅
```python
# .forge/commands.py
def command_deploy(env):
    """Deploy to environment."""
    print(f"Deploying to {env}...")
    subprocess.run(["terraform", "apply"])

# Framework: import commands; getattr(commands, f"command_{name}")
```
**Simple import, very clean.**

---

### TypeScript (Deno/Bun) ✅
```typescript
// .forge/commands.ts
export async function command_deploy(env: string) {
  console.log(`Deploying to ${env}...`);
  await $`terraform apply`;
}

// Framework: import * as commands from "./.forge/commands.ts"
```
**Import/export, clean.**

---

### Ruby ✅
```ruby
# .forge/commands.rb
def command_deploy(env)
  puts "Deploying to #{env}..."
  system("terraform", "apply")
end

# Framework: load '.forge/commands.rb'; send("command_#{name}", *args)
```
**Simple load, use send() to call.**

---

### Go ❌
```go
// Users must write Go and compile to plugin
package main

func CommandDeploy(args []string) error {
    // ...
}

// Compile: go build -buildmode=plugin
// Load: p, _ := plugin.Open("commands.so")
```
**Too complex. Requires compilation.**

---

## Overall Scoring

Based on real forge patterns:

| Language | Command Exec | Pipes | Return Values | Syntax | Extensibility | **Total** |
|----------|-------------|-------|---------------|--------|---------------|-----------|
| **Bash** | 10/10 | 10/10 | 2/10 | 4/10 | 10/10 | **36/50** |
| **Python** | 6/10 | 4/10 | 10/10 | 8/10 | 9/10 | **37/50** |
| **TypeScript (Bun)** | 8/10 | 6/10 | 10/10 | 9/10 | 9/10 | **42/50** ⭐ |
| **TypeScript (Deno)** | 6/10 | 5/10 | 10/10 | 9/10 | 9/10 | **39/50** |
| **Ruby** | 7/10 | 6/10 | 10/10 | 8/10 | 9/10 | **40/50** |
| **Go** | 5/10 | 3/10 | 10/10 | 7/10 | 2/10 | **27/50** |
| **Rust** | 5/10 | 3/10 | 10/10 | 6/10 | 2/10 | **26/50** |

---

## Key Insights

### 1. Bun is a Game-Changer

**Bun's `$` template literal** makes command execution almost as nice as Bash:
```typescript
await $`terraform apply`;
const output = await $`aws s3 ls`.text();
```

This was the missing piece for TypeScript!

### 2. Python's Biggest Weakness: Pipes

Bash:
```bash
terraform workspace list | sed 's/^[* ] //' | sort
```

Python:
```python
# Yikes...
p1 = subprocess.Popen(["terraform", "workspace", "list"], stdout=subprocess.PIPE)
p2 = subprocess.Popen(["sed", "s/^[* ] //"], stdin=p1.stdout, stdout=subprocess.PIPE)
p3 = subprocess.Popen(["sort"], stdin=p2.stdout, stdout=subprocess.PIPE)
output = p3.communicate()[0]
```

### 3. Return Values Matter More Than I Thought

The OUTPUT_PATTERN hack in Bash is painful when you see how clean it is elsewhere:

Bash (forced hack):
```bash
function get_value {
  println "Getting value..." >&2  # Must use stderr!
  echo "$value"  # Return via stdout
}
val=$(get_value)  # Corrupted if println used stdout
```

Everyone else (natural):
```python
def get_value():
    print("Getting value...")  # Normal stdout!
    return value  # Real return!
val = get_value()  # Just works
```

---

## Recommendations

### Ranked by Suitability

#### 1. TypeScript (Bun) ⭐⭐⭐⭐⭐

**Why:**
- ✅ **`$` template literals** make command execution nearly as easy as Bash
- ✅ **Fast startup** (<10ms)
- ✅ **Single binary** install (`curl https://bun.sh/install | bash`)
- ✅ **Proper return values** (no OUTPUT_PATTERN hack)
- ✅ **Type safety** catches errors
- ✅ **Modern async/await**
- ✅ **User extensibility** (import .ts files)
- ✅ **Great testing** built-in
- ✅ **Rich ecosystem** (npm packages)
- ✅ **Good file system APIs**
- ✅ **Native JSON support**

**Example framework:**
```typescript
#!/usr/bin/env bun
import { $ } from "bun";

// Discover commands
const commands = await import("./.forge/commands.ts");

// Find command functions
const cmdFuncs = Object.entries(commands)
  .filter(([name]) => name.startsWith('command_'))
  .reduce((acc, [name, fn]) => {
    acc[name.slice(8)] = fn;
    return acc;
  }, {});

// Execute
const cmdName = process.argv[2];
await cmdFuncs[cmdName](...process.argv.slice(3));
```

**User command:**
```typescript
export async function command_deploy(env: string) {
  console.log(`Deploying to ${env}...`);

  await $`terraform workspace select ${env}`;
  await $`terraform apply`;

  console.log("✓ Deploy complete");
}
```

**Cons:**
- ⚠️ Bun is relatively new (but maturing fast)
- ⚠️ Must install Bun
- ⚠️ Pipes still not as native as Bash

---

#### 2. Ruby ⭐⭐⭐⭐

**Why:**
- ✅ **Better command execution** than Python (backticks, system())
- ✅ **Proper return values**
- ✅ **Elegant syntax**
- ✅ **Good FileUtils library**
- ✅ **User extensibility** simple (load files)

**Cons:**
- ⚠️ Slower startup (~50ms)
- ⚠️ Must install Ruby
- ⚠️ Declining popularity

---

#### 3. Python ⭐⭐⭐⭐

**Why:**
- ✅ **Proper return values**
- ✅ **Rich ecosystem** (boto3, etc.)
- ✅ **Probably already installed**
- ✅ **Excellent testing** (pytest)
- ✅ **Good error handling**

**Cons:**
- ❌ **Pipes are painful**
- ⚠️ **Command execution verbose**
- ⚠️ **Slower startup** (20-30ms)

---

#### 4. Bash (current) ⭐⭐⭐

**Why:**
- ✅ **Best command execution**
- ✅ **Native pipes**
- ✅ **Pre-installed**
- ✅ **Instant startup**

**Cons:**
- ❌ **OUTPUT_PATTERN hack**
- ❌ **Limited data structures**
- ❌ **Error-prone syntax**
- ❌ **Hard to test**

---

#### 5. TypeScript (Deno) ⭐⭐⭐

**Why:**
- ✅ **Proper return values**
- ✅ **Type safety**
- ✅ **Single binary**

**Cons:**
- ❌ **No `$` operator** (command execution is verbose)
- ⚠️ **Permissions model** (must grant file/network access)

---

## Final Recommendation

### Choose Bun + TypeScript

**Rationale:**

1. **Solves the OUTPUT_PATTERN problem** completely
2. **Command execution almost as easy as Bash** (thanks to `$`)
3. **Type safety prevents bugs**
4. **Modern, fast, single binary**
5. **Great for teams** (TypeScript is popular)
6. **Excellent testing story**
7. **User extensibility preserved**

**Migration Path:**

1. **Phase 1**: Prototype core framework in Bun
2. **Phase 2**: Migrate one project (cirqil.com website)
3. **Phase 3**: Evaluate and decide
4. **Phase 4**: Migrate remaining projects or revert

**Installation:**
```bash
curl -fsSL https://bun.sh/install | bash
```

**Would you like me to create a prototype Bun-based forge framework?**
