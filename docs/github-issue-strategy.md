# GitHub Issue Strategy

**Purpose**: Keep work organized, visible, and easy to pick up across multiple sessions.

**For**: Multi-phase projects (like Module System implementation)

---

## Overview

We use GitHub Issues and Projects to organize complex, multi-phase work into a clear hierarchy with visual tracking.

**Hierarchy:**
```
Epic (Parent Issue)
└─ Phase Issues (Stories)
   └─ Task Issues (Individual work items)
```

**Visualization:**
- **Project Board**: Kanban view (Backlog → Planned → In Progress → Blocked → Done)
- **Roadmap View**: Timeline visualization of phases
- **Table View**: Spreadsheet-like view for bulk updates

---

## Issue Hierarchy

### Level 1: Epic (Parent Tracking Issue)

**Purpose**: High-level tracking for an entire feature or system

**Example**: Issue #2 "Module Distribution System"

**Template:**
```markdown
# [Epic Name]

Epic tracking issue for [feature/system description].

**Spec**: docs/planning/[spec-name].md
**WIP Docs**: docs/wip/[project-name]/

## Overview

[Brief description of what this epic delivers]

## Phases

- [ ] #XX Phase 1: [Name]
- [ ] #XX Phase 2: [Name]
- [ ] #XX Phase 3: [Name]
- [ ] #XX Phase 4: [Name]
- [ ] #XX Phase 5: [Name]

## Progress

**Current Phase**: Phase X
**Status**: [In Progress / Blocked / Planning]

See [Project Board]([link])

## Success Criteria

- [ ] [High-level deliverable 1]
- [ ] [High-level deliverable 2]
- [ ] [High-level deliverable 3]

## Related

- Milestone: [milestone-name]
- Spec: docs/planning/[spec].md
- WIP: docs/wip/[project]/
```

**Labels**: `epic`, `type:spec`

**Checklist**: Links to phase issues (checked when phase complete)

---

### Level 2: Phase Issues (Stories)

**Purpose**: Track a complete phase of work with clear goals and tasks

**Example**: "Phase 1: Basic Installation & Local Modules"

**Template:**
```markdown
# Phase N: [Name]

**Epic**: #N (link to epic)
**Spec**: docs/planning/[spec].md § Phase N
**WIP**: docs/wip/[project]/phaseN-[name].md

## Goals

[Copy goals from spec]

## Tasks

- [ ] #XX [Task name 1]
- [ ] #XX [Task name 2]
- [ ] #XX [Task name 3]
- [ ] [Simple task without issue]
- [ ] [Another simple task]

## Success Criteria

- [ ] [Specific, testable criterion 1]
- [ ] [Specific, testable criterion 2]
- [ ] [Specific, testable criterion 3]

## Progress Notes

*(Update as work progresses)*

### YYYY-MM-DD

- Started task: [name]
- Decision: [key decision made]
- Blocked on: [blocker description]

### YYYY-MM-DD

- Completed: [task name]
- Learning: [gotcha or insight]

## Handoff to Next Phase

*(Fill in when phase complete)*

**Delivered:**
- [What was built]

**State:**
- [What next phase can rely on]

**Notes:**
- [Important context for next phase]
```

**Labels**: `phase-N`, `type:impl`

**Checklist**: Links to task issues + inline tasks for simple work

**Updates**: Add progress notes as you work (like a mini-journal)

---

### Level 3: Task Issues (Individual Work Items)

**Purpose**: Track specific, focused work items that need detail or discussion

**When to create task issues:**
- ✅ Task is complex enough to need discussion
- ✅ Task has open questions or design decisions
- ✅ Task might span multiple days
- ✅ Task could be worked on independently

**When NOT to create task issues:**
- ❌ Simple, obvious tasks (use phase issue checklist)
- ❌ Tasks that take < 30 minutes
- ❌ Tasks with no discussion needed

**Template:**
```markdown
# [Task Name]

**Phase**: #XX (Phase N: [name])
**Epic**: #XX ([epic name])

## Description

[What needs to be done]

## Acceptance Criteria

- [ ] [Specific requirement 1]
- [ ] [Specific requirement 2]

## Open Questions

- [ ] [Question to resolve]
- [ ] [Decision to make]

## Implementation Notes

[Technical details, approaches, trade-offs]

## Testing

- [ ] [How to verify this works]

## Files Changed

- [ ] `path/to/file1.ts`
- [ ] `path/to/file2.ts`
```

**Labels**: `phase-N`, `type:impl` or `type:test` or `type:docs`

**Close when**: Task is complete and verified

---

## Labels

### Phase Labels (Mutually Exclusive)
- `phase-1` - Phase 1: Basic Installation
- `phase-2` - Phase 2: Meta Project & Dependencies
- `phase-3` - Phase 3: Git Module Loading
- `phase-4` - Phase 4: Upgrade Commands
- `phase-5` - Phase 5: Polish & Documentation

### Type Labels (Primary Classification)
- `epic` - Epic tracking issue (parent)
- `type:spec` - Specification or design work
- `type:impl` - Implementation work
- `type:test` - Testing work
- `type:docs` - Documentation work

### Status Labels (Special States)
- `blocked` - Blocked on external dependency or decision
- `needs-review` - Ready for review/discussion
- `good-first-issue` - Good for new contributors

### Priority Labels (Optional)
- `priority:high` - Critical path
- `priority:medium` - Important but not blocking
- `priority:low` - Nice to have

---

## GitHub Project Board

### Setup

1. **Create Project** (via UI or CLI)
   ```bash
   gh project create --title "Forge v2 Module System" --owner jdillon
   ```

2. **Choose Template**: Board (Kanban-style)

3. **Configure Status Field** (built-in):
   - Backlog
   - Planned
   - In Progress
   - Blocked
   - Done

4. **Add Custom Fields**:
   - **Phase** (single select): Phase 1, Phase 2, Phase 3, Phase 4, Phase 5
   - **Effort** (number): Story points (1, 2, 3, 5, 8) or hours
   - **Priority** (single select): High, Medium, Low
   - **Type** (single select): Epic, Spec, Implementation, Testing, Docs

5. **Add Issues to Project**:
   ```bash
   gh project item-add <project-id> --owner jdillon --url <issue-url>
   ```

### Board Columns

**Backlog**
- Future phases not yet planned
- Ideas and nice-to-haves
- Low priority tasks

**Planned**
- Next phase ready to start
- Tasks with clear scope
- Dependencies resolved

**In Progress**
- Currently being worked on
- Limit: 1-2 items at a time (WIP limit)

**Blocked**
- Waiting on external dependency
- Needs decision or input
- Technical blocker

**Done**
- Completed and verified
- Tests passing
- Documented

### Workflow

1. **Phase starts**: Move phase issue to "In Progress"
2. **Task starts**: Create task issue → Move to "In Progress"
3. **Task blocked**: Move to "Blocked", add comment explaining blocker
4. **Task complete**: Check off in phase issue → Move to "Done"
5. **Phase complete**: Check off in epic issue → Move to "Done"

---

## Integration with Documentation

### Spec → WIP → Issues (Flow)

```
1. Planning Phase
   └─ docs/planning/[spec].md
      ↓
2. Create Epic + Phase Issues
   └─ GitHub Issues with hierarchy
      ↓
3. Work Phase
   └─ docs/wip/[project]/phaseN-*.md
      ↓ (update as you work)
4. Track Progress
   └─ GitHub Issues + Project Board
      ↓ (update status, notes)
5. Completion
   └─ docs/features/ or docs/archive/
```

### Keeping in Sync

**WIP docs** and **GitHub issues** serve different purposes:

| Aspect | WIP Docs | GitHub Issues |
|--------|----------|---------------|
| **Purpose** | Implementation details, decisions, gotchas | Tracking, status, discussion |
| **Audience** | Future you, deep context | Team, high-level progress |
| **Detail** | High (code snippets, alternatives) | Medium (goals, tasks) |
| **Update Frequency** | As you work | Major milestones |
| **Persistence** | Archived when done | Permanent record |

**Sync strategy:**
1. **Start phase**: Create WIP doc + phase issue on same day
2. **During work**: Update WIP doc frequently, issue occasionally
3. **Major milestone**: Add progress note to phase issue
4. **Complete task**: Check off in phase issue, update WIP doc
5. **Complete phase**: Update epic issue, move WIP to archive

---

## Creating Issues (Examples)

### Create Epic Issue

```bash
gh issue create \
  --title "Module Distribution System" \
  --label "epic,type:spec" \
  --body "$(cat docs/wip/module-system/templates/epic-template.md)"
```

### Create Phase Issue

```bash
gh issue create \
  --title "Phase 1: Basic Installation & Local Modules" \
  --label "phase-1,type:impl" \
  --body "$(cat docs/wip/module-system/templates/phase1-template.md)"
```

### Create Task Issue

```bash
gh issue create \
  --title "Create package.json" \
  --label "phase-1,type:impl" \
  --body "Add npm package metadata to repo root..."
```

### Link Issues

In issue body or comments:
- `#2` - Reference issue
- `Fixes #2` - Auto-close when merged
- `Part of #2` - Show relationship
- `Blocked by #2` - Show dependency

---

## Benefits

### For You (Jason)
✅ **Visual progress** - See exactly where you are
✅ **Easy pickup** - Resume work after days/weeks
✅ **Clear focus** - Know what to work on next
✅ **Context preserved** - Decisions and gotchas tracked
✅ **Milestone tracking** - See progress toward goals

### For Collaboration (Future)
✅ **Onboarding** - New contributors see structure
✅ **Discussion** - Issues provide discussion threads
✅ **History** - Understand why decisions were made
✅ **Coordination** - Avoid duplicate work

### For Claude
✅ **Context continuity** - Understand state across sessions
✅ **Clear scope** - Know what phase/task is active
✅ **Reference point** - Link code changes to issues
✅ **Progress tracking** - Update issues as work completes

---

## Example: Module System Project

### Epic Issue #2
```
Title: Module Distribution System
Labels: epic, type:spec
Status: In Progress
```

### Phase Issues
```
#10 Phase 1: Basic Installation & Local Modules (phase-1, type:impl) → In Progress
#11 Phase 2: Meta Project & Dependencies (phase-2, type:impl) → Planned
#12 Phase 3: Git Module Loading (phase-3, type:impl) → Backlog
#13 Phase 4: Upgrade Commands (phase-4, type:impl) → Backlog
#14 Phase 5: Polish & Documentation (phase-5, type:docs) → Backlog
```

### Task Issues (Phase 1)
```
#20 Create package.json (phase-1, type:impl) → In Progress
#21 Create install.sh script (phase-1, type:impl) → Planned
#22 Test installation flow (phase-1, type:test) → Planned
```

### Project Board View
```
┌─────────┬─────────┬─────────────┬─────────┬──────┐
│ Backlog │ Planned │ In Progress │ Blocked │ Done │
├─────────┼─────────┼─────────────┼─────────┼──────┤
│ #12     │ #11     │ #10         │         │      │
│ Phase 3 │ Phase 2 │ Phase 1     │         │      │
│         │         │             │         │      │
│ #13     │ #21     │ #20         │         │      │
│ Phase 4 │ install │ package.json│         │      │
│         │         │             │         │      │
│ #14     │ #22     │             │         │      │
│ Phase 5 │ test    │             │         │      │
└─────────┴─────────┴─────────────┴─────────┴──────┘
```

---

## Appendix A: Simpler Alternative

**If the full hierarchy feels like too much overhead**, here's a lighter approach:

### Simplified Structure

```
Epic Issue
└─ Phase Issues (with inline task checklists)
```

**Skip**: Individual task issues

**Use instead**: Checkboxes in phase issue description

**Example Phase Issue:**
```markdown
# Phase 1: Basic Installation & Local Modules

**Epic**: #2

## Tasks

- [ ] Create package.json
  - [ ] Add name and version
  - [ ] Configure bin entry point
  - [ ] Define exports
- [ ] Create install.sh script
  - [ ] Check prerequisites
  - [ ] Create meta project
  - [ ] Install forge
  - [ ] Create wrapper script
- [ ] Test installation flow
- [ ] Verify wrapper script works
- [ ] Ensure local modules still work

## Progress

[Update as you work]
```

**Benefits:**
- ✅ Less issue management
- ✅ Still have project board
- ✅ Still track phases
- ✅ Simpler workflow

**Trade-offs:**
- ❌ Less granular discussion
- ❌ Harder to see individual task status on board
- ❌ Can't assign individual tasks

**When to use:**
- Solo work
- Well-defined tasks
- Less need for task-level discussion

**When to upgrade to full hierarchy:**
- Multiple people working
- Tasks need detailed discussion
- Need fine-grained tracking

---

## Appendix B: CLI Cheat Sheet

### View Issues
```bash
# List all issues in epic
gh issue list --label "epic"

# List phase 1 issues
gh issue list --label "phase-1"

# View issue detail
gh issue view 2
```

### Create Issues
```bash
# Create issue interactively
gh issue create

# Create with template
gh issue create --title "Title" --body "Body" --label "phase-1,type:impl"
```

### Update Issues
```bash
# Add label
gh issue edit 2 --add-label "blocked"

# Remove label
gh issue edit 2 --remove-label "blocked"

# Close issue
gh issue close 2
```

### Projects
```bash
# List projects
gh project list --owner jdillon

# Add issue to project
gh project item-add <project-id> --owner jdillon --url https://github.com/jdillon/forge/issues/2

# View project (opens in browser)
gh project view <project-id> --owner jdillon --web
```

---

## Appendix C: Issue Templates

You can create issue templates in `.github/ISSUE_TEMPLATE/` to standardize:

**`.github/ISSUE_TEMPLATE/phase.md`:**
```markdown
---
name: Phase Issue
about: Track a complete phase of work
labels: type:impl
---

# Phase N: [Name]

**Epic**: #N
**Spec**: docs/planning/[spec].md § Phase N
**WIP**: docs/wip/[project]/phaseN-[name].md

## Goals

[Goals from spec]

## Tasks

- [ ] [Task 1]
- [ ] [Task 2]

## Success Criteria

- [ ] [Criterion 1]
- [ ] [Criterion 2]
```

Then use:
```bash
gh issue create --template phase.md
```

---

**End of Document**
