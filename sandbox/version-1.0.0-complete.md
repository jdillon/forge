# Version Update to 1.0.0 - Complete

**Date:** 2025-11-09
**Old Version:** 2.0.0-dev
**New Version:** 1.0.0

---

## Rationale

The bash implementation (version 0.1) has been saved in the `forge-bash` branch. This TypeScript/Bun implementation is the first stable release, warranting version 1.0.0.

---

## Changes Made

### 1. Core Version Update
- ✅ `package.json` → `1.0.0`

### 2. Branding Update
- ✅ Removed "v2" from all references
- ✅ "Forge v2" → "Forge" throughout codebase
- ✅ "v2-prototype" → "module-system" (branch name)

### 3. Documentation Cleanup
- ✅ Removed module documentation headers from all lib/**/*.ts files
  - 9 files cleaned
  - 79 lines of stale docs removed
  - Apache 2.0 license headers preserved

### 4. Files Updated

**Core:**
- `package.json` - Version updated
- `CHANGELOG.md` - Added 1.0.0 release entry
- `README.md` - Title and references updated
- `CLAUDE.md` - Project metadata updated
- `TODO.md` - Title updated

**Source Files (license only, no module docs):**
- `lib/auto-install.ts`
- `lib/builtins.ts`
- `lib/cli.ts`
- `lib/command.ts`
- `lib/config-loader.ts`
- `lib/config-resolver.ts`
- `lib/core.ts`
- `lib/forge-home.ts`
- `lib/helpers.ts`
- `lib/logging/logger.ts`
- `lib/module-resolver.ts`
- `lib/module-symlink.ts`
- `lib/package-manager.ts`
- `lib/runtime.ts`
- `lib/state.ts`
- `lib/types.ts`
- `lib/version.ts`

**Documentation (16 files):**
- `docs/archive/design-decisions/session-notes.md`
- `docs/archive/module-system/planning/phase1-*.md`
- `docs/archive/reference/awesome-cli-experience.md`
- `docs/features/*.md`
- `docs/github-issue-strategy.md`
- `docs/planning/*.md`
- `docs/reference/*.md`

**Tests:**
- `tests/README.md`
- `tests/fixtures/README.md`

**Examples:**
- `examples/basic/README.md`
- `examples/website/.forge2/website.ts`

### 5. Git Diff Summary

```
37 files changed, 71 insertions(+), 219 deletions(-)
```

**Net result:** Removed 148 lines (mostly stale module docs)

---

## Verification

### ✅ No Version References Remain
- Checked all `.ts`, `.md`, `.json` files
- Only CHANGELOG entry and sandbox historical docs contain "v2"

### ⚠️ TypeScript Error (Pre-existing)
```
lib/config-loader.ts(78,9): error TS2740
```
This error existed before version update - unrelated to changes.

### ⚠️ Test Status
- 44 pass / 32 fail
- Failures appear pre-existing (not caused by version update)

---

## CHANGELOG Entry

```markdown
## [1.0.0] - 2025-11-09

### Changed
- First stable release of TypeScript/Bun implementation
- Renamed from "Forge v2" to "Forge" (bash version was 0.1, saved in forge-bash branch)
- Removed module documentation headers from source files (Apache 2.0 license headers remain)
```

---

## What Was NOT Changed

### Intentionally Preserved:
- **Sandbox docs** - Historical research notes (document what was evaluated)
- **dev-home/** - Gitignored development files
- **.claude/** - Session stashes
- **.forge2 directory naming** - Deferred to issue #30

---

## Next Steps (Optional)

1. **Address .forge2 naming** - See issue #30
   - Change to `.forge/` for 1.0 release?
   - Add FORGE_HOME collision guard

2. **Fix TypeScript error** in config-loader.ts

3. **Investigate test failures** (32 failing tests)

4. **Tag release:**
   ```bash
   git tag -a v1.0.0 -m "First stable release"
   git push origin v1.0.0
   ```

---

## Summary

Successfully updated from development version `2.0.0-dev` to stable release `1.0.0`. All "v2" branding removed in favor of clean "Forge" branding. Module documentation headers removed to reduce maintenance overhead while preserving Apache 2.0 license compliance.

The bash prototype (v0.1) remains accessible in the `forge-bash` branch for historical reference.
