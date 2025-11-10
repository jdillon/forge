# Features

Documentation for key Forge features.

---

## Core Features

- **[Auto-Discovery](auto-discovery.md)** - Commands discovered from exports automatically
- **[Module Metadata](module-metadata.md)** - Customize groups with `__module__` export
- **[Subcommand Groups](subcommand-groups.md)** - Organize commands under namespaces
- **[Commander Integration](commander-integration.md)** - Rich CLI via Commander.js

---

## How Features Work Together

1. **List modules** in `.forge2/config.yml`
2. **Export commands** from module files (auto-discovery)
3. **Add `__module__`** to customize group name (optional)
4. **Framework groups** commands automatically (subcommand groups)
5. **Commander parses** and invokes commands (integration)

---

## Example

```yaml
# .forge2/config.yml
modules:
  - ./website
```

```typescript
// .forge2/website.ts
export const __module__ = {
  group: 'website',
  description: 'Website deployment'
};

export const deploy: ForgeCommand = {
  description: 'Deploy website',

  defineCommand: (cmd) => {
    cmd
      .argument('<env>', 'Environment')
      .option('--dry-run', 'Preview');
  },

  execute: async (options, args, context) => {
    const env = args[0];
    console.log(`Deploying to ${env}`);
  }
};
```

**Result**: `forge2 website deploy staging --dry-run`

---

## See Also

- **[docs/command-patterns.md](../command-patterns.md)** - Quick reference for writing commands
- **[docs/libraries/](../libraries/)** - CLI library reference
