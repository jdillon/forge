# Findings: tsconfig Paths Override node_modules

**Date:** 2025-11-03
**Status:** ✅ SUCCESS - Strategy validated

## Question

Can Bun's tsconfig paths reliably override module resolution, even when packages exist in `node_modules`?

## Answer

**YES.** tsconfig paths successfully override node_modules resolution in Bun.

## Test Setup

```
test-fixture/
├── node_modules/@planet57/forge/logger.ts  # WRONG_LOGGER (simulates parent node_modules)
├── tsconfig.json                            # paths: @planet57/forge/* → ../mock-forge/*
└── test.ts                                  # imports @planet57/forge/logger

mock-forge/
└── logger.ts                                # MOCK_FORGE_LOGGER (correct override)
```

## Results

```
✅ SUCCESS: tsconfig paths overrode node_modules resolution
   - node_modules has @planet57/forge (WRONG_LOGGER)
   - tsconfig paths override to mock-forge (CORRECT)
```

Bun respected the tsconfig paths mapping and resolved `@planet57/forge/logger` to `../mock-forge/logger.ts` instead of `node_modules/@planet57/forge/logger.ts`.

## Implications for Phase 3

**This proves the git clone cache strategy will work:**

1. ✅ tsconfig paths can override node_modules resolution
2. ✅ Fixtures can have their own node_modules without conflicts
3. ✅ We can control where `@planet57/forge/*` resolves to
4. ✅ Logger singleton problem is solvable

**Implementation path is clear:**
- Clone git repos to `~/.local/share/forge/repos/`
- Generate tsconfig.json with paths pointing to cache
- Module resolution works as expected
- No fighting with Bun

## Confidence Level

**High.** This is a simple, clean test that directly validates the core assumption. Bun's tsconfig paths work exactly as needed.

## Next Steps

Proceed with Phase 3 implementation using Bun + tsconfig paths strategy:
1. Implement git clone to cache
2. Generate tsconfig with paths
3. Test with real forge-standard dependency

## Recommendation

**Stick with Bun.** No need to switch to Deno - the tsconfig paths strategy works cleanly without hacks.
