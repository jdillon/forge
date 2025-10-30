# Auto-Discovery

Commands are automatically discovered from module exports - no manual registration required.

---

## How It Works

1. List modules in `.forge2/config.yml`
2. Export commands from those modules
3. Framework discovers and registers them automatically

---

## Config

```yaml
# .forge2/config.yml
modules:
  - ./website
  - ./examples
```

That's it! No command mapping needed.

---

## Module Patterns

### Named Exports
```typescript
// website.ts
export const build: ForgeCommand = {
  description: 'Build website',
  execute: async (options, args, context) => {
    // implementation
  }
};

export const deploy: ForgeCommand = {
  description: 'Deploy website',
  execute: async () => { ... }
};
```

**Result**: `build` and `deploy` commands available

### Default Export (Object)
```typescript
// examples.ts
export default {
  hello: {
    description: 'Say hello',
    execute: async () => console.log('Hello!')
  },
  version: {
    description: 'Show version',
    execute: async () => console.log('v2.0.0')
  }
};
```

**Result**: `hello` and `version` commands available

### Both (Mix and Match)
```typescript
// commands.ts
export const build: ForgeCommand = { ... };

export default {
  build,  // Re-export
  'special-name': { ... }  // Custom name in object
};
```

---

## Discovery Logic

The framework checks each module for:

1. **Named exports** - Any export that looks like a ForgeCommand (has `description` and `execute`)
2. **Default export** - If it's an object, treat keys as command names

**Detection**:
```typescript
function isForgeCommand(obj: any): boolean {
  return obj
    && typeof obj === 'object'
    && typeof obj.description === 'string'
    && typeof obj.execute === 'function';
}
```

---

## Command Naming

- **Named export**: Command name = export name
  ```typescript
  export const build = { ... }  // Command: "build"
  ```

- **Default export**: Command name = object key
  ```typescript
  export default { hello: { ... } }  // Command: "hello"
  ```

- **Kebab-case**: Use default export for custom names
  ```typescript
  export default {
    'get-config': getConfig,
    'clear-cache': clearCache
  }
  ```

---

## Benefits

✅ **Zero boilerplate** - Export a command, it works
✅ **Flexible** - Named exports, default export, or both
✅ **Type-safe** - TypeScript validates ForgeCommand structure
✅ **Simple** - config.yml is just a module list

---

## See Also

- [Module Metadata](module-metadata.md) - Customize group names with `__module__`
- [Subcommand Groups](subcommand-groups.md) - Group commands under namespaces
