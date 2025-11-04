# Deno vs Bun: Reality Check for Forge

**Date:** 2025-11-03
**Context:** Frustrated with Bun's lack of module resolution control
**Question:** Would Deno be better for our use case?

---

## TL;DR

**Module Resolution Control:**
- ✅ Deno: **Much better** - Import maps give full control, no self-reference issues
- ❌ Bun: Hardcoded `node_modules`, self-reference can't be disabled

**Shell Scripting:**
- ✅ Bun: Built-in `$'command'` syntax - seamless and beautiful
- ⚠️ Deno: `dax` library or `deno task --eval` - requires setup but works

**Trade-off:** Better control vs. better DX

---

## Module Resolution: Deno Wins Decisively

### Deno: Import Maps (Full Control)

**Configuration in deno.json:**
```json
{
  "imports": {
    "@planet57/forge": "npm:@planet57/forge@^2.0.0",
    "@planet57/forge/": "./lib/",
    "@jdillon/forge-standard": "npm:@jdillon/forge-standard@^0.1.0",
    "cowsay": "npm:cowsay@^1.6.0"
  },
  "scopes": {
    "./tests/fixtures/": {
      "@planet57/forge": "npm:@planet57/forge@^2.0.0"
    }
  }
}
```

**Key Benefits:**
- ✅ **Explicit mapping** - You control exactly where each import resolves
- ✅ **Scoped overrides** - Different resolution for different directories
- ✅ **No self-reference problem** - URL-based imports don't have this issue
- ✅ **Mix sources** - npm:, jsr:, https:, local files in same project
- ✅ **Standard-based** - Import Maps are a web standard

**Example solving our problem:**
```json
{
  "imports": {
    // Production imports use local source
    "@planet57/forge/": "./lib/"
  },
  "scopes": {
    // Test fixtures override to use installed package
    "./tests/fixtures/": {
      "@planet57/forge": "npm:@planet57/forge@^2.0.0"
    }
  }
}
```

**No plugins needed!** Configuration handles it cleanly.

---

### Bun: Hardcoded Resolution (Limited Control)

**What you get:**
```typescript
// import '@planet57/forge'
// Resolution order (CANNOT CHANGE):
// 1. Package self-reference (if inside package dir)
// 2. node_modules walk-up
// 3. NODE_PATH (fallback only)
```

**Configuration options:**
```json
{
  "compilerOptions": {
    "paths": {
      // Only works AFTER self-reference check
      "@myalias/*": ["./src/*"]
    }
  }
}
```

**Problems:**
- ❌ Can't disable self-reference
- ❌ Can't change resolution order
- ❌ Can't rename `node_modules`
- ❌ Can't use scoped overrides
- ⚠️ Need plugins to work around (experimental, buggy)

---

## Shell Scripting: Bun Has Better DX

### Bun: Built-in Shell (Seamless)

**The beauty you love:**
```typescript
import { $ } from 'bun';

// Just works - no setup needed
const output = await $`ls -la`;
const revision = await $`git rev-parse HEAD`;

// Piping, redirection, all built-in
await $`cat file.txt | grep pattern > output.txt`;

// Cross-platform commands built-in
await $`ls && pwd && echo "hello"`;
```

**Built-in commands:**
- cd, ls, rm, echo, pwd, cat, touch, mkdir
- which, mv, exit, true, false, yes, seq
- dirname, basename
- Falls back to system commands when needed

**Why it's great:**
- ✅ Zero setup - it's just there
- ✅ TypeScript-first design
- ✅ Beautiful syntax with template literals
- ✅ Cross-platform by default
- ✅ Performance optimized in runtime

---

### Deno: External Library (More Mature)

**Option 1: dax library** (most similar to Bun)
```typescript
import $ from "jsr:@david/dax";

// Similar syntax, requires import
const output = await $`ls -la`;
const revision = await $`git rev-parse HEAD`;

// Same piping capabilities
await $`cat file.txt | grep pattern > output.txt`;
```

**Why dax exists:**
- Originally inspired zx (Google's shell scripting for Node)
- Bun shell was inspired by dax
- More mature, battle-tested across platforms
- Better Windows compatibility

**Option 2: deno task --eval** (Deno 2.1+)
```bash
# Command-line usage
deno task --eval "echo $(pwd)"
deno task --eval "REV=$(git rev-parse HEAD) && echo $REV"
```

**In deno.json:**
```json
{
  "tasks": {
    "deploy": "echo $(git rev-parse HEAD) && deno run deploy.ts"
  }
}
```

**Option 3: Deno.Command API** (built-in, verbose)
```typescript
const command = new Deno.Command("git", {
  args: ["rev-parse", "HEAD"],
  stdout: "piped"
});

const { code, stdout } = await command.output();
const output = new TextDecoder().decode(stdout);
```

**Comparison:**
- ❌ dax requires dependency (not built-in)
- ⚠️ deno task --eval only works in task runner
- ❌ Deno.Command is more verbose than Bun's $
- ✅ dax is more mature and cross-platform than Bun shell
- ✅ Options for different use cases

---

## Our Specific Problems: How Each Runtime Handles Them

### Problem 1: Test Fixture Self-Reference

**Scenario:** Test fixture inside project imports `@planet57/forge`, needs installed package not local source.

**Bun Solution:**
```
❌ Can't configure this
⚠️ Need runtime plugin (experimental)
⚠️ Or copy fixtures outside project
⚠️ Or accept dev-mode testing only
```

**Deno Solution:**
```json
{
  "scopes": {
    "./tests/fixtures/": {
      "@planet57/forge": "npm:@planet57/forge@2.0.0"
    }
  }
}
```
✅ **Solved with configuration**

---

### Problem 2: User Module Dependencies

**Scenario:** User module needs to import from forge home's node_modules.

**Bun Solution:**
```bash
# Set environment variable
export FORGE_NODE_MODULES=~/.local/share/forge/node_modules
export NODE_PATH=$FORGE_NODE_MODULES

# Hope self-reference doesn't interfere
bun run script.ts
```
⚠️ **Works but fragile**

**Deno Solution:**
```json
{
  "imports": {
    "@jdillon/forge-standard": "npm:@jdillon/forge-standard@0.1.0"
  }
}
```
✅ **Clean and explicit**

---

### Problem 3: Dev vs Installed Mode

**Scenario:** Need consistent behavior across execution modes.

**Bun Solution:**
```
❌ Self-reference makes this hard
⚠️ Need different bootstrap scripts
⚠️ bin/forge vs bin/forge-dev
⚠️ Complex wrapper logic
```

**Deno Solution:**
```json
{
  "imports": {
    // Dev mode
    "@planet57/forge/": "./lib/"
  }
}

// OR for installed mode
{
  "imports": {
    // Installed mode
    "@planet57/forge": "npm:@planet57/forge@2.0.0"
  }
}
```
✅ **Just swap config or use scopes**

---

## Migration Effort

### What We'd Need to Change

**1. Shell Commands** (High Impact)
```typescript
// Current (Bun)
import { $ } from 'bun';
await $`git status`;

// Deno Option A: dax
import $ from "jsr:@david/dax";
await $`git status`;

// Deno Option B: Deno.Command
const cmd = new Deno.Command("git", { args: ["status"] });
await cmd.output();
```

**Effort:** ~50 uses of `$` throughout codebase
**Risk:** Medium - syntax changes but behavior same

---

**2. File I/O** (Medium Impact)
```typescript
// Current (Bun)
import { readFileSync } from 'fs';
const text = Bun.file('file.txt').text();

// Deno
const text = await Deno.readTextFile('file.txt');
```

**Effort:** ~30-40 file operations
**Risk:** Low - straightforward replacements

---

**3. Package Ecosystem** (Low Impact)
```json
// Current (package.json)
{
  "dependencies": {
    "chalk": "^5.3.0",
    "commander": "14.0.2"
  }
}

// Deno (deno.json)
{
  "imports": {
    "chalk": "npm:chalk@^5.3.0",
    "commander": "npm:commander@14.0.2"
  }
}
```

**Effort:** Copy dependencies to new format
**Risk:** Low - npm: prefix works for most packages
**Note:** Some packages may need adjustments for Deno compat

---

**4. Module Resolution** (NEGATIVE Effort!)
```typescript
// Current (Bun)
// Complex bootstrap, wrappers, env vars
// Still doesn't work reliably

// Deno
// Just works via import maps
```

**Effort:** Delete code!
**Risk:** None - getting simpler
**Win:** Eliminate entire resolution problem

---

**5. Testing Infrastructure** (Medium Impact)
```typescript
// Current test runner uses Bun's test
test('something', () => {
  expect(value).toBe(expected);
});

// Deno uses built-in test
Deno.test('something', () => {
  assertEquals(value, expected);
});
```

**Effort:** ~74 tests to migrate
**Risk:** Low - similar APIs
**Note:** Could use external test lib if preferred

---

## Objective Comparison

| Feature | Bun | Deno | Winner |
|---------|-----|------|--------|
| **Module Resolution Control** | ❌ Limited | ✅ Full (import maps) | **Deno** |
| **Shell Scripting DX** | ✅ Built-in `$` | ⚠️ dax library | **Bun** |
| **Self-Reference Problem** | ❌ Can't solve | ✅ No such problem | **Deno** |
| **npm Package Support** | ✅ Native | ✅ Via npm: prefix | Tie |
| **Performance** | ✅ Fast startup | ⚠️ Slower startup | **Bun** |
| **TypeScript** | ✅ Native | ✅ Native | Tie |
| **Node.js Compatibility** | ✅ High | ⚠️ Medium | **Bun** |
| **Standard Compliance** | ⚠️ Some divergence | ✅ Web standards | **Deno** |
| **Permission Model** | ❌ None | ✅ Fine-grained | **Deno** |
| **Built-in Tools** | ✅ Bundler, test | ✅ More comprehensive | **Deno** |
| **Maturity** | ⚠️ Newer, evolving | ✅ More stable | **Deno** |

---

## The Real Trade-off

### Stay with Bun

**Pros:**
- ✅ Keep beautiful `$'command'` syntax
- ✅ Fast performance
- ✅ High Node.js compatibility
- ✅ No migration effort

**Cons:**
- ❌ Stuck with resolution problems
- ❌ Need plugin workarounds (experimental)
- ❌ Or accept compromises (dev-only testing, copy fixtures)
- ❌ Less control over runtime

**Best for:**
- When shell scripting DX is highest priority
- When Node.js compatibility is critical
- When you can live with resolution limitations

---

### Migrate to Deno

**Pros:**
- ✅ Full module resolution control
- ✅ Solves self-reference problem cleanly
- ✅ More mature and stable
- ✅ Better security model
- ✅ Simpler architecture (no NODE_PATH hacks)

**Cons:**
- ❌ Lose built-in shell syntax
- ❌ Need dax dependency for shell scripting
- ❌ Migration effort (~1-2 weeks)
- ❌ Some ecosystem gaps

**Best for:**
- When control and stability matter most
- When you need reliable testing infrastructure
- When standard compliance is valuable
- When you can invest migration time

---

## My Honest Assessment

**Bun's Problems Are Real:**
- The self-reference issue is fundamental to Bun's architecture
- No configuration exists to control this
- Runtime plugins are experimental and may be buggy
- You'll keep hitting walls trying to control basic things

**Deno's Downsides Are Manageable:**
- dax shell syntax is nearly identical to Bun's
- Migration is mechanical, not conceptual
- You gain much more control overall
- Problems you're fighting now would disappear

**The Question Is:**
How much is the `$'command'` built-in syntax worth?
- If it's **critical to your vision** → Stay with Bun, work around issues
- If it's **nice but not essential** → Deno is objectively better for your needs

---

## Recommendation

**Short-term: Try the Plugin** (1-2 days)
- Run Phase 1 of plugin viability plan
- See if runtime plugin can actually solve this
- If it works reliably → Great, stay with Bun
- If it's buggy/unreliable → Seriously consider Deno

**Long-term: Probably Deno**
If the plugin approach fails or feels too fragile, Deno is the better foundation:
- You're building a deployment framework (control matters)
- You need reliable testing (Deno solves this cleanly)
- Migration cost is ~1-2 weeks (reasonable)
- dax provides 90% of Bun shell DX

**The Gut Check:**
> "Bun is killing me, its so great, but also really horrible"

That's not a sustainable feeling for a core technology choice. Deno might be less flashy, but it won't fight you on fundamentals.

---

## Hybrid Approach?

**Could we use both?**

Maybe! Some projects use Bun for scripts (where shell DX matters) and Deno for runtime (where control matters).

**Example:**
```bash
# Development scripts (Bun for shell syntax)
./scripts/deploy.ts        # Uses Bun's $'commands'

# Runtime application (Deno for control)
./lib/cli.ts              # Uses Deno with import maps
```

**Pros:**
- ✅ Best tool for each job
- ✅ Keep shell scripting DX
- ✅ Get runtime control

**Cons:**
- ❌ Two runtimes to maintain
- ❌ More complexity
- ❌ Team needs to know both

**Verdict:** Probably not worth it for Forge

---

## Next Steps

**Option 1: Give Bun One More Chance**
- Run plugin viability Phase 1
- If plugin works reliably → Continue with Bun
- If plugin is buggy → Decision time

**Option 2: Commit to Deno**
- Prototype migration with one module
- Test shell scripting with dax
- Verify all npm packages work
- If successful → Full migration
- Timeline: 1-2 weeks

**Option 3: Work Around Bun's Limits**
- Accept dev-mode testing only
- Skip testing installed package
- Simplify test infrastructure
- Live with limitations

---

## Questions for You

1. **How critical is built-in shell syntax?**
   - Must-have → Stay with Bun, try plugin
   - Nice-to-have → Consider Deno seriously

2. **How much do you trust experimental Bun plugins?**
   - Will try anything → Test plugin approach
   - Want stability → Lean toward Deno

3. **What's your tolerance for fighting the runtime?**
   - High → Work around Bun's limits
   - Low → Deno gives you control

4. **Is 1-2 weeks migration time acceptable?**
   - Yes → Deno is viable option
   - No → Stick with Bun for now

Let me know what resonates with you!
