# Work In Progress

Active development documentation. These documents evolve as we implement features, tracking decisions, gotchas, and learning along the way.

When complete, content is either:
- **Promoted** to `docs/features/` (user-facing how-to)
- **Archived** to `docs/archive/` (historical decisions)
- **Deleted** (no longer relevant)

---

## Active Projects

- **[module-system/](module-system/)** - Installation, upgrade, and module distribution system
  - **Spec**: [docs/planning/installation-and-module-system.md](../planning/installation-and-module-system.md)
  - **Status**: Phase 1 - Basic Installation & Local Modules
  - **Started**: 2025-10-31

---

## Directory Structure

```
docs/wip/<project-name>/
├── README.md           # Project overview, status, phase tracking
├── phase1-*.md         # Phase-specific implementation docs
├── phase2-*.md
└── decisions.md        # Key decisions made during implementation
```

---

## Usage

**During development:**
- Update phase docs as you work
- Track gotchas, learning, decisions
- Keep TODO lists and open questions

**After completion:**
- Extract user-facing docs to `docs/features/`
- Archive important decisions to `docs/archive/`
- Delete or archive the WIP directory
