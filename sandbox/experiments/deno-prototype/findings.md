# Deno Runtime Prototype - Complete Findings

**Date:** 2025-11-03
**Result:** ✅ **Deno solves the core problem and is technically viable**
**Decision:** Depends on private git repo usage patterns

---

## Executive Summary

Deno successfully solves the module resolution control problem through import maps. The migration is technically straightforward with clear API equivalents. The primary trade-off is **Git workflow: SSH keys (Bun) vs HTTPS tokens (Deno)**.

**Key Results:**
- ✅ Import maps provide complete module resolution control
- ✅ Shell scripting DX nearly identical (one import line)
- ✅ All required APIs have direct equivalents
- ⚠️ Git HTTPS requires token management vs SSH keys

---

## Test Results

### Test 1: Module Resolution Control ✅ PASS

**Problem Solved:** Import maps prevent package self-reference issue

**How it works:**
```json
{
  "imports": {
    "@planet57/forge/": "/path/to/installed/",
    "@planet57/forge-local/": "./src/"
  }
}
```

**Results:**
- Can map same package to different locations
- Fixtures can be forced to use "installed" version
- Singletons preserved within each mapping
- **This completely solves our core problem**

**Evidence:**
```
Installed logger instance: INSTALLED-v45dxq
Local logger instance: 1yo8o7
✅ PASS: Import maps successfully controlled resolution
```

### Test 2: Shell Scripting with dax ✅ PASS

**DX Comparison:**

**Bun (built-in):**
```typescript
const output = await $`echo hello`.text();
```

**Deno (with dax):**
```typescript
import $ from "jsr:@david/dax@0.42.0";
const output = await $`echo hello`.text();
```

**Difference:** ONE import line
**Usage after import:** IDENTICAL

**Capabilities Verified:**
- ✅ Basic command execution
- ✅ Command chaining and piping
- ✅ Environment variables
- ✅ Working directory control
- ✅ Error handling
- ✅ Conditional execution

**Assessment:** dax provides the same DX as Bun's built-in `$`. The extra import line is minimal overhead and makes dependencies explicit.

### Test 3: Git HTTPS Workflow ⚠️ TRADE-OFF

**Current (Bun + SSH):**
1. User has SSH keys configured once
2. `git+ssh://git@github.com/user/repo.git` just works
3. Zero additional configuration per repo

**Required (Deno + HTTPS):**
1. User needs GitHub Personal Access Token (PAT)
2. URLs change to `https://github.com/user/repo.git`
3. Set `DENO_AUTH_TOKENS=github.com=TOKEN` environment variable

**Token Management:**

**Option A: Token in URL (NOT RECOMMENDED)**
```
https://USERNAME:TOKEN@github.com/user/repo.git
```
- ❌ Token visible in URLs, logs, configs
- ❌ Security risk if configs are shared

**Option B: DENO_AUTH_TOKENS (RECOMMENDED)**
```bash
export DENO_AUTH_TOKENS=github.com=ghp_XXX...
```
- ✅ Token not in URLs
- ✅ Can be in ~/.bashrc or ~/.zshrc
- ⚠️ Still a credential to manage

**User Impact:**
- Generate PAT at https://github.com/settings/tokens
- Grant "repo" scope for private repos
- Convert all `git+ssh://` URLs to `https://`
- Add environment variable to shell profile

**Critical Question:**
**How often will forge users need private git repos?**
- **Frequently** → SSH keys are much better DX
- **Rarely/Never** → HTTPS tokens are acceptable

### Test 4: API Migration ✅ STRAIGHTFORWARD

**File I/O:**
```typescript
// Bun
await Bun.write('file.txt', 'content');
const text = await Bun.file('file.txt').text();
const json = await Bun.file('data.json').json();

// Deno
await Deno.writeTextFile('file.txt', 'content');
const text = await Deno.readTextFile('file.txt');
const json = JSON.parse(await Deno.readTextFile('data.json'));
```

**Environment Variables:**
```typescript
// Bun
const val = process.env.VAR;
process.env.VAR = 'value';

// Deno
const val = Deno.env.get('VAR');
Deno.env.set('VAR', 'value');
```

**Shell Commands:**
```typescript
// Bun (built-in)
const output = await $`command`.text();

// Deno (import dax)
import $ from "jsr:@david/dax";
const output = await $`command`.text();
```

**Standard Library:**
```typescript
// Bun
import { join } from 'path';
import { existsSync } from 'fs';
import yaml from 'yaml'; // npm package

// Deno
import { join } from '@std/path';
import { exists } from '@std/fs';
import { parse } from '@std/yaml';
```

**Process Control:**
```typescript
// Bun
process.exit(1);

// Deno
Deno.exit(1);
```

**Migration Effort:**
- Find/replace operations: ~50-100 locations
- Add imports: ~10-15 files
- Test and verify: Critical
- **Total time: 1-2 days for code + 1-2 days testing**

---

## Decision Framework

### Choose Deno if:

✅ **Module resolution control is highest priority**
- Import maps provide exact control we need
- Eliminates self-reference issue completely
- No workarounds or hacks required

✅ **Private git repos are rare**
- Most module sources are public or local
- Occasional token setup is acceptable
- HTTPS workflow overhead is manageable

✅ **Explicit dependencies are valued**
- One import line for shell makes deps clear
- TypeScript native (no transpilation)
- Permission system provides security

### Choose Bun if:

✅ **SSH git workflow is critical**
- Frequent use of private git repos
- SSH keys already configured and working
- Token management overhead unacceptable

✅ **Built-in conveniences are valued**
- No import needed for shell scripting
- Faster startup (no permission checks)
- Simpler mental model for users

✅ **Alternative solutions are acceptable**
- Option B: Copy fixtures outside project
- Option D: Dev-mode testing only
- Import maps equivalent: Possible future Bun feature

---

## Hybrid Option: Use Both?

**Possibility: Keep Bun for project, use Deno for runtime**

**Bun for development:**
- Fast test suite
- Built-in $ for scripts
- Current tooling works

**Deno for forge runtime:**
- Import maps solve user module resolution
- Users install Deno to run forge
- Forge commands execute via Deno

**Trade-offs:**
- ✅ Best of both worlds
- ❌ Two runtimes to maintain
- ❌ More complexity in build/test
- ❌ Users need both installed

**Assessment:** Probably not worth the complexity. Pick one.

---

## Migration Checklist (If Choosing Deno)

### Phase 1: Core Migration (1-2 days)
- [ ] Update all file I/O to use Deno APIs
- [ ] Change environment variable access to Deno.env
- [ ] Add dax imports to all files using `$`
- [ ] Replace process.exit with Deno.exit
- [ ] Update standard library imports (@std/path, @std/fs, etc.)

### Phase 2: Testing (1-2 days)
- [ ] Update test suite to use Deno
- [ ] Add permission flags to test commands
- [ ] Verify all tests pass
- [ ] Test fixture resolution (the core problem)
- [ ] Performance comparison

### Phase 3: Build System (1 day)
- [ ] Create deno.json with import maps
- [ ] Update build scripts
- [ ] Update CI/CD pipeline
- [ ] Update documentation

### Phase 4: Git Workflow (1 day)
- [ ] Document PAT creation process
- [ ] Update all git+ssh:// URLs to https://
- [ ] Add DENO_AUTH_TOKENS setup instructions
- [ ] Test private repo access

### Total Estimated Time: 5-6 days

---

## Performance Comparison (Quick Test)

**Startup Time:**
- Bun: ~30ms (built-in modules)
- Deno: ~100-150ms (permission checks + module loading)

**Execution:**
- Both use V8
- Deno may be slightly slower due to permission checks
- Difference likely negligible for typical forge usage

**For CLI tools like forge, startup time is important but not critical. 100ms vs 30ms is barely noticeable to users.**

---

## NEW DISCOVERY: Git Clone to Cache ⭐

**After testing, discovered the best solution combines the benefits of both approaches.**

### The Solution

Instead of importing directly from git URLs (which requires HTTPS tokens), **clone git repos to a local cache and use import maps to resolve from there**.

**How it works:**
1. `forge install` clones git dependencies to `~/.local/share/forge/repos/`
2. Uses SSH git URLs (keeps existing workflow!)
3. Generates import maps pointing to cloned locations
4. Runtime (Deno or Bun) imports from local paths via import maps

**Benefits:**
- ✅ SSH git support (no HTTPS tokens!)
- ✅ Module resolution control (import maps)
- ✅ Works with Deno OR Bun
- ✅ Follows proven patterns (Cargo, Go, npm)
- ✅ Offline support after install
- ✅ Full git features (branches, tags, commits)

**See:** `CACHE-DESIGN.md` for complete design and implementation plan.

---

## Recommendations

### Recommendation A: Git Clone Cache (BEST SOLUTION) ⭐

**Use git clone cache + import maps approach**

**Benefits:**
- Solves module resolution elegantly
- Keeps SSH git workflow
- Works with either Deno or Bun
- Proven approach (Cargo, Go modules)
- ~4-6 days implementation

**Action:**
1. Decide on runtime (Deno or Bun)
2. Implement Phase 1: Basic git clone to cache
3. Generate import maps from dependencies
4. Add cache management commands

### Recommendation B: Stay with Bun, Use Fallback Option

**If:**
- Private git repos are common in your workflow
- SSH keys are already working well
- Plugin limitation discovered earlier

**Action:**
- Implement Option B (copy fixtures outside project) or
- Implement Option D (dev-mode testing only)
- Re-evaluate if Bun adds import map support

**Pros:**
- No migration needed
- Keep SSH workflow
- Simpler for users

**Cons:**
- Fallback options have their own trade-offs
- Module resolution not as elegant

### Recommendation B: Migrate to Deno

**If:**
- Private git repos are rare
- Module resolution control is critical
- Willing to invest 1 week migration

**Action:**
- Follow migration checklist above
- Document HTTPS workflow clearly
- Provide setup scripts for PAT configuration

**Pros:**
- Solves core problem elegantly
- Mature, stable platform
- Native TypeScript
- Good security model

**Cons:**
- 1 week migration time
- Token management overhead
- Users need to install Deno

---

## Key Files in This Prototype

- `test-1-import-maps.ts` - Proves import maps solve the problem
- `test-2-shell.ts` - Verifies dax DX
- `test-3-git-https.ts` - Documents Git workflow
- `test-4-apis.ts` - Maps all API changes needed
- `deno.json` - Configuration example with import maps
- `forge-lib/logger.ts` - Simulated local source
- `fake-installed/logger.ts` - Simulated installed package

---

## Next Steps

1. **Decide based on git repo usage patterns**
   - Review how often forge will use private git repos
   - Weigh module resolution vs SSH convenience

2. **If choosing Deno:**
   - Review migration checklist
   - Allocate 1 week for migration
   - Start with Phase 1 (core APIs)

3. **If staying with Bun:**
   - Implement Option B or D from bun-resolution-problem.md
   - Keep Deno research for future reference
   - Monitor Bun for import map support

---

## Conclusion

**Deno is technically viable and solves the core problem.**

The decision comes down to one question:
**Is SSH git workflow or module resolution control more important?**

Both are valid choices. The prototype proves Deno works, and the migration path is clear. The choice is yours based on how forge will be used.
