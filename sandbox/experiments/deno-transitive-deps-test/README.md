# Deno Transitive Dependencies Test

**Goal**: Validate that Deno automatically resolves transitive dependencies without requiring them to be listed in deno.json

**Context**: Previous assessment claimed Deno requires all dependencies to be listed explicitly. Another analysis suggests Deno handles transitive deps automatically like npm does.

---

## Hypothesis

Deno **does** support transitive dependencies:
- Only direct dependencies need to be in `deno.json`
- Transitive deps are resolved automatically
- Lock file tracks the complete tree
- Import maps are for aliasing, not full dependency lists

---

## Test Strategy

### Test 1: npm Package with Many Transitive Deps
**Package**: `commander` (has few deps) or `express` (has many)
**Expectation**:
- List only the top-level package in deno.json
- Deno automatically fetches all transitive deps
- Lock file contains full tree

### Test 2: JSR Package with Dependencies
**Package**: `@std/http` or another JSR package with deps
**Expectation**: Same as Test 1

### Test 3: User Module Importing Forge
**Scenario**: Simulates a user's forge module importing from forge
**Setup**:
1. Create "forge" package with dependencies (commander, yaml)
2. Create "user-module" that imports from forge
3. User module's deno.json only lists forge
**Expectation**:
- User doesn't list commander, yaml
- Deno resolves them through forge
- Works without errors

### Test 4: Lock File Verification
**Check**: Does deno.lock contain transitive deps?
**Expectation**: Lock file has complete tree, not just direct deps

---

## Experiment Structure

```
deno-transitive-deps-test/
├── README.md (this file)
├── test-1-npm-package/
│   ├── deno.json         # Only lists express
│   ├── main.ts           # Uses express
│   └── findings.md       # Results
├── test-2-jsr-package/
│   ├── deno.json         # Only lists @oak/oak
│   ├── main.ts           # Uses oak
│   └── findings.md       # Results
├── test-3-user-module/
│   ├── forge-mock/       # Simulated forge package
│   │   ├── deno.json     # Lists commander, yaml
│   │   └── mod.ts        # Exports using commander
│   ├── user-module/      # Simulated user module
│   │   ├── deno.json     # Only lists ../forge-mock
│   │   └── command.ts    # Imports from forge
│   └── findings.md       # Results
└── RESULTS.md            # Overall findings
```

---

## Success Criteria

If transitive deps work correctly:
- ✅ Test 1: Express works without listing its ~30 dependencies
- ✅ Test 2: Oak works without listing its dependencies
- ✅ Test 3: User module works without listing forge's dependencies
- ✅ deno.lock contains full dependency tree
- ✅ No manual import map entries needed for transitive deps

If they don't work:
- ❌ Import errors for transitive dependencies
- ❌ Must manually add each transitive dep to deno.json
- ❌ Lock file only shows direct deps

---

## Questions to Answer

1. **Do transitive deps work for npm packages?**
   - Can I use express without listing body-parser, cookie, etc?

2. **Do transitive deps work for JSR packages?**
   - Can I use oak without listing its deps?

3. **Do transitive deps work for local/git packages?**
   - Can user module import forge without listing forge's deps?

4. **What does deno.lock actually contain?**
   - Full tree or just direct deps?

5. **What about version conflicts?**
   - If two packages depend on different versions of the same dep?

6. **Do import maps affect transitive resolution?**
   - If I alias one package, do its deps still resolve?

---

## Why This Matters

If transitive deps work:
- ✅ **Major misconception corrected** - Deno is more usable than assessed
- ✅ **User DX is better** - Don't need to know forge's entire dep tree
- ✅ **Installation simpler** - Just list forge, not everything it uses
- ⚠️ **Still need git dependency support** - That limitation remains
- ⚠️ **Still need solution for git URLs** - Git clone cache pattern still valuable

If transitive deps don't work:
- ❌ **Original assessment correct** - Deno requires flat listing
- ❌ **Deal-breaker confirmed** - Too complex for users
- ✅ **Decision to stay with Bun validated**

---

## Running the Tests

```bash
# Test 1: npm package
cd test-1-npm-package
deno cache main.ts
deno run --allow-net main.ts

# Check lock file
cat deno.lock | jq '.npm.specifiers' | wc -l  # Should be > 1 if transitive

# Test 2: JSR package
cd test-2-jsr-package
deno cache main.ts
deno run --allow-net main.ts

# Test 3: User module
cd test-3-user-module
deno cache user-module/command.ts
deno run user-module/command.ts
```

---

## Expected Outcomes

### Scenario A: Transitive Deps Work (likely)
- Tests 1-3 all pass
- Lock file shows full tree
- User module doesn't need forge's deps listed
- **Conclusion**: Major reassessment needed - Deno is more viable than thought

### Scenario B: Transitive Deps Don't Work (unlikely?)
- Import errors for missing deps
- Must manually list everything
- **Conclusion**: Original assessment correct, stay with Bun

### Scenario C: Partial Support
- Works for npm/JSR but not local/git
- Or: Works but requires specific syntax
- **Conclusion**: More nuanced decision needed

---

## Next Steps After Experiment

If transitive deps work:
1. **Re-evaluate Deno decision** - One major concern eliminated
2. **Git dependency support remains the blocker** - Still need solution
3. **Git clone cache pattern even more valuable** - Would solve remaining issue
4. **Consider hybrid approach** - Use Bun for dev, Deno for runtime?
5. **Update documentation** - Correct the misconception

If they don't work:
1. **Validate original decision** - Bun was right choice
2. **Document findings** - Clarify what Deno can/can't do
3. **Close the Deno chapter** - Not worth revisiting

---

## Timeframe

**Estimated time**: 1-2 hours
- 30 min: Set up tests
- 30 min: Run tests and observe
- 30 min: Document findings
- 30 min: Update summary docs if needed

**Priority**: Medium-high - Could significantly change our assessment
