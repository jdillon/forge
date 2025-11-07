# Deno Transitive Dependencies Test - Results

**Date**: [To be filled]
**Deno Version**: [To be filled]

---

## Executive Summary

[PASS/FAIL]: Deno [does/does not] support transitive dependencies automatically.

---

## Test Results

### Test 1: npm Package (express) ✅/❌

**Command**: `deno run --allow-net test-1-npm-package/main.ts`

**Expected**: Express works without listing its ~30 transitive dependencies

**Result**:
```
[Paste output here]
```

**Observations**:
- [ ] Express imported successfully
- [ ] No errors about missing dependencies
- [ ] Lock file contains multiple packages
- [ ] Lock file size: [X] lines, [Y] packages

**Conclusion**: [Pass/Fail with explanation]

---

### Test 2: JSR Package (oak) ✅/❌

**Command**: `deno run --allow-net test-2-jsr-package/main.ts`

**Expected**: Oak works without listing its transitive dependencies

**Result**:
```
[Paste output here]
```

**Observations**:
- [ ] Oak imported successfully
- [ ] No errors about missing dependencies
- [ ] Lock file created

**Conclusion**: [Pass/Fail with explanation]

---

### Test 3: User Module (forge mock) ✅/❌

**Command**: `deno run test-3-user-module/user-module/command.ts`

**Expected**: User module works without listing forge's dependencies (commander, yaml)

**Result**:
```
[Paste output here]
```

**Observations**:
- [ ] User module imported forge successfully
- [ ] Commander worked through forge (not listed in user's deno.json)
- [ ] YAML worked through forge (not listed in user's deno.json)
- [ ] No manual import map entries needed

**Conclusion**: [Pass/Fail with explanation]

---

## Lock File Analysis

### Test 1 Lock File
```bash
# Number of packages
jq '.npm.packages | keys | length' test-1-npm-package/deno.lock

# Sample packages
jq '.npm.packages | keys[0:5]' test-1-npm-package/deno.lock
```

**Findings**:
- Direct dependencies: [X]
- Total packages in lock: [Y]
- Ratio indicates: [transitive deps included/not included]

### Test 3 Lock File
```bash
# Check user module's lock file
jq '.npm.packages | keys' test-3-user-module/user-module/deno.lock
```

**Findings**:
- Does lock file contain commander? [Yes/No]
- Does lock file contain yaml? [Yes/No]
- Conclusion: [Transitive deps tracked/not tracked]

---

## Overall Assessment

### If All Tests Passed ✅

**Conclusion**: Deno DOES support transitive dependencies automatically.

**What this means**:
1. ✅ **Major reassessment needed** - Original assessment was incorrect
2. ✅ **User DX much better** - Only list direct dependencies
3. ✅ **deno.json is simpler** - Import maps for aliasing, not full manifest
4. ⚠️ **Git dependency support still needed** - Remains a limitation
5. ⚠️ **Git clone cache pattern still valuable** - Solves git URL problem

**Impact on Deno decision**:
- One major concern eliminated
- Git dependency support is now the PRIMARY blocker
- Worth reconsidering Deno if git support can be solved

### If Tests Failed ❌

**Conclusion**: Deno does NOT support transitive dependencies automatically.

**What this means**:
1. ✅ **Original assessment validated** - Flat listing required
2. ❌ **User DX poor** - Must know entire dependency tree
3. ❌ **Deal-breaker confirmed** - Too complex for users
4. ✅ **Bun decision correct** - Stay with Bun

**Impact on Deno decision**:
- No need to reconsider
- Close the Deno chapter
- Focus on Bun improvements

### If Partial Support ⚠️

**Conclusion**: Transitive deps work [conditionally/for some cases]

**Specifics**:
- Works for: [npm/JSR/local]
- Doesn't work for: [npm/JSR/local]
- Requires: [specific syntax/configuration]

**Impact on Deno decision**:
- [More nuanced assessment needed]
- [Specific recommendations based on findings]

---

## Implications for Forge

### If Transitive Deps Work

**Immediate**:
1. Update [sandbox/deno-experiments-summary.md](../deno-experiments-summary.md)
2. Correct the "No Transitive Dependencies ❌" section
3. Add note about misconception

**Short-term**:
1. Re-evaluate git dependency solutions
2. Consider git clone cache more seriously
3. Prototype forge with Deno + git clone cache

**Long-term**:
1. Decide: Implement git clone cache with Deno?
2. Or: Wait for Deno to add git dependency support?
3. Or: Stay with Bun but keep research for future?

### If Transitive Deps Don't Work

**Immediate**:
1. No changes needed to existing assessment
2. Validate original decision

**Short-term**:
1. Close Deno investigation
2. Focus on Bun improvements

**Long-term**:
1. Revisit only if Deno fundamentally changes
2. Monitor Deno development

---

## Next Steps

Based on results:

**If PASS**:
- [ ] Update deno-experiments-summary.md
- [ ] Re-evaluate git dependency solutions
- [ ] Design git clone cache experiment for Deno
- [ ] Discuss with Jason: worth revisiting Deno?

**If FAIL**:
- [ ] Add results to summary
- [ ] Close Deno investigation
- [ ] Archive experiments

**If PARTIAL**:
- [ ] Document specific limitations
- [ ] Assess if workarounds exist
- [ ] Make case-by-case decision

---

## Raw Data

### Command History
```bash
[Paste full command history and output here]
```

### Lock Files
Attach or paste relevant sections of generated lock files.

---

## Validation

- [ ] Tests run successfully
- [ ] Results documented
- [ ] Lock files analyzed
- [ ] Implications assessed
- [ ] Next steps clear
- [ ] Summary document updated (if needed)
