# CLI Refactoring

**Status**: Planning phase
**Goal**: Simplify cli.ts and make Forge a proper facade

## Quick Reference

### Problem
cli.ts is doing too much (~470 lines):
- Bootstrap, config loading, project discovery
- Symlink management, dependency installation
- CLI building, command execution
- Error handling

### Solution
Split into focused modules:

```
cli.ts (~100 lines)
  ↓ bootstrap args
config-resolver.ts (NEW)
  ↓ ResolvedConfig
cli.ts
  ↓ initLogging
  ↓ new Forge(config)
core.ts (Forge)
  ↓ loads builtins, modules, deps
  ↓ throws ExitNotification if restart needed
cli.ts
  ↓ buildCLI(program)
  ↓ execute
```

## Documents

- **plan.md** - Full refactoring plan with architecture, responsibilities, implementation steps
- **discussion.md** - Original Q&A that led to this plan

## Key Decisions

1. **Config resolver** - New module, no/minimal logging, returns ResolvedConfig
2. **Forge owns init** - Module loading, dependency sync, builtin loading
3. **CLI owns exit** - Catches ExitNotification, calls process.exit()
4. **Symlink in Forge** - During module loading, isolated helper
5. **Restart via exception** - ExitNotification pattern

## Implementation Order

1. Create config-resolver.ts
2. Update cli.ts (remove logic, add orchestration)
3. Update Forge (accept ResolvedConfig, throw ExitNotification)
4. Test everything

## Deferred (Future)

- Full config merge strategy
- Extended ENV var support
- Bootstrap logger
- Builtin project-context filtering
- CLI option conflict validation

## Context

~55% token usage at planning phase. This documentation preserves the refactoring discussion and decisions for context reset/resume scenarios.
