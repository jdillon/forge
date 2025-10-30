# Subcommand Groups Design

## Goal

Organize commands under groups:
- `forge2 website build` instead of `forge2 build`
- `forge2 examples hello` instead of `forge2 hello`

## Commander Support

✅ Commander fully supports nested subcommands via `.addCommand()`

## Design Options

### Option 1: Module Path = Group Name

Simplest - derive group from module path:

```typescript
// config.ts
modules: [
  './website',   // Group: "website"
  './examples',  // Group: "examples"
]
```

Result:
- `forge2 website build`
- `forge2 website sync`
- `forge2 examples hello`

**Pros:**
- Zero config
- Automatic
- Clear naming

**Cons:**
- Can't customize group name
- All commands in module share group

### Option 2: Module Exports Group Metadata

Module can export group info:

```typescript
// website.ts
export const __group__ = {
  name: 'website',
  description: 'Website deployment commands'
};

export const build = { ... };
export const sync = { ... };
```

**Pros:**
- Custom descriptions
- Module controls grouping

**Cons:**
- More boilerplate
- Magic `__group__` export

### Option 3: Config Specifies Groups

Config declares grouping:

```typescript
// config.ts
modules: [
  { path: './website', group: 'website', description: 'Website commands' },
  { path: './examples', group: 'examples', description: 'Example commands' },
  './standalone',  // No group - top-level commands
]
```

**Pros:**
- Flexible
- Can have ungrouped modules
- Clear intent

**Cons:**
- More config boilerplate
- Moving group decision to config

### Option 4: Hybrid - Auto-detect with Override

Auto-derive from path, allow override:

```typescript
// config.ts - auto groups
modules: [
  './website',   // Auto: group "website"
  './examples',  // Auto: group "examples"
]

// OR with override
modules: [
  { path: './website', group: 'web', description: 'Website tools' },
  { path: './examples', flatten: true },  // No group, top-level
]
```

**Pros:**
- Simple default
- Flexibility when needed

**Cons:**
- Two patterns to learn

## Recommendation: Option 3 (Config-driven)

Most flexible and explicit:

```typescript
export default {
  modules: [
    // Grouped commands
    {
      path: './website',
      group: 'website',
      description: 'Website deployment commands'
    },
    {
      path: './examples',
      group: 'examples',
      description: 'Example command patterns'
    },

    // Top-level commands (no group)
    './utils',
  ]
}
```

This gives:
- `forge2 website build`
- `forge2 website sync`
- `forge2 examples hello`
- `forge2 config` (from utils, top-level)

## Implementation

### Updated Types

```typescript
export interface ModuleConfig {
  path: string;
  group?: string;          // Optional group name
  description?: string;    // Group description
}

export interface ForgeConfig {
  modules: (string | ModuleConfig)[];
  defaultCommand?: string;
}
```

### Loading Logic

```typescript
async loadConfig() {
  // ...
  for (const mod of this.config.modules) {
    const modConfig = typeof mod === 'string'
      ? { path: mod }
      : mod;

    const commands = await loadModule(modConfig.path, this.context.forgeDir);

    if (modConfig.group) {
      // Store commands under group
      if (!this.commandGroups[modConfig.group]) {
        this.commandGroups[modConfig.group] = {
          description: modConfig.description || '',
          commands: {}
        };
      }
      Object.assign(this.commandGroups[modConfig.group].commands, commands);
    } else {
      // Top-level commands
      Object.assign(this.commands, commands);
    }
  }
}
```

### Registration (forge2)

```typescript
// Register command groups as subcommands
for (const [groupName, group] of Object.entries(forge.commandGroups)) {
  const groupCmd = new Command(groupName)
    .description(group.description);

  for (const [name, forgeCmd] of Object.entries(group.commands)) {
    const cmd = buildCommanderCommand(name, forgeCmd);
    groupCmd.addCommand(cmd);
  }

  program.addCommand(groupCmd);
}

// Register top-level commands
for (const [name, forgeCmd] of Object.entries(forge.commands)) {
  const cmd = buildCommanderCommand(name, forgeCmd);
  program.addCommand(cmd);
}
```

## Usage Examples

### Grouped
```bash
forge2 website --help          # Show website commands
forge2 website build --clean   # Run website build
forge2 examples hello Jason    # Run examples hello
```

### Top-level
```bash
forge2 config show             # Ungrouped command
forge2 version                 # Top-level
```

## Benefits

✅ **Clear organization** - Related commands grouped together
✅ **Namespace separation** - Multiple modules can have 'build' command
✅ **Optional** - Can still have top-level commands
✅ **Discoverable** - `forge2 --help` shows groups, `forge2 website --help` shows commands
✅ **Flexible** - Config controls grouping

## Migration

Current:
```typescript
modules: ['./website', './examples']
// All top-level: forge2 build, forge2 sync, forge2 hello
```

New:
```typescript
modules: [
  { path: './website', group: 'website', description: 'Website commands' },
  { path: './examples', group: 'examples', description: 'Examples' }
]
// Grouped: forge2 website build, forge2 examples hello
```

## Next Steps

1. Update `ForgeConfig` type with `ModuleConfig`
2. Add `commandGroups` to `Forge` class
3. Update `loadConfig()` to handle groups
4. Update `forge2` to register groups
5. Update example config.ts
6. Test nested commands
