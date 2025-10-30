# Module Metadata

Modules can export metadata to customize their group name and description.

---

## The `__module__` Export

By default, the group name comes from the filename. Override it with `__module__`:

```typescript
// website.ts
export const __module__ = {
  group: 'web',                          // Override "website"
  description: 'Website deployment tools'
};

export const build: ForgeCommand = { ... };
export const deploy: ForgeCommand = { ... };
```

**Result**: Commands under `forge2 web build`, not `forge2 website build`

---

## Default Behavior (No __module__)

Without `__module__`, group name derives from filename:

```typescript
// website.ts
export const build = { ... };
```

**Result**: `forge2 website build` (group = "website")

---

## Top-Level Commands (No Group)

Set `group: false` for top-level commands:

```typescript
// utils.ts
export const __module__ = {
  group: false  // No grouping
};

export const version: ForgeCommand = { ... };
export const config: ForgeCommand = { ... };
```

**Result**:
- `forge2 version` (not `forge2 utils version`)
- `forge2 config` (not `forge2 utils config`)

---

## Type Definition

```typescript
export interface ModuleMetadata {
  group?: string | false;    // Group name, or false for top-level
  description?: string;       // Group description (for help)
}
```

---

## Examples

### Rename Group
```typescript
// website-deployment.ts
export const __module__ = {
  group: 'website',
  description: 'Website deployment commands'
};

export const build = { ... };
// Usage: forge2 website build
```

### Top-Level Utilities
```typescript
// core.ts
export const __module__ = {
  group: false  // Disable grouping
};

export const version = { ... };
export const help = { ... };
// Usage: forge2 version, forge2 help
```

### Add Description
```typescript
// examples.ts
export const __module__ = {
  group: 'examples',
  description: 'Example command patterns'
};

export default {
  hello: { ... },
  deploy: { ... }
};
```

When user runs `forge2 examples --help`, they see the description.

---

## Config.yml Integration

Modules declared in config.yml use their metadata:

```yaml
# .forge2/config.yml
modules:
  - ./website        # Uses __module__ if present, else "website"
  - ./examples       # Uses __module__ if present, else "examples"
  - ./utils          # If __module__: { group: false }, goes top-level
```

---

## Benefits

✅ **Optional** - Works without `__module__` (uses filename)
✅ **Flexible** - Rename groups or disable grouping
✅ **Descriptive** - Add help text for groups
✅ **Type-safe** - TypeScript validates structure

---

## See Also

- [Auto-Discovery](auto-discovery.md) - How commands are discovered
- [Subcommand Groups](subcommand-groups.md) - How grouping works
