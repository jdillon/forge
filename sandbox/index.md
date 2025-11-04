# sandbox/ Directory Index

**Purpose:** Structured work worth keeping - experiments, proposals, research, analysis
**Last Updated:** 2025-11-03

---

## About sandbox/

**sandbox/** contains well-documented, structured work that's referenced in decisions and issues:
- Experiments with README and FINDINGS
- Research and analysis documents
- Proposals for significant changes
- GitHub issue drafts

**This is NOT gitignored** - it's committed to the repo as valuable reference material.

For throwaway scratch work, use `tmp/` (which is gitignored).

---

## Experiments

Located in `sandbox/experiments/<name>/` - each with README and FINDINGS.

### test-plugin/
**Goal:** Test if Bun runtime plugins can intercept module resolution

**Result:** ❌ Plugins can't intercept module imports (fundamental limitation)

**Files:**
- `README.md` - What we were testing
- `findings.md` - Why it doesn't work
- `plugin.ts`, `transpiler-plugin.ts` - Test implementations

**Status:** Complete - proved plugins not viable

### deno-prototype/
**Goal:** Evaluate Deno as runtime alternative to Bun

**Results:**
- ✅ Import maps solve module resolution
- ✅ Shell scripting equivalent (dax)
- ✅ APIs have clear equivalents
- ⚠️ Git HTTPS requires tokens (but clone cache solves this!)

**Files:**
- `README.md` - Test overview
- `findings.md` - Complete evaluation results
- `cache-design.md` - Git clone cache architecture
- `test-*.ts` - Working test implementations
- `deno.json` - Configuration example

**Status:** Complete - viable option for future sprint

### bun-tsconfig-paths/
**Goal:** Test if Bun's tsconfig.json paths can control module resolution

**Result:** ✅ Works perfectly - same capability as import maps!

**Files:**
- `README.md` - Test overview
- `findings.md` - Complete results
- `tsconfig.json` - Configuration example
- `test.ts` - Working proof

**Status:** Complete - recommended solution for MVP

---

## Research & Analysis

### Module Resolution Problem
- **bun-resolution-problem.md** (9.3K) - Core problem analysis, 4 solution options
- **plugin-viability-plan.md** (15K) - Detailed plan for testing Bun plugin approach
- **custom-modules-dir-research.md** (8.1K) - Why Bun can't use custom module dirs

### Deno Evaluation
- **research-deno-evaluation.md** (11K) - Master plan for evaluating Deno
- **deno-vs-bun-reality-check.md** (13K) - Comprehensive comparison, decision framework

---

## GitHub Issues (Drafts)

- **gh-issue-git-clone-cache.md** - Git dependencies via clone-to-cache + import maps (Issue #21)
- **gh-issue-cache-management.md** - Git repository cache management system (Issue #22)

---

## Future Work

- **story-cd-command.md** (1.5K) - Future feature story for cd command

---

## Quick Reference

**The Solution:**
→ Git clone repos to cache (`~/.local/share/forge/repos/`)
→ Use import maps (tsconfig paths for Bun, deno.json for Deno)
→ Keeps SSH git support, solves module resolution

**Why it works:**
→ `sandbox/experiments/bun-tsconfig-paths/findings.md` - Bun solution
→ `sandbox/experiments/deno-prototype/cache-design.md` - Cache design
→ `sandbox/experiments/test-plugin/findings.md` - Why plugins don't work

**Implementation:**
→ `sandbox/gh-issue-git-clone-cache.md` - Main implementation (Issue #21)
→ `sandbox/gh-issue-cache-management.md` - Cache commands (Issue #22)

---

## What's in tmp/ now?

Only true temporary files:
- `tmp/pino-transport-demo.ts` - Quick test script
- `tmp/experiments/` - Empty directory (can be removed)

Everything structured and documented is here in `sandbox/`.
