# Research: Deno as Alternative Runtime

**Status:** Planned
**Priority:** High
**Date:** 2025-11-03
**Context:** Evaluate if Deno could replace Bun, solving module resolution issues

---

## Goal

Determine if Deno is a viable alternative to Bun for Forge v2 runtime, focusing on:
1. **Control** - Can we manage package resolution the way we need?
2. **Shell scripting** - How close is dax to Bun's `$` syntax?
3. **Performance** - Is it fast enough for a CLI tool?
4. **Ecosystem** - Do our dependencies work?
5. **Package management** - Can we control deps installation/resolution?

---

## Research Tasks

### Phase 1: Documentation Review (2-3 hours)

**Read Deno docs:**
- [ ] Import maps - full capabilities and limitations
- [ ] Scopes - how granular can we get?
- [ ] npm: prefix - what works, what doesn't?
- [ ] Module resolution algorithm
- [ ] Package management (deno add, deno install)
- [ ] Configuration (deno.json vs package.json)

**Read dax docs:**
- [ ] Shell command syntax and features
- [ ] Cross-platform compatibility
- [ ] Built-in commands vs system commands
- [ ] Comparison with Bun shell
- [ ] Performance characteristics

**Questions to answer:**
- Can we control where packages are installed?
- Can we use a "forge home" pattern?
- Can different projects share dependencies?
- How do scopes interact with nested imports?
- What's the permission model impact on CLI tools?

**Deliverable:** `tmp/deno-docs-review.md` with findings

---

### Phase 2: Feature Comparison (3-4 hours)

**Create comparison matrix:**
```
| Feature | Bun | Deno | Notes |
|---------|-----|------|-------|
| Shell syntax | Built-in $ | dax $ | ... |
| Import control | Limited | Import maps | ... |
| ... | ... | ... | ... |
```

**Categories to compare:**
- Module resolution (breadth of control)
- Shell scripting (DX and features)
- Package management (installation, caching, sharing)
- TypeScript support (tsconfig, compilerOptions)
- File I/O APIs
- Subprocess/command execution
- Testing framework
- Performance (startup, runtime)
- Ecosystem compatibility (npm packages)
- Tooling (bundler, formatter, linter)

**Focus areas:**
- Things Forge specifically needs
- Current pain points with Bun
- Deal-breakers if missing

**Deliverable:** `tmp/deno-vs-bun-comparison.md`

---

### Phase 3: Proof of Concept (6-8 hours)

**Goal:** Build a minimal working prototype to validate assumptions

**Experiment 1: Shell Scripting with dax**
```typescript
// experiments/deno-shell/test.ts
import $ from "jsr:@david/dax";

// Test all shell patterns we use
await $`git status`;
await $`ls -la | grep test`;
const output = await $`echo hello`.text();

// Test piping, redirection
await $`cat file.txt | grep pattern > output.txt`;

// Test cross-platform commands
await $`pwd && ls && echo done`;
```

**Questions:**
- Does dax handle everything we need?
- Any syntax differences that matter?
- Performance acceptable?
- Cross-platform reliability?

---

**Experiment 2: Module Resolution Control**
```typescript
// experiments/deno-modules/deno.json
{
  "imports": {
    "@planet57/forge/": "./lib/",
    "cowsay": "npm:cowsay@1.6.0"
  },
  "scopes": {
    "./fixtures/": {
      "@planet57/forge": "npm:@planet57/forge@2.0.0"
    }
  }
}
```

```typescript
// experiments/deno-modules/fixtures/test.ts
import { log } from '@planet57/forge/logging';
import cowsay from 'cowsay';

// Does this resolve correctly?
log.info('Test from fixture');
console.log(cowsay.say({ text: 'Deno test' }));
```

**Questions:**
- Do scopes work as expected?
- Can we replicate our module loading pattern?
- Any gotchas with npm: prefix?
- Can we share deps across projects?

---

**Experiment 3: Package Management**
```bash
# experiments/deno-packages/

# Can we install to custom location?
deno add npm:chalk

# Where do packages go?
ls -la deno.json

# Can we share a "deno home" across projects?
# Set custom cache location?
DENO_DIR=/tmp/deno-home deno cache main.ts
```

**Questions:**
- Where are packages installed?
- Can we control installation location?
- How does caching work?
- Can we share dependencies?
- What's the equivalent of forge home?

---

**Experiment 4: Port One Module**

Pick a small, representative module from Forge:
- Has shell commands
- Uses file I/O
- Imports other modules
- Has tests

**Candidates:**
- `lib/logging/` - Core functionality, no shell
- `examples/website/.forge2/deploy.ts` - Uses shell, good test case

**Port it to Deno and measure:**
- Migration effort (time)
- Code changes required
- Things that break
- Things that improve
- Performance difference

---

**Experiment 5: Test Framework**
```typescript
// experiments/deno-testing/test.ts
import { assertEquals } from "jsr:@std/assert";

Deno.test("basic test", () => {
  assertEquals(1 + 1, 2);
});

Deno.test("async test", async () => {
  const result = await someAsyncFn();
  assertEquals(result, expected);
});
```

**Questions:**
- Can we replicate our test patterns?
- Is the test runner adequate?
- How does it compare to Bun's test?
- Any gaps or limitations?

---

**Deliverable:** `tmp/deno-poc-findings.md` with:
- What worked
- What didn't work
- Surprises (good and bad)
- Performance measurements
- Migration effort estimates

---

### Phase 4: Migration Plan (if viable) (2-3 hours)

**If POC is successful, create detailed migration plan:**

**Step-by-step approach:**
1. Infrastructure setup
   - deno.json configuration
   - Import maps for all dependencies
   - Test environment
2. Core modules (no dependencies)
   - logging, config, utils
3. Shell-heavy modules
   - Using dax
4. Integration modules
   - Module loader, CLI
5. Tests
   - Convert to Deno.test
6. Examples
   - Update and verify

**Estimate effort per area:**
- Module migration time
- Testing and validation
- Documentation updates
- Risk areas

**Risk analysis:**
- What could go wrong?
- Fallback plan if issues found
- Rollback strategy

**Deliverable:** `tmp/deno-migration-plan.md`

---

## Decision Criteria

### Must Have (Deal-breakers)

- ✅ Full control over module resolution
- ✅ Shell scripting that feels natural
- ✅ npm package compatibility (chalk, commander, etc.)
- ✅ TypeScript native support
- ✅ Reasonable performance (< 2x slower than Bun)
- ✅ Can implement "forge home" pattern
- ✅ Test framework adequate for our needs

### Should Have (Important but not blockers)

- ✅ Migration path is clear
- ✅ Effort is reasonable (< 2 weeks)
- ✅ Documentation is good
- ✅ Ecosystem is mature
- ✅ Active development/support

### Nice to Have (Bonuses)

- ✅ Better than Bun in some areas
- ✅ Built-in tools (bundler, formatter)
- ✅ Security model useful
- ✅ Web standards compliance

---

## Timeline

| Phase | Duration | When |
|-------|----------|------|
| 1. Docs Review | 2-3 hours | Day 1 AM |
| 2. Comparison | 3-4 hours | Day 1 PM |
| 3. POC Experiments | 6-8 hours | Day 2 |
| 4. Migration Plan | 2-3 hours | Day 3 |
| **Total** | **13-18 hours** | **3 days** |

Can be done in parallel with other work.

---

## Success Metrics

**Deno is viable if:**
1. Import maps solve our module resolution problems cleanly
2. dax provides equivalent shell scripting DX
3. All our npm dependencies work with npm: prefix
4. Performance is acceptable (within 2x of Bun)
5. Can implement shared dependency pattern
6. Migration effort is reasonable (< 2 weeks)

**Deno is better if:**
7. Solves problems Bun can't
8. Gives us more control overall
9. Feels less frustrating to work with
10. Migration benefits outweigh costs

---

## Questions to Answer

### Control & Configuration
- [ ] Can we control package installation location?
- [ ] Can we share dependencies across projects?
- [ ] Can we override resolution per directory?
- [ ] Can we mix local and remote modules?
- [ ] What's the equivalent of FORGE_NODE_MODULES?

### Developer Experience
- [ ] Is dax as ergonomic as Bun's $?
- [ ] Are there any syntax gotchas?
- [ ] How's the error messaging?
- [ ] Is the tooling good?
- [ ] Would the team enjoy using it?

### Ecosystem & Compatibility
- [ ] Do our 15+ npm dependencies work?
- [ ] Any known issues with packages we use?
- [ ] What about optional dependencies?
- [ ] Does it work with Commander.js, chalk, pino, etc.?

### Performance
- [ ] Startup time for CLI tool?
- [ ] Runtime performance for typical operations?
- [ ] Shell command execution speed?
- [ ] Test suite execution time?

### Package Management
- [ ] How does deno add/install work?
- [ ] Where are packages stored?
- [ ] Can we customize storage location?
- [ ] How does caching work?
- [ ] Can we pre-install dependencies?
- [ ] What's the upgrade story?

---

## Risks to Investigate

### Known Concerns
1. **Slower startup** - Deno historically slower than Bun
2. **npm compatibility** - Some packages may not work
3. **Migration effort** - Could be more work than expected
4. **Team learning curve** - Different APIs to learn
5. **Ecosystem gaps** - Fewer Deno-native packages

### Unknowns
1. Can we actually implement forge home pattern?
2. Will import map scopes work for nested imports?
3. Are there hidden gotchas with npm: prefix?
4. What's the real-world performance impact?
5. How reliable is dax cross-platform?

---

## Next Steps

**Immediate (Tonight/Tomorrow):**
- [x] Create this research plan
- [ ] Clean up tmp/ directory
- [ ] Review tmp/deno-vs-bun-reality-check.md

**Tomorrow:**
- [ ] Start Phase 1: Documentation review
- [ ] Read import maps docs thoroughly
- [ ] Read dax docs and examples
- [ ] Take notes in tmp/deno-docs-review.md

**This Week:**
- [ ] Complete Phase 2: Feature comparison
- [ ] Start Phase 3: POC experiments
- [ ] Build shell scripting POC
- [ ] Build module resolution POC

**Next Week (if viable):**
- [ ] Complete remaining POC experiments
- [ ] Create migration plan
- [ ] Make go/no-go decision

---

## Related Files

**This Research:**
- This file: `tmp/RESEARCH-deno-evaluation.md`
- Background: `tmp/deno-vs-bun-reality-check.md`

**Original Problems:**
- `tmp/bun-resolution-problem.md` - What we're trying to solve
- `tmp/custom-modules-dir-research.md` - Why config won't work
- `tmp/plugin-viability-plan.md` - Bun plugin alternative

**Module System Work:**
- `docs/wip/module-system/` - Phase 3 in progress
- Blocked by resolution issues

---

## Notes

- Don't rush this - it's a big decision
- Experiments are more valuable than documentation
- Real code reveals truth better than docs
- If Deno feels worse, Bun plugin is still an option
- If both fail, we simplify (dev-mode only testing)

**Keep asking:**
- Is this solving real problems?
- Is it worth the migration cost?
- Will it make development easier or harder?
- Are we trading one set of issues for another?
