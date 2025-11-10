# GitHub Issue Strategy

**Purpose**: Keep work organized, visible, and easy to pick up across multiple sessions.

**For**: Multi-phase projects (like Module System implementation)

**Status**: Living document - update as strategies evolve

---

## Table of Contents

1. [Overview](#overview)
2. [Design Decisions & Rationale](#design-decisions--rationale)
3. [Issue Hierarchy](#issue-hierarchy)
4. [Labels](#labels)
5. [GitHub Project Board](#github-project-board)
6. [Integration with Documentation](#integration-with-documentation)
7. [Creating Issues](#creating-issues)
8. [Benefits](#benefits)
9. [Examples](#examples)
10. [Appendices](#appendices)

---

## Overview

We use GitHub Issues and Projects to organize complex, multi-phase work into a clear hierarchy with visual tracking.

**Structure:**
- **Plan** = Design document (e.g., `docs/planning/[spec].md`)
- **Epic** = GitHub issue tracking the plan's implementation
- **Phase** = Major stage in the plan (Phase 1, Phase 2, etc.)
- **Phase Issue** = GitHub issue tracking one phase
- **Story** = Major work item (may span multiple days)
- **Task** = Small work item (typically < 1 day)

**Issue Hierarchy:**
```
Epic (tracks the plan)
└─ Phase Issues (tracks each phase)
   ├─ Story Issues (major work items)
   │  └─ Task Issues (small work items)
   └─ Task Issues (standalone small items)
```

**Type Field Values:** Epic, Story, Task (categorizes work granularity)

**Visualization:**
- **Project Board**: Kanban view (Backlog → Planned → In Progress → Blocked → Done)
- **Roadmap View**: Timeline visualization of phases
- **Table View**: Spreadsheet-like view for bulk updates

---

## Design Decisions & Rationale

### Terminology Choices

**Why "Plan" not "Epic" for documents?**
- **Plan** = The design document laying out the work
- **Epic** = The GitHub issue tracking implementation of that plan
- Keeps clear separation between design artifacts and tracking artifacts
- Avoids confusion: "Read the epic" vs "Read the plan"

**Why "Phase" not "Milestone" or "Sprint"?**
- **Phase** = Natural stage in a larger plan (Phase 1, Phase 2, etc.)
- **Milestone** = GitHub's built-in feature (reserved for release tracking)
- **Sprint** = Time-boxed iteration (we're not doing strict Scrum)
- Phases can be of varying size/duration based on work complexity

**Why separate "Phase" from "Story"?**
- **Phase** = Organizational concept (groups related work)
- **Story** = Work granularity (major work item)
- Phase issues are *typed* as Stories (they're major work items)
- But phases can also contain multiple Stories/Tasks if needed
- This flexibility allows both simple and complex phases

**Why "Story" and "Task" (Agile terms)?**
- **Industry standard**: Widely recognized in software development
- **Clear distinction**: Story = days of work, Task = hours of work
- **Familiar hierarchy**: Epic → Story → Task is standard Agile
- **Flexible**: Can create Story issues within phases or just use Tasks

### Label Strategy

**Why `phase-N` labels instead of project fields?**
- **Labels are portable**: Work across repositories, show in issue lists
- **Labels are filterable**: Easy to find all phase-1 work
- **Fields are for categorization**: Type, Priority, Effort, etc.
- **Labels are for grouping**: Which phase does this belong to?

**Why both labels AND custom fields?**
- **Labels**: Fast filtering, visible in lists, portable
- **Custom Fields**: Rich data (single-select with colors), better visualization
- **Complementary**: Use both for maximum flexibility

### Custom Field Choices

**Type field: Epic, Story, Task**
- **Epic**: Entire plan tracking (usually just one per plan)
- **Story**: Major work (days), can be a phase or work within a phase
- **Task**: Small work (hours), atomic units of work
- **Why these three?**: Standard Agile granularity, clear size distinction
- **Color coding**: Purple (Epic), Blue (Story), Orange (Task) - visual hierarchy

**Phase field: Phase 1, Phase 2, etc.**
- **Redundant with labels?**: Yes, intentionally
- **Why both?**: Fields show on cards, labels filter better
- **Use case**: Quick visual "which phase?" on board cards

**Priority field: High, Medium, Low**
- **Simple**: Only three levels avoids over-thinking
- **Clear**: High = critical path, Medium = important, Low = nice-to-have
- **When to use**: Not every issue needs priority; use sparingly

**Effort field: Number**
- **Story points**: 1, 2, 3, 5, 8, 13 (Fibonacci-ish)
- **Or hours**: Actual time estimates
- **Optional**: Don't estimate everything, only when useful
- **Use case**: Capacity planning, tracking velocity

### Parent/Child Relationships

**Why use GitHub's native task lists?**
- **Automatic parent tracking**: Sub-issues field populates automatically
- **Progress tracking**: Epic shows "3/5 completed"
- **Simple syntax**: Just `- [ ] #10` in epic description
- **Visual**: Shows parent/child in issue sidebar

**Why also show Parent Issue field on board?**
- **Visual hierarchy**: Can see which epic each issue belongs to
- **Filtering**: Can filter by parent to see all work for an epic
- **Context**: Provides context without opening the issue

### Board Configuration Choices

**Status columns: No Status, Todo, In Progress, Blocked, Done**
- **No Status**: Backlog, ideas, not yet planned
- **Todo**: Planned, ready to start, dependencies met
- **In Progress**: Currently being worked on (limit WIP!)
- **Blocked**: Can't proceed, waiting on something
- **Done**: Completed and verified
- **Why these?**: Clear workflow, matches real work states

**Fields visible on cards: Title, Assignees, Status, Type, Parent issue**
- **Title**: Obviously required
- **Assignees**: Who's working on it?
- **Status**: Already shown by column, but useful
- **Type**: Epic/Story/Task distinction at a glance
- **Parent issue**: Context - which epic does this belong to?
- **Why not more?**: Cards get cluttered, keep it minimal

### Integration Philosophy

**Why both WIP docs AND GitHub issues?**
- **WIP docs**: Implementation details, decisions, gotchas, code snippets
- **GitHub issues**: Tracking, status, discussion, collaboration
- **Different audiences**: Docs = future you, Issues = team/stakeholders
- **Different lifespans**: Docs = archived when done, Issues = permanent
- **Complementary**: Reference each other, serve different needs

**Sync strategy:**
- **Create together**: WIP doc + phase issue at same time
- **Update separately**: WIP = frequently, Issues = milestones
- **Link bidirectionally**: Issue links to WIP doc, WIP doc mentions issue
- **Archive together**: When phase complete, both get archived

### Why This Complexity?

**Isn't this over-engineered for solo work?**
- **Future collaboration**: Scales when others join
- **Context switching**: Easy to resume after days/weeks away
- **Memory aid**: You will forget, issues remember
- **Portfolio**: Demonstrates systematic approach
- **Learning**: Practice for larger team projects

**When to use simplified version:**
- **Quick experiments**: Skip all this, just hack
- **Single-task work**: One issue, done
- **Well-known territory**: You've done it before
- **Time pressure**: Ship first, organize later

**When to use full version:**
- **Multi-phase projects**: Like module system (5 phases)
- **Uncertain territory**: Research + implementation
- **Long-running**: Spans weeks/months
- **High stakes**: Can't afford to lose track

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

### Level 2: Phase Issues

**Purpose**: Track a complete phase of the plan with clear goals and deliverables

**Type**: Typically "Story" (major work item), but could contain multiple Stories/Tasks

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

### Level 3: Story Issues (Optional)

**Purpose**: Track major work items within a phase that need breakdown

**Type**: "Story"

**When to create story issues:**
- ✅ Work item is significant (multiple days)
- ✅ Work can be broken down into multiple tasks
- ✅ Work needs discussion or collaboration
- ✅ Work has dependencies or blockers

**When NOT to create story issues:**
- ❌ Phase is simple enough to track directly
- ❌ Work is a single cohesive task
- ❌ Creating unnecessary overhead

**Template:**
```markdown
# [Story Name]

**Phase**: #XX (Phase N: [name])
**Epic**: #XX ([epic name])
**Type**: Story

## Description

[What needs to be accomplished]

## Goals

- [Goal 1]
- [Goal 2]

## Tasks

- [ ] #XX [Task 1]
- [ ] #XX [Task 2]
- [ ] [Simple inline task]

## Acceptance Criteria

- [ ] [Criterion 1]
- [ ] [Criterion 2]
```

**Labels**: `phase-N`, `type:impl`

---

### Level 4: Task Issues (Individual Work Items)

**Purpose**: Track specific, focused work items that need detail or discussion

**Type**: "Task"

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

## Recommended Project Views

GitHub Projects v2 supports multiple views of the same data. Set up these views for different workflows:

### View 1: Issues Table

**Purpose**: Detailed view of all work items with full metadata

**Layout**: Table

**Columns to show**:
- Title
- Assignees
- Status
- Type
- Phase
- Priority
- Effort
- Parent issue
- Labels
- Milestone

**Filters**: None (show everything by default)

**Sort by**: Manual (allows drag-and-drop prioritization)

**Use cases**:
- Bulk editing issues
- Seeing all metadata at once
- Sprint planning
- Effort estimation
- Filtering by multiple criteria

---

### View 2: Roadmap

**Purpose**: Timeline visualization of phases and major milestones

**Layout**: Roadmap

**Group by**: Phase or Milestone

**Date field**: Start date / Target date (if you add these fields)

**Filters**: Type = Epic or Story (hide small tasks)

**Use cases**:
- High-level planning
- Communicating timelines to stakeholders
- Identifying dependencies
- Seeing the big picture

**Note**: Roadmap view requires date fields. Add "Start date" and "Target date" custom fields if using this view.

---

### View 3: Work Board (Kanban)

**Purpose**: Daily work tracking for Stories and Tasks

**Layout**: Board

**Column by**: Status

**Columns**: No Status → Todo → In Progress → Blocked → Done

**Fields visible on cards**:
- Title
- Assignees
- Type
- Parent issue

**Filters**: `type:Story OR type:Task` (exclude Epics)

**WIP limit**: Consider limiting "In Progress" to 1-2 items

**Use cases**:
- Daily standup
- Seeing what's actively being worked on
- Moving work through the workflow
- Identifying blockers quickly

**Why exclude Epics?**
- Epics don't move through workflow states
- They track overall progress, not day-to-day work
- Keeps the board focused on actionable items
- Reduces visual clutter

---

### View 4: Epic Board (Optional)

**Purpose**: High-level portfolio view of all Epics

**Layout**: Board

**Column by**: Status

**Columns**: Backlog → Planned → In Progress → Done

**Fields visible on cards**:
- Title
- Assignees
- Sub-issues progress
- Milestone

**Filters**: `type:Epic` (only show Epics)

**Use cases**:
- Portfolio management
- Seeing all major initiatives at once
- Tracking Epic progress
- Strategic planning sessions
- Stakeholder updates

**Why separate Epic Board?**
- Different cadence: Epics move slower than Stories/Tasks
- Different audience: Managers/stakeholders vs. implementers
- Different granularity: Strategic vs. tactical
- Prevents Epic cards from cluttering the Work Board

**When to use**:
- ✅ Managing 5+ Epics simultaneously
- ✅ Multiple teams working on different Epics
- ✅ Need to report status to stakeholders
- ✅ Long-running project (6+ months)

**When to skip**:
- ❌ Only 1-2 Epics total
- ❌ Solo developer
- ❌ Short project (< 1 month)
- ❌ Work Board + Table view is sufficient

---

### View Naming Convention

Recommended names:
- **Issues** (Table view)
- **Roadmap** (Roadmap view)
- **Work** or **Kanban** (Work Board)
- **Epics** (Epic Board, if used)

**Why clear names?**
- "View 1", "View 2" are meaningless
- Clear purpose at a glance
- Easy to navigate for new team members
- Matches common vocabulary

---

## Setup Automation with AI Assistants

### Recommended: Use AI Assistance for Setup

Setting up GitHub Projects with the correct views, fields, and configurations is tedious and error-prone when done manually. **Strongly recommend using an AI assistant** to automate this.

### Using Claude Code with BrowserMCP

**What it can do:**
- Create custom fields (Type, Phase, Priority, Effort)
- Set field values and colors
- Create labels (phase-1, epic, type:impl, etc.)
- Create issues with proper hierarchy (Epic → Phase → Story → Task)
- Configure project views (Table, Roadmap, Board)
- Set up filters and field visibility on cards
- Link parent/child relationships

**How to use:**

1. **Install BrowserMCP** (or similar browser automation tool for Claude)
   - Allows Claude to interact with GitHub's web UI
   - Necessary for view configuration (not available via API)

2. **Provide this document** to Claude:
   ```
   "Set up a GitHub Project following docs/github-issue-strategy.md"
   ```

3. **Claude will**:
   - Create labels via `gh` CLI
   - Create custom fields via GraphQL API
   - Create issues via `gh issue create`
   - Use BrowserMCP to configure views (filters, columns, etc.)
   - Set field values and colors via UI (not available in API)

4. **You verify**:
   - Check project board looks correct
   - Verify issue hierarchy
   - Test filters work as expected

**Benefits:**
- ✅ **Consistent**: Same setup every time
- ✅ **Fast**: Minutes instead of hours
- ✅ **Documented**: All decisions captured in this doc
- ✅ **Reproducible**: Easy to set up new projects
- ✅ **Less error-prone**: AI follows instructions exactly

**Limitations:**
- ⚠️ Some GitHub features only available via web UI (views, colors)
- ⚠️ Requires browser automation tool (BrowserMCP, Playwright, etc.)
- ⚠️ May need manual verification/tweaking

### Alternative: Manual Setup

If you can't use AI assistance, follow the manual steps in the sections below.

**Time estimate**: 30-60 minutes for full setup

**Checklist**:
- [ ] Create project
- [ ] Create custom fields (Type, Phase, Priority, Effort)
- [ ] Create labels (epic, phase-1 through phase-5, type labels)
- [ ] Set field colors (Purple/Blue/Orange for Type)
- [ ] Create Epic issue
- [ ] Create Phase issues
- [ ] Link Phase issues to Epic (task list)
- [ ] Set Type field values on all issues
- [ ] Create views (Issues, Roadmap, Work, Epics)
- [ ] Configure filters and visible fields per view
- [ ] Test everything works

### Alternative: Scripted Setup via gh CLI

**What's possible via CLI/API:**
- ✅ Create project: `gh project create`
- ✅ Create labels: `gh label create`
- ✅ Create custom fields: `gh project field-create`
- ✅ Create issues: `gh issue create`
- ✅ Add issues to project: `gh project item-add`
- ✅ Set field values: `gh project item-edit`

**What requires web UI or BrowserMCP:**
- ❌ Configure view layouts (Table, Board, Roadmap)
- ❌ Set field colors (single-select options)
- ❌ Configure field visibility on cards
- ❌ Set up filters on views
- ❌ Reorder fields/columns

**Hybrid approach:**
1. Use `gh` CLI for labels, fields, issues
2. Use web UI or BrowserMCP for views and colors
3. Document your CLI commands for reproducibility

---

## GitHub Project Board

### Setup

1. **Create Project** (via UI or CLI)
   ```bash
   gh project create --title "Forge Module System" --owner jdillon
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

### Create Parent-Child Relationships

GitHub supports native parent-child issue relationships via the GraphQL API.

**Method 1: GraphQL API (Recommended)**

```bash
# Get the GraphQL node IDs
PARENT_ID=$(gh issue view 2 --repo owner/repo --json id --jq ".id")
CHILD_ID=$(gh issue view 12 --repo owner/repo --json id --jq ".id")

# Create the parent-child relationship
gh api graphql -H "GraphQL-Features: sub_issues" -f query="
mutation {
  addSubIssue(input: {
    issueId: \"$PARENT_ID\",
    subIssueId: \"$CHILD_ID\"
  }) {
    issue { title }
    subIssue { title }
  }
}"
```

**Method 2: Bash Helper Function**

```bash
gh_add_subissue() {
    local parent_num=$1
    local child_num=$2
    local repo=${3:-"owner/repo"}  # Optional repo parameter

    local parent_id=$(gh issue view "$parent_num" --repo "$repo" --json id --jq ".id")
    local child_id=$(gh issue view "$child_num" --repo "$repo" --json id --jq ".id")

    gh api graphql -H "GraphQL-Features: sub_issues" -f query="
    mutation {
      addSubIssue(input: {
        issueId: \"$parent_id\",
        subIssueId: \"$child_id\"
      }) {
        issue { title }
        subIssue { title }
      }
    }"
}

# Usage: gh_add_subissue 2 12 jdillon/forge
```

**Method 3: Third-Party Extension**

```bash
# Install the extension
gh extension install agbiotech/gh-sub-issue

# Add a sub-issue
gh sub-issue add <parent-number> <child-number>
```

**Remove Sub-Issue Relationship**

```bash
PARENT_ID=$(gh issue view 2 --repo owner/repo --json id --jq ".id")
CHILD_ID=$(gh issue view 12 --repo owner/repo --json id --jq ".id")

gh api graphql -H "GraphQL-Features: sub_issues" -f query="
mutation {
  removeSubIssue(input: {
    issueId: \"$PARENT_ID\",
    subIssueId: \"$CHILD_ID\"
  }) {
    issue { title }
  }
}"
```

**Important Notes:**

1. **GraphQL Feature Header Required**: The `GraphQL-Features: sub_issues` header is required
2. **ID vs Number**:
   - `gh issue view --json id` returns the GraphQL node ID (e.g., `I_kwDOQMbpzM7U84L8`)
   - Issue numbers are what you see in the UI (e.g., `#2`, `#12`)
3. **Cross-repo Support**: You can create relationships across repositories within the same organization
4. **Nesting Limit**: Up to 50 sub-issues per parent, with up to 8 levels of nesting
5. **Alternative to Task Lists**: This creates formal parent-child relationships, whereas `- [ ] #10` in issue body creates task list items (both work, formal relationships show in UI sidebar)

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

# Move issue to different status (e.g., "In Progress")
# Step 1: Get all the required IDs
gh api graphql -f query='
  query {
    user(login: "jdillon") {
      projectV2(number: 3) {
        id
        field(name: "Status") {
          ... on ProjectV2SingleSelectField {
            id
            options {
              id
              name
            }
          }
        }
        items(first: 100) {
          nodes {
            id
            content {
              ... on Issue {
                number
              }
            }
          }
        }
      }
    }
  }
' --jq '.data.user.projectV2 | {projectId: .id, statusFieldId: .field.id, inProgressId: (.field.options[] | select(.name == "In Progress") | .id), itemId: (.items.nodes[] | select(.content.number == 10) | .id)}'

# Step 2: Update the status using the IDs from above
gh project item-edit \
  --id <item-id> \
  --project-id <project-id> \
  --field-id <status-field-id> \
  --single-select-option-id <option-id>

# Example (for issue #10 on Forge Roadmap project):
gh project item-edit \
  --id PVTI_lAHNTpLOARt9es4IJgNB \
  --project-id PVT_kwHNTpLOARt9eg \
  --field-id PVTSSF_lAHNTpLOARt9es4N8rpG \
  --single-select-option-id 47fc9ee4

# Verify status changed
gh issue view 10 --json projectItems --jq '.projectItems[0].status.name'
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
