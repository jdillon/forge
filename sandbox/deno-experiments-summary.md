# Deno Experiments Summary

**Period**: November 3-5, 2025
**Status**: Reverted to Bun
**Location**: `sandbox/experiments/deno-prototype/`, `sandbox/experiments/deno-forge-runtime/`, `tmp/deno-*`

---

## Why We Tried Deno

**Problem**: Bun's `--tsconfig-override` flag was broken, blocking our ability to control module resolution for test fixtures.

**Goal**: Use Deno's import maps to gain explicit control over module resolution without tsconfig hacks.

---

## What Worked

### Import Maps Solve Module Resolution ✅
- Deno's import maps provide **complete control** over module resolution
- Can map same package to different locations (local vs installed)
- Eliminates self-reference issues entirely
- Scopes allow per-directory overrides

**Evidence**: `sandbox/experiments/deno-prototype/test-1-import-maps.ts`
```
Installed logger instance: INSTALLED-v45dxq
Local logger instance: 1yo8o7
✅ PASS: Import maps successfully controlled resolution
```

### Shell Scripting with dax ✅
- `dax` provides nearly identical DX to Bun's built-in `$`
- One import line difference: `import $ from "jsr:@david/dax"`
- All shell patterns work: pipes, redirection, conditionals

**Evidence**: `sandbox/experiments/deno-prototype/test-2-shell.ts`

### API Migration Straightforward ✅
- Clear equivalents for all Bun APIs
- File I/O: `Deno.readTextFile()` vs `Bun.file().text()`
- Env vars: `Deno.env.get()` vs `process.env`
- Estimated 1-2 days code changes + 1-2 days testing

**Evidence**: `sandbox/experiments/deno-prototype/test-4-apis.ts`

### Git Clone Cache Pattern ⭐
**Discovery**: Best solution combines benefits of both approaches

Instead of importing from git URLs (requires HTTPS tokens):
1. Clone git dependencies to `~/.local/share/forge/repos/`
2. Use SSH git URLs (keeps existing workflow)
3. Generate import maps pointing to cloned locations
4. Runtime imports from local paths via import maps

**Benefits**:
- SSH git support (no HTTPS tokens!)
- Module resolution control (import maps)
- Works with Deno OR Bun
- Follows proven patterns (Cargo, Go, npm)
- Offline support after install

**Evidence**: `sandbox/experiments/deno-prototype/cache-design.md`

---

## What Didn't Work

### No Git Dependency Support ❌
- `deno add` doesn't support `git+ssh://...` or `file://` paths
- Must manually manage import maps for git dependencies
- No equivalent to `bun add git+ssh://...`

### Import Maps Don't Cross Package Boundaries ❌
**CORRECTION (2025-11-07)**: Deno DOES support transitive dependencies for npm/JSR packages, but import maps are package-scoped.

**What works** ✅:
- npm/JSR packages: Transitive dependencies resolve automatically
- Only need to list direct dependencies in deno.json
- Lock file tracks complete dependency tree

**What doesn't work** ❌:
- File/local imports: Import maps don't cross boundaries
- Git imports: Likely same issue (untested)
- User modules must duplicate all of forge's dependencies

**Impact**: For published packages, transitive deps work great. For local file paths or git URLs (forge's use case), users must still list all dependencies.

**See**: [deno-transitive-deps-test](experiments/deno-transitive-deps-test/FINDINGS.md) - Test results show express and oak work, but local forge-mock doesn't.

### Manual Configuration Overhead ❌
- No convenient `deno add` for all dependency types
- Must hand-edit `deno.jsonc` for git/local deps
- More complex for users to add dependencies

### Module Initialization Issues 🤔
- Silent failures when module imports happen before logging init
- Singleton pattern caused premature logger creation
- Fixed with lazy initialization, but revealed fragility

**Evidence**: `tmp/deno-migration-diagnosis.md`

---

## Decision: Back to Bun

**Key Finding**: Git clone cache + import maps works with **either** Deno or Bun

**Why Stay with Bun**:
- Git dependency support: `bun add git+ssh://...`
- Automatic transitive dependencies
- Single tool for build/test/run/install
- Simpler for users (one runtime)
- Fast test runner we already use

**Alternative Solution**: Use `bun --cwd` flag to control module resolution
- Sets working directory before running
- Can point to forge-home or test fixtures
- Avoids tsconfig entirely
- **This actually solved our original problem!**

**Evidence**: Git history shows migration at `2de4466` then revert by `5ec3208`

### The POC Was Successful

The Deno POC (`sandbox/experiments/deno-forge-runtime/`) **worked perfectly**:
- All tests passed ✅
- Import maps resolved correctly ✅
- npm packages downloaded automatically ✅
- No technical blockers in POC ✅

**However**: Initial assessment was overly optimistic. Deeper testing revealed the git dependency and transitive resolution limitations documented above. The POC tested basic functionality but didn't exercise the full dependency management workflow.

---

## What We Kept

### Logging Improvements ✅
- Root logger + child pattern (synchronous pino-pretty)
- Fixed worker thread buffering issues
- JSON logs to stderr not stdout

### Test Infrastructure ✅
- `bunfig.toml` limits discovery to tests/ directory
- Runtime abstraction layer (generic, works with both)
- Better fixture handling

### Code Quality ✅
- Node.js imports use `node:` prefix
- Better error handling in CLI
- Improved separation of concerns

---

## Lessons Learned

### Import Maps Are Powerful
Deno's import maps provide the control we wanted. The concept is valuable even if we use Bun.

### Git Dependencies Critical
For a deployment tool that installs modules from git repos, native git dependency support is essential. Manual import map management doesn't scale.

### Transitive Dependencies Matter
Auto-resolution of nested deps is crucial for DX. Requiring explicit listing creates maintenance burden.

### One Runtime Preferred
Using Bun for dev and Deno for runtime adds complexity. Better to solve problems within one ecosystem.

### Git Clone Cache Pattern
The discovery that we can clone git repos and use import maps to reference local paths is valuable. **Could be implemented with Bun too.**

### Bun's --cwd Flag Solves It
The original problem (controlling module resolution for test fixtures) was solved more simply with Bun's `--cwd` flag than by migrating to Deno.

---

## Future Considerations

### If Bun's --cwd Stops Working
- Git clone cache + import maps is a fallback
- Could implement with either Bun or Deno
- Would need manual import map management

### If Bun Adds Import Maps
- Would get best of both worlds
- Keep Bun's git/transitive deps
- Gain Deno-style resolution control

### If Deno Adds Git Support
- `deno add git+ssh://...` would change calculus
- Automatic transitive deps would seal it
- Worth revisiting at that point

---

## Artifacts

### Working Experiments
- `sandbox/experiments/deno-prototype/` - All 6 tests passed
  - `test-1-import-maps.ts` - Proved resolution control
  - `test-2-shell.ts` - Verified dax DX
  - `test-3-git-https.ts` - Documented HTTPS workflow
  - `test-4-apis.ts` - Mapped API migrations
  - `test-5-git-imports.ts` - Tested git imports (failed)
  - `test-6-git-clone-cache.ts` - Validated cache approach

### Research Documents
- `sandbox/deno-vs-bun-reality-check.md` - Initial comparison
- `sandbox/research-deno-evaluation.md` - Research plan
- `sandbox/experiments/deno-runtime-research.md` - Deep dive
- `sandbox/experiments/deno-prototype/findings.md` - Complete analysis
- `sandbox/experiments/deno-prototype/cache-design.md` - Git clone cache design

### POC & Migration Documents
- `sandbox/experiments/deno-forge-runtime/` - Working POC implementation
  - `RESULTS.md` - POC test results (all passing)
  - `summary.md` - Complete migration summary (optimistic)
  - `migration-plan.md` - 5-day migration plan
  - `abstraction-strategy.md` - Runtime abstraction design
  - `additional-findings.md` - Git handling analysis
  - `handoff.md` - Handoff documentation
  - `bin/forge-deno` - Working wrapper script
  - `deno.jsonc` - Import map config

### Migration Attempts
- `tmp/deno-migration-diagnosis.md` - Debugging module init issues
- `tmp/deno-migration-status.md` - Decision to revert
- `tmp/session-2025-11-04-report.md` - Session report (claimed success prematurely)
- `tmp/REVERT-PLAN.md` - Rollback strategy

### Temp Experiments
- `tmp/deno-experiments/exp1-local-package/` - Local path tests
- `tmp/deno-experiments/exp2-workspace/` - Workspace tests
- `tmp/deno-add-test/` - deno add behavior tests

### Session Stashes
- `.claude/stashes/stash-2025-11-03-deno-evaluation.md` - Initial Deno evaluation
- `.claude/stashes/stash-2025-11-03-git-clone-cache-solution.md` - Git clone cache discovery
- `.claude/stashes/stash-2025-11-04-bun-blocker.md` - Bun blocker that triggered migration

---

## Recommendation

**Stick with Bun** for the foreseeable future.

**The `--cwd` approach solves our problem** without the complexity of:
- Dual runtime management
- Manual import map maintenance
- User confusion about Bun vs Deno
- Loss of git dependency support

**Keep Deno research** for future reference if:
- Bun's `--cwd` stops working
- Deno adds git dependency support
- We discover `--cwd` has limitations we can't work around

**The git clone cache pattern** is the most valuable outcome - it's runtime-agnostic and could be implemented if needed.

---

## Timeline

- **Nov 3**: Started Deno evaluation, ran experiments
- **Nov 3**: All prototype tests passed, decided to migrate
- **Nov 4**: Migration attempt, hit module init issues
- **Nov 5**: Discovered git/transitive dependency limitations
- **Nov 5**: Found Bun `--cwd` solution, reverted Deno
- **Nov 5+**: Continued with Bun, Phase 3 completed successfully

---

## All Deno References in Codebase

Search revealed 687 occurrences across 20 files:

**Active Documentation** (references remain for historical context):
- `CLAUDE.md` - Mentions deno-prototype as example
- `docs/wip/module-system/README.md` - Notes Deno migration was considered
- `docs/reference/` - Comparison docs preserved for future reference
  - `runtime-comparison.md` - Detailed Bun vs Deno comparison
  - `bun-vs-deno-comparison.md` - Architecture comparison
  - `module-resolution.md` - Module resolution approaches

**Experiments** (preserved for learning):
- `sandbox/experiments/deno-prototype/` - All working tests and findings
- `sandbox/experiments/deno-forge-runtime/` - Complete POC implementation
- `sandbox/experiments/tsconfig-override-node-modules/findings.md` - Context

**Analysis Documents** (valuable for future):
- `sandbox/deno-vs-bun-reality-check.md` - Initial comparison
- `sandbox/research-deno-evaluation.md` - Research plan
- `sandbox/deno-experiments-summary.md` - This document
- `sandbox/session-2025-11-03-summary.md` - Session notes
- `sandbox/gh-issue-*.md` - Related GitHub issue discussions
- `sandbox/index.md` - Sandbox index

**Temporary/Diagnostic**:
- `tmp/deno-*` - Migration attempts and diagnosis
- `tmp/REVERT-PLAN.md` - Rollback strategy

**Code References** (minimal):
- `lib/package-manager.ts` - One comment reference

**Stashes**:
- `.claude/stashes/stash-2025-11-03-deno-evaluation.md`
- `.claude/stashes/stash-2025-11-03-git-clone-cache-solution.md`
- `.claude/stashes/stash-2025-11-04-bun-blocker.md`

**Note**: No Deno code remains in production. All references are documentation/experiments.

---

## Conclusion

**Deno is technically viable but not worth the trade-offs.**

Import maps solve the module resolution problem elegantly, but:
- Loss of git dependency support is a deal-breaker
- Manual dependency management doesn't scale
- Dual runtime complexity isn't justified

**Bun's `--cwd` flag provides a simpler solution** that achieves the same goal with less complexity.

**Time invested**: ~3 days of research and experimentation
**Value**: Understanding Deno's strengths, discovering `--cwd` alternative, git clone cache pattern
**Status**: Successfully back on Bun, Phase 3 complete, 39 tests passing

**Documentation preserved**: All experiments and research remain in sandbox/experiments/ and sandbox/ for future reference if Deno's limitations are addressed or if we need the git clone cache pattern.
