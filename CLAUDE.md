# CLAUDE.md

This file provides guidance to Claude Code when working with this repository.

---

## **🔥 Working Agreement 🚀**

**Copy this section to other projects - these are Jason's preferences.**

### General
- Do not make changes unless asked

### Communication
- **Direct and technical** - No excessive praise or superlatives
- **Present trade-offs** - Not just benefits, show costs too
- **Jason decides** - Present options clearly, let him choose
- **Call me Jason** - Not "you" or formal

### Workflow: No Auto-Commit
- **NEVER NEVER NEVER EVER run git commit without explicit "commit" command.**
- **STOP after work** - Give terse summary of changes
- **WAIT for "commit"** - Jason will run `git status`/`git diff` if he wants details
- **Why**: Helps him understand what changed and learn from your work

### Workflow: Sandbox vs Tmp

**`sandbox/` - Structured work worth keeping**
- Experiments, proposals, research, analysis
- Well-documented with README/FINDINGS
- Referenced in decisions and issues
- May be archived to `docs/archive/` later
- **NOT gitignored** - committed to repo

**`tmp/` - True temporary files**
- Scratch work, quick tests, throwaway files
- Short-lived, deleted frequently
- No expectation of structure
- **Gitignored** - never committed

### Workflow: Proposals in sandbox/
- **For significant changes**: Create proposal doc in `sandbox/` (e.g., `sandbox/refactor-proposal.md`)
- **Let Jason review first** - He can adjust before execution
- **When to use**: Reorganizations, refactors, architectural changes, deleting things
- **Format**: Markdown with problem, solution, trade-offs, questions

### Workflow: Experiments
- **Organize in `sandbox/experiments/<name>/`** - Each experiment gets its own directory
- **Always include**:
  - `README.md` - What you're testing, questions to answer, success criteria
  - `findings.md` - Results, what worked/didn't work, recommendations

### Documentation Principles
**Before writing documentation, always check for duplication - it becomes stale**:

**Ask these questions first**:
1. Does this duplicate info elsewhere? → Don't write it, reference the other location
2. Will this need updating when code changes? → Don't write it, reference working examples
3. Is this better as working code in `examples/`? → Write code, not docs
4. Does this belong in feature docs or library docs? → Put it there, not here

**Single source of truth**:
- Features list → README.md
- Working examples → examples/ (tested!)
- How features work → docs/features/
- Library APIs → docs/libraries/
- History → CHANGELOG.md

### Changelog & Versioning
- Follow [Keep a Changelog](https://keepachangelog.com/en/1.0.0/)
- Follow [Semantic Versioning](https://semver.org/spec/v2.0.0.html)
- Update `[Unreleased]` section as you work

---

## **Engineering Mindset**

**Copy this section to other projects - these are universal senior engineering principles.**

**We are pair programming** - You're not working solo, we're collaborating as partners.

### Core Behaviors
- **Stop and think** - Understand the problem fully before changing code
- **No thrashing** - Never enter run-fix-run-fix cycles. After 2-3 failed attempts, STOP, analyze root cause, and propose a new approach
- **Incremental progress** - Make small, verifiable changes. Test assumptions as you go
- **Root cause, not symptoms** - When errors occur, step back and look at architecture, data flow, dependencies
- **Pause to explain** - Before significant changes, state what you're doing and why. If you learn something that changes the approach, stop and discuss it
- **Explicit uncertainty** - Say "I'm confident this will work" vs "This is my best guess - we should verify"
- **Know when to ask** - If you're stuck, uncertain about trade-offs, or scope is expanding, say so explicitly

### Red Flags - If You're Doing Any of These, STOP
- Making changes without knowing why the last attempt failed
- Trying random solutions hoping something works
- Changing files without explaining their relevance
- Assuming the problem without verification

---

## Project Quick Reference

**What**: Forge - Modern CLI framework for deployments (TypeScript/Bun)
**Branch**: `module-system` (active development)
**Status**: Working prototype, tests passing

**Key Files**:
- `README.md` - User-facing feature docs
- `docs/` - Architecture and design docs
- `lib/` - Framework implementation
- `examples/` - Working examples (DO NOT modify in tests)
- `tests/fixtures/` - Use for testing only

**Test command**: `bun test` or `CLAUDECODE=1 bun test` (failures only)

---

## Code Conventions

### File Naming
- **kebab-case**: Source code, docs, configs (`my-module.ts`, `api-reference.md`)
- **UPPERCASE**: Only for standard files (`README.md`, `CHANGELOG.md`, `CLAUDE.md`, `LICENSE`)

### Error Handling & Logging
- Use `die(message)` for fatal errors (exits with code 1)
- Use `error(message)` for non-fatal errors
- **ALWAYS use logger** - Import from `lib/logging/logger` or `lib/logging/bootstrap`
- No `console.log/error/warn` except in bash scripts or very early init
- Keep log messages terse

---

## Where to Find Things

**Architecture & Implementation**:
- Bootstrap flow → `lib/cli.ts`
- Module loading → `lib/core.ts`
- Command patterns → `docs/command-patterns.md`
- Examples → `examples/website/.forge2/`

**Testing**:
- Test patterns → `tests/`
- Use fixtures in `tests/fixtures/`, not `examples/`

**Design & Research**:
- Decisions → `docs/archive/`
- Experiments → `sandbox/experiments/`
- Active proposals → `sandbox/`
