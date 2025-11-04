# Story: Add `forge cd` Command

**Priority:** Low
**Effort:** 1-2 hours
**Type:** Feature

## Description

Add built-in `cd` command that changes to forge home directory (`~/.local/share/forge/`), similar to how `chezmoi cd` works.

## Use Case

Quick access to forge home for debugging, inspection, or manual operations:

```bash
# Quick access to forge home
forge cd

# Now in ~/.local/share/forge/
pwd
# /Users/jason/.local/share/forge

ls -la
# Shows node_modules/, package.json, etc.
```

## Implementation

**Where:** `lib/builtins.ts` (new file) or add to existing built-in commands

**Code:**
```typescript
import { getForgePaths } from './xdg';

export const cd: ForgeCommand = {
  description: 'Change to forge home directory',
  execute: async (options, args, context) => {
    const { data: forgeHome } = getForgePaths();

    // Can't actually change parent shell's directory from subprocess
    // Print the path for use with shell function wrapper
    console.log(forgeHome);
  },
};
```

**Shell wrapper (optional enhancement):**
```bash
# Add to ~/.bashrc or ~/.zshrc
forge-cd() {
  cd "$(forge cd)"
}
```

**Alternative (simpler):** Just print the path, user can `cd $(forge cd)`

## Acceptance Criteria

- [ ] `forge cd` prints forge home path
- [ ] Path is correct (`~/.local/share/forge/`)
- [ ] Works with `cd $(forge cd)`

## Future Enhancement

Add optional subcommand to cd to project root:
```bash
forge cd --project   # cd to current .forge2/ parent
```
