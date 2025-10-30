# Session Summary: Forge Framework Redesign

**Date**: 2025-10-29
**Context**: Continuation from previous session handoff, exploring next-gen forge framework design

---

## TL;DR - The Big Picture

**Goal**: Redesign forge framework to:
1. ✅ Install once (git clone to `~/.forge`), use from anywhere
2. ✅ Run from any subdirectory (CWD-aware like git)
3. ✅ Share modules across projects (eliminate duplication)
4. ✅ Solve OUTPUT_PATTERN problem (bash's stdout/stderr hack)
5. ✅ Keep simple for users to add commands

**Current Problem**: Forge is embedded per-project, modules duplicated, must run from project root, OUTPUT_PATTERN hack required.

**Solution Direction**: Git-based install + CWD discovery + shared modules + (Bash 5 OR Bun hybrid)

---

## Key Discoveries This Session

### 1. The OUTPUT_PATTERN Problem is Significant

**What it is**: Bash functions can't return strings, only exit codes (0-255). To return strings, we use command substitution `$(func)` which captures stdout. This forces ALL user messages to stderr to avoid corrupting returns.

**Current hack**:
```bash
function get_value {
  println "Getting..." >&2  # MUST use stderr
  echo "result"             # stdout for return
}
```

**This is painful** and violates Unix conventions (stderr should be for errors only).

### 2. Bun Changes Everything

**Discovery**: Bun has a `$` template literal operator that makes command execution almost as easy as Bash:

```typescript
await $`terraform apply`;
const output = await $`aws s3 ls`.text();
```

This wasn't in original evaluation - Bun is a **game-changer** for TypeScript viability.

### 3. Language Options Narrowed

**Evaluated**: Bash, Python, Ruby, Go, Rust, TypeScript (Node/Deno/Bun)

**Eliminated**:
- ❌ Go/Rust (no dynamic extensibility - users can't just add commands)
- ❌ Ruby (declining, slower startup)
- ❌ Node/Deno (verbose command execution)

**Top Contenders**:
1. **Bun + TypeScript** (42/50) - Fast, `$` operator, type-safe
2. **Bash 5 + nameref** (with helper library) - Solves OUTPUT_PATTERN
3. **Bash + Bun hybrid** - Best of both worlds?

### 4. Bash 5 Nameref Pattern

**Solution to OUTPUT_PATTERN**:
```bash
function get_value {
  local -n out=$1       # First param is variable NAME
  println "Getting..."  # stdout free!
  out="result"          # modifies caller's variable
}

local value
get_value value        # pass NAME not value
echo "Got: $value"
```

**Solves the hack** but more verbose than Python/TS real returns.

---

## Jason's Key Decisions (from QUESTIONS_FOR_JASON.md)

### Installation & Distribution
- ✅ Git clone to `~/.forge` (like jenv/tfenv)
- ✅ Auto-update important (check daily, don't auto-apply)
- ✅ Manual install + update command (`forge update`)
- ⚠️ Consider `~/.config/forge` or `~/.local` (modern locations)

### Project Structure
- ✅ `~/.forge/` for install (hidden)
- ✅ `project/forge/` for project config (visible, not hidden)
- ✅ Git-based module distribution
- ✅ Backward compat not critical ("change has a cost! thats okay")

### Config Discovery
- ✅ Walk up directory tree (like git)
- ✅ CLI flag override: `forge --root=/path`
- ✅ Env var override: `FORGE_PROJECT=/path`
- ✅ Nested projects: like git (stops at first found)

### Module System
- ✅ Hybrid search: project > user > system
- ✅ Explicit loading: `load_module aws`
- ✅ Module dependencies: explicit requires
- ✅ Git-based install/update/remove
- ❌ No complex versioning (use git branches/tags)

### State Management
- ✅ Structured (JSON or YAML)
- ✅ Both project-wide + user-specific
- ⚠️ Rethink "current env" storage (might be risky)
- 💡 "state was/is per-user, config is project/global"

### Help & Discovery
- ✅ Simple descriptions + usage
- ✅ Optional full help (not commando verbosity)
- ⚠️ "Commando man pages were hard to maintain, felt painful"

### Priority Ranking
1. CWD-aware config discovery
2. Shared module repository
3. Auto-update mechanism
4. Shell completion
5. Better error handling
6. Help system
7. Testing support (low - "I'm lazy")
8. Module versioning (via git)

### Other Preferences
- ✅ Debug mode important (`forge --debug`)
- ✅ Completion important (Phase 2)
- ✅ Keep name "forge"
- ✅ Unix only (screw Windows)
- ✅ Open source (GitHub, ASL2, not super polished)
- ✅ **"lets explore options in prototypes"** ⭐

---

## Current Direction: Hybrid Approach

**Latest request**:
> "Lets dig into what a hybrid would look like first. Make an overview of how bash + bun or bash + python might work; including how to get it installed."

### Hybrid Architecture Concept

```
~/.forge/
├── bin/
│   └── forge               # Bash wrapper/framework
├── lib/
│   ├── core.bash           # Bash helper library
│   ├── aws.bash            # Bash module
│   └── kubernetes/         # Module bundle
│       ├── module.bash     # Bash interface
│       └── helpers.ts      # Bun helper scripts
└── runtime/
    └── bun                 # Bundled bun binary?

project/forge/
├── config.bash             # Load modules
├── commands.bash           # Bash commands
└── scripts/
    └── analyze.ts          # Bun scripts when needed
```

### Key Questions for Prototype

1. **Installation**: How to install Bun without sudo/complexity?
2. **Modularity**: How do bash and bun parts talk to each other?
3. **Simple commands**: When to use bash vs bun?
4. **Real use case**: Use cirqil.com website as example

---

## Most Relevant Docs to Review

### Must Read (In Order)

1. **`SESSION_HANDOFF.md`** - Previous session context, initial analysis
2. **`ANSWERS_TO_QUESTIONS.md`** - Comprehensive answers to all your questions today
3. **`LANGUAGE_SYNTAX_COMPARISON.md`** - Side-by-side comparison of Bash/Python/Bun/Ruby with real examples
4. **`DESIGN_PLAN_BASED_ON_ANSWERS.md`** - Implementation plan based on your preferences

### Important Deep Dives

5. **`OUTPUT_PATTERN.md`** - The stdout/stderr problem explained
6. **`REPLY_VS_NAMEREF_EXPLAINED.md`** - How Zsh/Bash 5 solve OUTPUT_PATTERN
7. **`SHELL_IMPROVEMENTS_AND_HYBRID.md`** - Bash 5 features, helper library concept, hybrid architecture
8. **`RETHINKING_LANGUAGE_CHOICE.md`** - Why OUTPUT_PATTERN changes the recommendation

### Background Context

9. **`COMMANDO_ANALYSIS.md`** - Feature-by-feature analysis of commando
10. **`FORGE_ANALYSIS.md`** - Feature-by-feature analysis of forge
11. **`LANGUAGE_EVALUATION.md`** - Original language comparison (pre-Bun discovery)
12. **`FRAMEWORK_COMPARISON.md`** - From previous session handoff

### Supporting Docs

13. **`HELP_AND_COMPLETION.md`** - Help system and completion strategies
14. **`NAMING.md`** - Naming brainstorm (conclusion: keep "forge")
15. **`RECOMMENDATIONS.md`** - Original comprehensive recommendations
16. **`QUESTIONS_FOR_JASON.md`** - All questions with your answers (prefixed with ">")

---

## Next Steps - Where We Left Off

**Your request**:
> "Lets start with a very simple framework that shows modularity, simple commands, and install by git stuff with bun. Then see if I hate that or not?"

### Prototype Plan

**Goal**: Minimal Bun prototype to evaluate feel

**Features to show**:
1. ✅ Git clone install
2. ✅ CWD-aware discovery
3. ✅ Module loading
4. ✅ Simple commands (TypeScript)
5. ✅ Real use case from cirqil.com website

**Approach**:
- Create `forge2` command (parallel to current forge)
- Use `.forge2/` directories (avoid conflicts)
- Small enough to rule in/out quickly
- Based on real cirqil/website use cases

**Decision Point**: Love it or hate it?
- ❤️ Love it → Continue with Bun
- 😐 Meh → Try Bash 5 + helper library
- 🤔 Complicated → Try pure Bash 5

---

## Key Open Questions

### For Hybrid Approach

1. **Bun installation**: How to bootstrap without manual install?
   - Bundle bun binary in repo?
   - Auto-download on first run?
   - Require manual install?

2. **When to use Bun vs Bash**:
   - Framework: Bash or Bun?
   - Simple commands: Bash or Bun?
   - Complex logic: Always Bun?

3. **Module bundles**:
   - Can mix .bash and .ts files?
   - How to load/call between them?

### For Bun Prototype

4. **Command pattern**:
   - Export functions from .ts?
   - Class-based? Object-based?
   - How to keep "just add a function" simplicity?

5. **Real use case**:
   - Which cirqil.com website commands to replicate?
   - `website_sync`? `website_invalidate`? `website_publish`?

---

## The Fundamental Trade-off

| Approach | Command Execution | Real Returns | Complexity | User Extensibility |
|----------|------------------|--------------|------------|-------------------|
| **Pure Bash 5** | ✅✅✅ Perfect | ⚠️ Nameref hack | ✅ Simple | ✅ Just add function |
| **Pure Bun** | ✅✅ `$` operator | ✅ Native | ⚠️ Moderate | ✅ Export function |
| **Bash + Bun** | ✅✅✅ Bash wins | ✅ Bun wins | ⚠️⚠️ Complex | ⚠️ Two languages |

**Your call**: Which trade-off feels right?

---

## Prototype Decision Tree

```
1. Build minimal Bun prototype
   ├─ Love it? → Build Bash + Bun hybrid
   ├─ Hate it? → Try Bash 5 + nameref
   └─ Uncertain? → Build both, compare

2. Test with real use case (cirqil.com website)
   ├─ Easy to add commands?
   ├─ Fast enough?
   └─ Maintainable?

3. Make final decision
   ├─ Pure Bash 5?
   ├─ Pure Bun?
   └─ Bash + Bun hybrid?
```

---

## What to Build First

**Immediate next step**: Create minimal Bun prototype

**Structure**:
```
forge2/                    # Prototype repo
├── README.md              # Installation instructions
├── bin/
│   └── forge2             # Main entry point (TypeScript)
├── lib/
│   ├── core.ts            # Framework core
│   └── aws.ts             # Example module
├── examples/
│   └── website/           # Based on cirqil.com
│       ├── forge2/
│       │   ├── config.ts
│       │   └── commands.ts
│       └── README.md
└── package.json
```

**Install test**:
```bash
git clone https://github.com/jdillon/forge2 ~/.forge2
export PATH="$HOME/.forge2/bin:$PATH"

cd ~/project
forge2 deploy staging  # Works from anywhere!
```

---

## Summary for Context Reset

**Where we are**: Deep analysis complete, decisions made, ready to prototype

**What we learned**:
- Bun's `$` operator is game-changing
- OUTPUT_PATTERN is a significant pain point
- Bash 5 nameref solves it but not as clean as real returns
- Hybrid approach is intriguing but adds complexity

**What you want**:
- Simple Bun prototype to evaluate feel
- Git-based install without sudo/fuss
- Real use case (cirqil.com website)
- Parallel install (forge2) to test safely

**Next action**: Build minimal Bun prototype showing:
1. Git clone install
2. CWD-aware discovery
3. Module loading
4. Simple commands
5. Real example from your website project

**Decision point**: Love it, hate it, or need more data?

---

## Quick Reference: Command Syntax Comparison

**Bash (current)**:
```bash
aws s3 sync . "s3://$bucket/"
dist_id=$(aws cloudfront list-distributions ...)
```

**Bun**:
```typescript
await $`aws s3 sync . s3://${bucket}/`;
const distId = await $`aws cloudfront list-distributions ...`.text();
```

**Winner**: Basically tied - Bun is almost as easy as Bash!

**That's why Bun is viable.** ⭐

---

Ready to build the prototype when you are! 🚀
