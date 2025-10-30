# Module Structure Design

## Goal

- **Auto-detect** group name from module filename
- **Allow override** via structured module export
- Keep commands simple when possible

## Auto-Detection

```typescript
// config.ts
modules: ['./website', './examples']

// website.ts → group: "website"
// examples.ts → group: "examples"
```

Result:
- `forge2 website build`
- `forge2 examples hello`

## Override via Module Export

Modules can export metadata to customize:

```typescript
// website.ts
import type { ForgeModule } from '@forge/core';

// Option A: Export module metadata
export const __module__: ForgeModule = {
  group: 'web',  // Override default "website"
  description: 'Website deployment commands'
};

// Option B: Default export can be ForgeModule
export default {
  group: 'website',
  description: 'Website deployment commands',
  commands: {
    build: { ... },
    sync: { ... }
  }
} satisfies ForgeModule;

// Commands
export const build = { ... };
export const sync = { ... };
```

## Proposed Type Structure

```typescript
// Core command type (unchanged)
export interface ForgeCommand {
  description: string;
  defineCommand?: (cmd: Command) => void;
  execute: (options: any, args: string[]) => Promise<void>;
}

// Module metadata
export interface ForgeModuleMetadata {
  group?: string | false;    // Group name, or false for top-level
  description?: string;       // Group description for help
}

// Complete module structure (for default export)
export interface ForgeModule extends ForgeModuleMetadata {
  commands: Record<string, ForgeCommand>;
}
```

## Module Patterns

### Pattern 1: Simple (Auto-detect group)

```typescript
// website.ts
export const build: ForgeCommand = { ... };
export const sync: ForgeCommand = { ... };
```

→ Group: `website` (from filename)
→ Commands: `forge2 website build`, `forge2 website sync`

### Pattern 2: Metadata Override

```typescript
// website.ts
export const __module__: ForgeModuleMetadata = {
  group: 'web',
  description: 'Website deployment and publishing'
};

export const build: ForgeCommand = { ... };
export const sync: ForgeCommand = { ... };
```

→ Group: `web` (overridden)
→ Commands: `forge2 web build`, `forge2 web sync`

### Pattern 3: Top-level (No group)

```typescript
// utils.ts
export const __module__: ForgeModuleMetadata = {
  group: false  // Disable grouping
};

export const version: ForgeCommand = { ... };
export const config: ForgeCommand = { ... };
```

→ Group: none
→ Commands: `forge2 version`, `forge2 config` (top-level)

### Pattern 4: Default Export (Everything in one)

```typescript
// website.ts
import type { ForgeModule } from '@forge/core';

export default {
  group: 'website',
  description: 'Website commands',
  commands: {
    build: { description: '...', execute: async () => {} },
    sync: { description: '...', execute: async () => {} }
  }
} satisfies ForgeModule;
```

→ Group: `website`
→ Commands from `commands` object

## Implementation: Auto-Discovery Logic

```typescript
async function loadModule(
  modulePath: string,
  forgeDir: string
): Promise<{ metadata: ForgeModuleMetadata, commands: Record<string, ForgeCommand> }> {
  const fullPath = modulePath.startsWith('.')
    ? join(forgeDir, modulePath)
    : modulePath;

  const module = await import(fullPath);

  // 1. Extract metadata (if present)
  let metadata: ForgeModuleMetadata = {
    group: deriveGroupFromPath(modulePath),  // Auto-detect from filename
    description: ''
  };

  // Check for __module__ named export
  if (module.__module__) {
    metadata = { ...metadata, ...module.__module__ };
  }

  // Check for default export with metadata
  if (module.default?.group !== undefined) {
    metadata.group = module.default.group;
    metadata.description = module.default.description || metadata.description;
  }

  // 2. Discover commands
  const commands: Record<string, ForgeCommand> = {};

  // From default export (if it has commands)
  if (module.default?.commands) {
    Object.assign(commands, module.default.commands);
  }

  // From named exports
  for (const [name, value] of Object.entries(module)) {
    if (name === 'default' || name === '__module__') continue;
    if (isForgeCommand(value)) {
      commands[name] = value;
    }
  }

  return { metadata, commands };
}

function deriveGroupFromPath(modulePath: string): string {
  // './website' → 'website'
  // './website.ts' → 'website'
  // '@forge/aws' → 'aws'
  const basename = modulePath.split('/').pop() || '';
  return basename.replace(/\.(ts|js|mjs)$/, '');
}
```

## Config.ts Evolution

Before (current):
```typescript
export default {
  modules: ['./website', './examples']
};
```

After (same! auto-detect works):
```typescript
export default {
  modules: ['./website', './examples']
};
// → Groups: "website", "examples" (auto-detected)
```

Override if needed:
```typescript
export default {
  modules: [
    './website',   // Uses filename: "website"
    './examples'   // Uses filename: "examples"
  ]
};
```

## Forge Class Changes

```typescript
export class Forge {
  // Top-level commands (no group)
  public commands: Record<string, ForgeCommand> = {};

  // Grouped commands
  public commandGroups: Record<string, {
    description: string;
    commands: Record<string, ForgeCommand>;
  }> = {};

  async loadConfig(): Promise<void> {
    // ...
    for (const modulePath of this.config.modules) {
      const { metadata, commands } = await loadModule(modulePath, this.context.forgeDir);

      if (metadata.group && metadata.group !== false) {
        // Grouped commands
        if (!this.commandGroups[metadata.group]) {
          this.commandGroups[metadata.group] = {
            description: metadata.description || '',
            commands: {}
          };
        }
        Object.assign(this.commandGroups[metadata.group].commands, commands);
      } else {
        // Top-level commands (group: false)
        Object.assign(this.commands, commands);
      }
    }
  }
}
```

## Examples

### Auto-detect (default behavior)

```typescript
// config.ts
modules: ['./website', './examples', './utils']

// Files:
// - website.ts → group "website"
// - examples.ts → group "examples"
// - utils.ts → group "utils"

// Usage:
// forge2 website build
// forge2 examples hello
// forge2 utils config
```

### Custom group name

```typescript
// website.ts
export const __module__ = {
  group: 'web',
  description: 'Website deployment tools'
};

export const build = { ... };

// Usage:
// forge2 web build  (not "website")
```

### Top-level (no group)

```typescript
// utils.ts
export const __module__ = {
  group: false  // Disable grouping
};

export const version = { ... };

// Usage:
// forge2 version  (not "utils version")
```

### Mixed

```typescript
// config.ts
modules: [
  './website',   // Group: website
  './examples',  // Group: examples
  './core'       // core.ts exports __module__: { group: false }
]

// Usage:
// forge2 website build
// forge2 examples hello
// forge2 version         (from core, top-level)
```

## Benefits

✅ **Zero config by default** - filename = group name
✅ **Override when needed** - export `__module__` metadata
✅ **Opt-out available** - set `group: false` for top-level
✅ **Well-typed** - `ForgeModule` and `ForgeModuleMetadata` types
✅ **Backward compatible** - existing modules work, grouped by filename
✅ **Clear structure** - metadata separate from commands

## Migration Path

Current modules work as-is:
```typescript
// website.ts (no changes needed)
export const build = { ... };
export const sync = { ... };
```

Will automatically become:
```
forge2 website build
forge2 website sync
```

If you want top-level:
```typescript
// website.ts (add metadata)
export const __module__ = { group: false };

export const build = { ... };
```

Now:
```
forge2 build  (top-level)
```

## Open Questions

1. **Should config.ts allow override?**
   ```typescript
   modules: [
     { path: './website', group: 'web' }  // Override in config?
   ]
   ```
   → Probably no - keep override in module itself for clarity

2. **What if module exports both `__module__` and default with metadata?**
   → Default wins (more explicit)

3. **Empty group name (`group: ''`)?**
   → Treat as `false` (top-level)

## Next Steps

1. Add `ForgeModuleMetadata` and `ForgeModule` types
2. Update `loadModule()` to return `{ metadata, commands }`
3. Add `commandGroups` to Forge class
4. Update `loadConfig()` to handle grouping
5. Update `forge2` to register groups as subcommands
6. Update example modules to show patterns
7. Test all patterns
