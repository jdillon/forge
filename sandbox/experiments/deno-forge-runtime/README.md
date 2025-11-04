# Deno Runtime POC for Forge

**Goal:** Prove Deno can run Forge with import map control

## Success Criteria

- ✅ Forge command executes via Deno
- ✅ Import maps provide module resolution control
- ✅ Config file approach works (--config only, no env vars)
- ✅ Global cache works without conflicts

## Structure

```
deno-forge-runtime/
├── README.md           # This file
├── deno.json           # Config with import maps
├── bin/
│   └── forge-deno      # Wrapper script
└── lib/
    ├── cli.ts          # Minimal CLI entry
    ├── logger.ts       # Test import map resolution
    └── commands/
        └── version.ts  # Simple test command
```

## Testing

```bash
# Run via wrapper
./bin/forge-deno version

# Test import map resolution
./bin/forge-deno test-logger
```

## What We're Testing

1. **Deno execution** - Can Deno run our TypeScript?
2. **Import maps** - Can we control module resolution?
3. **Config control** - Does --config flag give us control?
4. **Dependencies** - Can we use npm packages via import maps?
