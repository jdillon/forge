# Version Update Proposal: 2.0.0-dev → 1.0.0

**Rationale:** The old bash implementation (saved in `forge-bash` branch) was version 0.1. This TypeScript/Bun rewrite is the first production-ready release, so it should be 1.0.0.

**Status:** forge-bash branch exists ✅

---

## Changes Required

### 1. Package Version

**File:** `package.json`
```diff
- "version": "2.0.0-dev",
+ "version": "1.0.0",
```

---

### 2. Source File Headers (9 files)

All lib/**/*.ts files have "Forge v2" in copyright headers:

**Files:**
- `lib/cli.ts`
- `lib/command.ts`
- `lib/config-loader.ts`
- `lib/config-resolver.ts`
- `lib/core.ts`
- `lib/helpers.ts`
- `lib/logging/logger.ts`
- `lib/state.ts`
- `lib/types.ts`

**Change:**
```diff
- * Forge v2 - [Module Name]
+ * Forge - [Module Name]
```

**Reasoning:** Drop the version from file headers - it's maintenance overhead and the version is in package.json

---

### 3. README.md

**Current:** `# Forge v2 - Modern CLI Framework`

**Options:**
```markdown
# Forge - Modern CLI Framework
```
or
```markdown
# Forge v1 - Modern CLI Framework
```

**Recommendation:** Drop version from title (just "Forge")

**Other changes in README:**
- Line 13: `../../forge2 help` → keep as-is? (this is the binary name)
- References to "v2 prototype" → "production release" or just remove

---

### 4. CLAUDE.md

**Current:**
```
**What**: Forge v2 - Modern CLI framework for deployments (TypeScript/Bun)
**Branch**: `v2-prototype` (active development)
```

**Update to:**
```
**What**: Forge - Modern CLI framework for deployments (TypeScript/Bun)
**Branch**: `module-system` (active development)
```

---

### 5. Branch References

**Search results show:** `v2-prototype` mentioned in docs

**Current branch:** `module-system` ✅

**Action:** Update any remaining `v2-prototype` references to current branch name

---

### 6. Documentation Files

**Files with "Forge v2" or "2.0.0":**
- `docs/reference/xdg-paths.md`
- `docs/reference/dependencies.md`
- `docs/reference/package-management.md`
- `docs/planning/shell-completion.md`
- `examples/website/.forge2/website.ts`
- `examples/basic/README.md`
- `tests/README.md`
- `tests/fixtures/README.md`

**Action:** Review each file and update "Forge v2" → "Forge"

---

### 7. .forge2 Directory Naming

**Current:** Project directories use `.forge2/`

**Discussion needed:** Should this become `.forge/` as part of this versioning cleanup?

**From `docs/reference/xdg-paths.md:122`:**
> # In final version, will be .forge/ instead of .forge2/

**Options:**
1. **Keep `.forge2/`** - Not directly version-related, more of a prototype marker
2. **Change to `.forge/`** - Clean up for 1.0.0 release

**Recommendation:** Keep `.forge2/` for now (separate from version update). See issue #30 which already tracks this + FORGE_HOME collision guard.

---

### 8. Sandbox/Experiments (Low Priority)

**Files in sandbox/ with version references:**
- `sandbox/research-deno-evaluation.md`
- `sandbox/version-handling-strategy.md`
- `sandbox/homebrew-implementation-plan.md`
- Various experiment READMEs

**Action:** Leave as-is (historical research docs showing what was evaluated)

---

### 9. Test Files

**Test files with version references:**
- Test fixtures and test documentation

**Action:** Review for any hardcoded "2.0.0-dev" assumptions

---

## Execution Plan

### Phase 1: Core Updates (Critical)
1. ✅ Update `package.json` → `1.0.0`
2. ✅ Update lib/**/*.ts headers → "Forge" (drop v2)
3. ✅ Update README.md title → "Forge"
4. ✅ Update CLAUDE.md metadata

### Phase 2: Documentation (Important)
5. ✅ Update docs/ files
6. ✅ Update example files
7. ✅ Check test files for hardcoded versions

### Phase 3: Verification
8. ✅ Run tests to ensure nothing broke
9. ✅ Check for any remaining "v2" or "2.0.0" in critical paths

---

## Commands to Execute

```bash
# 1. Update package.json
# (manual edit or script)

# 2. Find and replace in lib/
grep -r "Forge v2" lib/ --files-with-matches | xargs sed -i '' 's/Forge v2/Forge/g'

# 3. Update README.md
sed -i '' 's/# Forge v2/# Forge/g' README.md

# 4. Update CLAUDE.md
# (manual edit - update branch reference)

# 5. Run tests
bun test

# 6. Verify no critical v2 references remain
grep -r "v2" lib/ --color=always
```

---

## Questions

1. **README binary name:** Keep `forge2` command examples or change to `forge`?
   - Current: `../../forge2 help`
   - Option: `../../forge help` (if binary renamed)

2. **CHANGELOG.md:** Add entry for version bump?
   - Document that this is the 1.0.0 release
   - Note bash version was 0.1

3. **.forge2 directory:** Handle now or defer to issue #30?
   - Defer recommended (separate concern)

---

## Risks

- ⚠️ **Binary name mismatch:** If examples say `forge` but binary is `forge2`
- ⚠️ **Version assumptions in tests:** May need to update test expectations
- ⚠️ **Install scripts:** Check bin/install.sh for version references

---

## Next Steps

Ready to proceed with Phase 1 updates?
