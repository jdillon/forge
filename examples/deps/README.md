# Dependencies Example

This example demonstrates Phase 2 dependency management - installing npm packages to forge home and importing them in modules.

## What This Does

- Declares `cowsay` as a dependency in `config.yml`
- Auto-installs to `~/.local/share/forge2/node_modules/` on first run
- Imports and uses `cowsay` in the `moo` module

## Usage

### First Run (Auto-Install)

```bash
cd examples/deps
forge moo say hello
```

On first run, you'll see:
```
Installing 1 dependency: cowsay...
 Dependencies installed
Restarting to pick up changes...

 _______
< hello >
 -------
        \   ^__^
         \  (oo)\_______
            (__)\       )\/\
                ||----w |
                ||     ||
```

### Subsequent Runs (No Install)

```bash
forge moo say "Phase 2 is working!"
forge moo think "Dependencies are seamless..."
```

## Commands

- `forge moo say <text>` - Make a cow say something
- `forge moo think <text>` - Make a cow think something (with thought bubbles)

## How It Works

1. **Config** (`.forge2/config.yml`):
   ```yaml
   dependencies:
     - cowsay

   modules:
     - ./moo
   ```

2. **Module** (`.forge2/moo.ts`):
   ```typescript
   import cowsay from 'cowsay';

   export const say: ForgeCommand = {
     description: 'Make a cow say something',
     execute: async (options, args, context) => {
       const text = args.join(' ');
       console.log(cowsay.say({ text }));
     },
   };
   ```

3. **Magic**:
   - Forge detects missing dependency
   - Runs `bun add cowsay` in `~/.local/share/forge2/`
   - Exits with code 42
   - Wrapper restarts with `--forge-restarted` flag
   - Module imports work, command executes

## Verify Installation

```bash
# Check what's installed in forge home
ls ~/.local/share/forge2/node_modules/

# Check package.json
cat ~/.local/share/forge2/package.json
```
