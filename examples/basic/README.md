# Basic Example

Minimal Forge module demonstrating simple command patterns.

## What This Demonstrates

- **Ultra-simple command** (`ping`) - No options, no args, just works
- **Command with options** (`greet`) - Arguments and flags
- **Module metadata** (`__module__`) - Customize group name and description
- **Config integration** - Command reads from settings

## Structure

```
basic/
├── .forge2/
│   ├── config.yml      # Forge configuration
│   ├── simple.ts       # Command module
│   └── .gitignore
└── README.md
```

## Try It

```bash
# From this directory
cd examples/basic

# Run commands
forge2 basic ping
forge2 basic greet
forge2 basic greet Alice
forge2 basic greet --loud
forge2 basic greet Alice --loud
```

## Commands

### `basic ping`

Simple command with no arguments or options.

**Output**: `pong!`

### `basic greet [name] [--loud]`

Greet someone by name.

**Arguments**:
- `name` - Optional. Name to greet (defaults to config value or "World")

**Options**:
- `-l, --loud` - Use uppercase

**Examples**:
```bash
forge2 basic greet                # Hello, Forge User!
forge2 basic greet Alice          # Hello, Alice!
forge2 basic greet --loud         # HELLO, FORGE USER!
forge2 basic greet Bob --loud     # HELLO, BOB!
```

## Module Code

See `.forge2/simple.ts` for the implementation. Key features:

1. **Module metadata** - Uses `__module__` export to customize group name:
   ```typescript
   export const __module__: ForgeModuleMetadata = {
     group: 'basic',
     description: 'Basic example commands'
   };
   ```

2. **Simple command** - Just an object with `description` and `execute`:
   ```typescript
   export const ping = {
     description: 'Simple ping command',
     execute: async (options, args, context) => {
       console.log('pong!');
     }
   };
   ```

3. **Command with options** - Use `defineCommand` to add arguments/flags:
   ```typescript
   export const greet: ForgeCommand = {
     description: 'Greet someone',
     defineCommand: (cmd) =>
       cmd.argument('[name]', '...').option('-l, --loud', '...'),
     execute: async (options, args, context) => {
       // Implementation
     }
   };
   ```

4. **Config integration** - Read settings from context:
   ```typescript
   const defaultName = context.settings.defaultName || 'World';
   ```

## Config

See `.forge2/config.yml`:

```yaml
modules:
  - ./simple

settings:
  basic.greet:
    defaultName: Forge User
```

## Comparison with Website Example

**Basic example** (this):
- Minimal setup
- Simple commands
- Good starting point

**Website example** (`../website/`):
- More complex commands
- Multiple modules
- State management
- External integrations
- Production patterns

Start here, then look at the website example for advanced patterns.
