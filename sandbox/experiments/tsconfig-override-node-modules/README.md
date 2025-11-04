# Experiment: tsconfig Override node_modules Resolution

**Goal:** Verify that Bun respects tsconfig paths to override module resolution, even when `node_modules` exists in parent directories.

**Problem:** Test fixtures import `@planet57/forge/logger`, Bun resolves via package self-reference to parent `node_modules`, creating duplicate logger instances.

**Test:** Can tsconfig paths force resolution to a specific location?

## Setup

```
sandbox/experiments/tsconfig-override-node-modules/
├── README.md (this file)
├── findings.md (results)
├── test-fixture/
│   ├── node_modules/          # Simulates fixture's own dependencies
│   ├── tsconfig.json          # Path overrides pointing to ../../mock-forge
│   └── test.ts                # Imports @planet57/forge/logger
└── mock-forge/
    └── logger.ts              # Mock logger with unique ID
```

## Success Criteria

1. `test.ts` imports `@planet57/forge/logger`
2. Bun resolves to `mock-forge/logger.ts` (NOT parent node_modules)
3. Logger has expected unique ID proving correct resolution
4. No errors, no fighting with Bun

## Questions to Answer

- Does tsconfig paths override node_modules resolution?
- Does this work reliably or require hacks?
- Is this the right strategy for Phase 3?
