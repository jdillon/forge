# Phase 1 Execution Plan

**Created**: 2025-10-31
**Status**: Ready to Execute
**Epic**: [#2 Module Distribution System](https://github.com/jdillon/forge-bash/issues/2)
**Issue**: [#10 Phase 1: Basic Installation & Local Modules](https://github.com/jdillon/forge-bash/issues/10)

**Related Docs**:
- [phase1-basic-installation.md](./phase1-basic-installation.md) - Detailed task breakdown
- [phase1-summary.md](./phase1-summary.md) - Quick reference
- [../../planning/installation-and-module-system.md](../../planning/installation-and-module-system.md) - Overall spec

---

## Analysis: Should We Break Down Phase 1 into GitHub Tasks?

### Phase 1 Scope Assessment

Looking at `docs/wip/module-system/phase1-basic-installation.md`, Phase 1 has:

**5 main tasks**:
1. Create `package.json` (straightforward)
2. Create `install.sh` (medium complexity, decisions to make)
3. Test installation flow (verification)
4. Verify wrapper script (verification)
5. Ensure local modules still work (regression testing)

**Complexity**: Low to Medium
**Estimated duration**: 1-2 days
**Uncertainty**: Low (well-defined, no research needed)

### GitHub Issue Strategy Recommendation

According to `docs/github-issue-strategy.md`:

**Create Story/Task issues when:**
- ✅ Work item is significant (multiple days)
- ✅ Work can be broken down into multiple tasks
- ✅ Work needs discussion or collaboration
- ✅ Work has dependencies or blockers

**Skip task issues when:**
- ❌ Simple, obvious tasks (use phase issue checklist)
- ❌ Tasks that take < 30 minutes
- ❌ Tasks with no discussion needed

### Recommendation: **Use Simplified Approach for Phase 1**

**Rationale**:
- Phase 1 is straightforward implementation
- Most tasks are < 1 day each
- No significant unknowns or research needed
- Solo work, no coordination needed
- WIP doc already has good detail

**Approach**:
- Create **ONE Phase 1 Story issue** with inline task checklist
- Track in GitHub Project board
- Use WIP doc for implementation details

**Benefits**:
- ✅ Less overhead (5 minutes vs. 30 minutes setup)
- ✅ Still visible on project board
- ✅ Still tracked in epic
- ✅ Can upgrade to individual task issues if needed

**When to create individual task issues**:
- If we discover blockers during implementation
- If a task needs detailed discussion
- If a task takes longer than expected (>1 day)

---

## Branching Strategy

### Context

**Current state**:
- Branch: `module-system`
- Status: Active development, 39 tests passing
- Main branch: (not specified in docs, likely `main` or `master`)

**Upcoming work**:
- Epic: Module Distribution System (5 phases)
- Phase 1: Basic Installation
- Phases 2-5: Future work

### Options

#### Option A: Per-Phase Branches
```
module-system (current)
├── phase-1-installation
├── phase-2-meta-project
├── phase-3-git-modules
├── phase-4-upgrades
└── phase-5-polish
```

**Pros**:
- ✅ Clean isolation per phase
- ✅ Can work on multiple phases in parallel
- ✅ Easy to review phase-by-phase
- ✅ Can merge phases independently

**Cons**:
- ❌ Overhead of branch management
- ❌ Potential merge conflicts between phases
- ❌ Have to decide merge order (what if Phase 3 finishes before Phase 2?)
- ❌ Overkill for solo, sequential work

#### Option B: Per-Epic Branch (Current Approach)
```
main/master
└── module-system (epic branch for all 5 phases)
```

**Pros**:
- ✅ Simple - one branch for entire epic
- ✅ No merge conflicts between phases
- ✅ Natural progression (Phase 1 → 2 → 3 → 4 → 5)
- ✅ Easy to see full history
- ✅ Already established and working

**Cons**:
- ❌ Can't work on multiple phases in parallel
- ❌ Harder to review individual phases (but can use commits/tags)
- ❌ If phase fails, can't easily skip it

#### Option C: Hybrid - Branch Only When Needed
```
module-system (default)
├── phase-3-experiment (only if trying risky approach)
└── phase-4-refactor (only if major rework needed)
```

**Pros**:
- ✅ Flexibility when needed
- ✅ Simple default (work on module-system)
- ✅ Can branch for risky/experimental work
- ✅ Low overhead

**Cons**:
- ❌ Inconsistent strategy
- ❌ Have to decide each time

### Recommendation: **Option D - Epic Branch with Phase Feature Branches**

**Rationale**:
- `module-system` is stable base (like main)
- Create feature branches off module-system for each epic/plan
- Merge back to module-system when complete
- Protects stable state while allowing development

**Branch structure**:
```
module-system (stable base - protected)
└── module-system (epic branch for module distribution work)
    ├── work happens here sequentially (Phase 1 → 2 → 3 → 4 → 5)
    └── merge back to module-system when epic complete
```

**Workflow**:
```bash
# Start epic
git checkout module-system
git checkout -b module-system

# Work on phases sequentially on module-system branch
# Phase 1 → commit → Phase 2 → commit → etc.

# When epic complete (all 5 phases done)
git checkout module-system
git merge module-system
git branch -d module-system  # or keep for reference
```

**Benefits**:
- ✅ Protects module-system from in-progress work
- ✅ Clean separation of epics
- ✅ Can still do sequential phase work (no branch per phase)
- ✅ Easy to abandon epic if needed (just delete branch)
- ✅ Clear merge point when epic complete

**When to create additional branches**:
- ⚠️  Experimenting with risky approach within epic
- ⚠️  Major refactor that might not work
- Example: `module-system-experiment` off of `module-system`

---

## Proposed Execution Plan

### Step 0: Create Epic Branch (1 min)

**Create module-system branch off module-system**:

```bash
# Ensure we're on latest module-system
git checkout module-system
git pull  # if needed

# Create epic branch
git checkout -b module-system

# Push to remote (so it's backed up)
git push -u origin module-system
```

**This becomes our working branch for all 5 phases.**

---

### Step 1: GitHub Issues (Already Created!)

**Existing issues**:
- Epic: [#2 Module Distribution System](https://github.com/jdillon/forge-bash/issues/2)
- Phase 1: [#10 Basic Installation & Local Modules](https://github.com/jdillon/forge-bash/issues/10)
- Phase 2: [#11 Meta Project & Dependencies](https://github.com/jdillon/forge-bash/issues/11)
- Phase 3: [#12 Git Module Loading](https://github.com/jdillon/forge-bash/issues/12)
- Phase 4: [#13 Upgrade Commands](https://github.com/jdillon/forge-bash/issues/13)
- Phase 5: [#14 Polish & Documentation](https://github.com/jdillon/forge-bash/issues/14)

**Updated documentation**:
- ✅ `docs/planning/installation-and-module-system.md` - Added issue links to all phases
- ✅ `docs/wip/module-system/phase1-basic-installation.md` - Added epic and issue links

**Action**: Move issue #10 to "In Progress" when ready to start

### Step 2: Implement Phase 1 (1-2 days)

**Follow tasks in order**:
1. Create `package.json` → commit
2. Create `install.sh` → commit
3. Test installation flow → verify (no commit needed)
4. Verify wrapper script → verify (no commit needed)
5. Ensure local modules work → verify (run tests)

**Update GitHub issue**:
- Check off tasks as completed
- Add progress notes for decisions or blockers
- Move issue to "In Progress" → "Done"

**Update WIP doc**:
- Add implementation notes, gotchas, decisions
- Update frequently as you work

### Step 3: Complete Phase 1

**When all tasks done**:
1. Run full test suite: `bun test`
2. Verify examples work: `cd examples/website && forge website build`
3. Update CHANGELOG.md (under `[Unreleased]`)
4. Commit Phase 1 completion
5. Push to origin: `git push origin module-system`
6. Check off Phase 1 in Epic issue
7. Move Phase 1 issue to "Done"

**Archive WIP doc** (optional, can wait until all phases done):
- Move to `docs/archive/module-system/` OR
- Leave in `docs/wip/` until epic complete

### Step 4: Prepare for Phase 2

**Review handoff**:
- Read "Handoff to Phase 2" section in Phase 1 WIP doc
- Verify all prerequisites met
- Create Phase 2 issue
- Plan Phase 2 work

**Continue on same branch** (`module-system`)

---

### Step 5: Complete Epic (After Phase 5)

**When all 5 phases complete**:

```bash
# Ensure everything committed and pushed
git status
git push origin module-system

# Switch to module-system
git checkout module-system

# Merge epic branch
git merge module-system

# Push updated module-system
git push origin module-system

# Optionally delete epic branch (or keep for reference)
# git branch -d module-system
# git push origin --delete module-system
```

**Close Epic issue**, archive WIP docs

---

## Summary

### Decisions

| Question | Decision | Rationale |
|----------|----------|-----------|
| **Break Phase 1 into task issues?** | No - Use simplified approach with one Story issue | Phase 1 is straightforward, < 2 days, no unknowns |
| **Branching strategy?** | Create `module-system` branch off `module-system` | Protects stable base, clear epic isolation |
| **When to create branches?** | Per epic/plan, off `module-system` | Keeps stable base clean, easy to abandon if needed |
| **When to merge back?** | After epic complete (all 5 phases) | Merge complete work, not in-progress |

### Next Actions for Jason

**Review this proposal, then:**

1. **If approved**:
   - I'll create `module-system` branch
   - I'll create GitHub Epic + Phase 1 Story issue
   - I'll start Phase 1 implementation

2. **If changes needed**:
   - Let me know what to adjust
   - I'll update the proposal

3. **Quick start** (if you just want to start coding):
   - I'll create `module-system` branch
   - Skip GitHub issues for now
   - Work on tasks in WIP doc

---

## Trade-offs

### Simplified GitHub Issues (vs. Full Task Breakdown)

**Benefits**:
- ⏱️  Faster setup (5 mins vs. 30 mins)
- 📝 Less overhead during implementation
- 🎯 Still get visibility and tracking

**Costs**:
- 🔍 Less granular progress tracking
- 💬 Harder to discuss individual tasks
- 📊 Can't see task-level status on board

**Mitigation**:
- Can upgrade to individual task issues if needed
- Use progress notes in Phase 1 issue
- WIP doc has full detail

### Epic Branch off module-system (vs. Working Directly on module-system)

**Benefits**:
- 🛡️  Protects stable module-system
- 🚀 Simple workflow within epic (no per-phase branches)
- 🧩 Natural progression, no merge conflicts
- 🗑️  Easy to abandon if epic doesn't work out
- 📚 Clear epic boundary

**Costs**:
- 🔄 One extra branch to manage
- 🚫 Can't work on multiple epics in parallel (but won't need to)

**Mitigation**:
- Still simpler than per-phase branches
- Commit messages clearly indicate phases
- Can create sub-branches for experiments if needed

---

## Open Questions

1. **What is the main branch name?** (`main`, `master`, `trunk`?)
   - Affects where we eventually merge `module-system`

2. **When to merge module-system to main?**
   - After Phase 5 complete?
   - After each phase? (probably not)
   - When ready for release?

3. **Should we create a GitHub Project board now or later?**
   - Now: Visual tracking from start
   - Later: Less overhead, can add when useful

4. **Package scope confirmed as `@planet57/forge`?**
   - Required for package.json creation in Phase 1

---

---

## Testing Strategy

### Test Organization

**Stable tests** (`tests/*`):
- ✅ Write tests for features stable across phases
- ✅ Tests that verify core functionality won't break
- ✅ Keep these passing throughout all phases

**Temporary/transitional tests**:
- ⚠️  Mark clearly with comments explaining:
  - Why temporary (e.g., "Phase 2 will change module loading")
  - When to remove/update (e.g., "Remove after Phase 3 complete")
  - What they're protecting (e.g., "Ensures local modules work until Phase 3")
- 📝 Document in phase WIP doc which tests are temporary

**Example**:
```typescript
// TEMPORARY: Phase 1 only - local module loading
// Will be replaced in Phase 3 when git module loading implemented
// Keeps existing behavior working until then
test('loads local modules from .forge2/', async () => {
  // test code
});
```

### When Stuck: STOP and Document

**If you hit "twitch changing" (rapid try/fail cycles)**:

❌ **DON'T**:
- Keep trying random changes
- Guess at solutions
- Make multiple quick edits hoping something works

✅ **DO**:
1. **STOP** - No more code changes
2. **Analyze** - What's actually failing? Why?
3. **Document** the problem clearly
4. **Present** to Jason:
   - What the problem is
   - What you've tried
   - 2-3 solution options with trade-offs
   - Your recommendation
5. **Wait** for Jason to choose direction

**Same for ANY significant blocker or gotcha**:
- Design decision needed
- Unexpected complexity
- Breaking change discovered
- Architecture question
- Multiple valid approaches

### Rules of Engagement

**Don't guess, investigate**:
- Read code to understand what's happening
- Check existing tests for patterns
- Review relevant docs/specs

**Small steps**:
- One change at a time
- Verify it works before next change
- Commit working states

**Stop on new issues**:
- Don't go down rabbit holes
- No "while I'm here" fixes
- Stay focused on current phase tasks

---

**Ready to proceed when you give the signal.**
