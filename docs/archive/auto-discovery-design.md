# Command Auto-Discovery Design

## Problem

Current config.ts requires manually mapping all commands:
```typescript
commands: {
  build: website.build,
  sync: website.sync,
  ...examples,
}
```

This is boilerplate. We want config.ts to be **declarative** - just list modules.

## Proposed Solution

### Config.ts (Declarative)
```typescript
export default {
  // Just list module files to load
  modules: [
    './website',
    './examples'
  ]
}
```

### Framework Auto-Discovery

Framework loads each module and discovers commands:

```typescript
async function loadModule(modulePath: string): Promise<Record<string, ForgeCommand>> {
  const module = await import(modulePath);
  const commands: Record<string, ForgeCommand> = {};

  // Check for default export (object of commands)
  if (module.default && typeof module.default === 'object') {
    Object.assign(commands, module.default);
  }

  // Check all named exports
  for (const [name, value] of Object.entries(module)) {
    if (name === 'default') continue;

    // Is it a ForgeCommand? (has description + execute)
    if (isForgeCommand(value)) {
      commands[name] = value as ForgeCommand;
    }
  }

  return commands;
}

function isForgeCommand(obj: any): boolean {
  return obj
    && typeof obj === 'object'
    && typeof obj.description === 'string'
    && typeof obj.execute === 'function';
}
```

## Module Patterns Supported

### Pattern 1: Named Exports
```typescript
// website.ts
export const build: ForgeCommand = { ... };
export const sync: ForgeCommand = { ... };
export const deploy: ForgeCommand = { ... };
```
→ Commands: `build`, `sync`, `deploy`

### Pattern 2: Default Export (Object)
```typescript
// examples.ts
export default {
  hello: { description: '...', execute: ... },
  version: { description: '...', execute: ... }
};
```
→ Commands: `hello`, `version`

### Pattern 3: Both (for flexibility)
```typescript
// commands.ts
export const build = { ... };
export const sync = { ... };

export default {
  build,
  sync,
  'special-name': { ... }  // Can use custom names in default export
};
```
→ Commands from both named and default exports (default wins if conflict)

## Command Naming

Command names come from:
1. Named export name: `export const build` → `build`
2. Default export keys: `{ hello: ... }` → `hello`

For kebab-case names, use default export:
```typescript
export default {
  'get-config': getConfig,
  'clear-cache': clearCache
};
```

## Benefits

✅ **Less boilerplate** - no manual command mapping
✅ **Auto-discovery** - export a command, it's available
✅ **Flexible** - supports multiple patterns
✅ **Clear** - config.ts is just module list
✅ **Type-safe** - TypeScript ensures exports are valid

## Migration

### Before
```typescript
// config.ts
import * as website from './website';
import examples from './examples';

export default {
  commands: {
    build: website.build,
    sync: website.sync,
    ...examples
  }
};
```

### After
```typescript
// config.ts
export default {
  modules: [
    './website',
    './examples'
  ]
};
```

Much simpler!

## Implementation Changes

1. **Update `ForgeConfig` interface**
   ```typescript
   export interface ForgeConfig {
     modules: string[];  // Module paths to load
     defaultCommand?: string;
   }
   ```

2. **Update `Forge.loadConfig()`**
   - Load config.ts
   - For each module in `modules`, call `loadModule()`
   - Auto-discover commands via duck typing
   - Build `this.config.commands` map

3. **No changes to command files** - they already export ForgeCommand objects

## Edge Cases

**Q: What if two modules export same command name?**
A: Last module wins (like object spread). Could add warning.

**Q: Can I override a command from a module?**
A: Yes, add it to config.ts after modules load. Or create local module that re-exports with changes.

**Q: What about built-in commands like 'help'?**
A: Framework could provide built-in module: `'@forge/builtins'`

**Q: How to exclude a command from a module?**
A: Don't export it, or create wrapper module that re-exports only what you want.

## Next Steps

1. Update `ForgeConfig` interface
2. Implement `loadModule()` with auto-discovery
3. Update `Forge.loadConfig()` to use modules array
4. Simplify config.ts in example
5. Test that all commands still work
