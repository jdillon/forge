# Shell Completion Support

**Status**: Planned
**Priority**: Medium
**Complexity**: Medium
**Target Version**: v2.1
**Issue**: [#3](https://github.com/jdillon/forge/issues/3)

---

## Overview

Generate and install shell completion for bash, zsh, and fish, enabling users to auto-complete Forge commands, subcommands, and flags.

---

## Motivation

**Why we need this**:
- Standard feature for modern CLIs (npm, git, docker all have it)
- Improves discoverability of commands
- Reduces typing errors
- Better developer experience

**Current pain**:
- Users must remember exact command names
- Hard to discover available subcommands
- No feedback on available flags

---

## Dependencies

**Already installed**:
- `omelette` package in package.json

**Requires**:
- Command discovery from module system (already works)
- Access to Commander.js command structure

---

## Design

### Architecture

```
┌─────────────────┐
│  forge2 CLI     │
└────────┬────────┘
         │
         ├─→ forge2 completion install [shell]
         │   ├─→ Detect shell (bash/zsh/fish)
         │   ├─→ Generate completion script
         │   └─→ Install to appropriate location
         │
         ├─→ forge2 completion uninstall
         │   └─→ Remove completion script
         │
         └─→ forge2 completion generate [shell]
             └─→ Output script to stdout (for manual install)
```

### Command Discovery

**What to complete**:
1. **Top-level commands**: `forge2 <TAB>` → show all group names
2. **Subcommands**: `forge2 website <TAB>` → show website commands
3. **Flags**: `forge2 website deploy --<TAB>` → show available flags
4. **Values**: Some flags may have predefined values (env names, etc.)

**How to discover**:
- Use existing module discovery system in `lib/core.ts`
- Walk loaded modules and extract command structure
- Use Commander.js introspection for flags

### Shell Integration Approaches

#### Bash
```bash
# ~/.bashrc or ~/.bash_completion.d/forge2
_forge2_completion() {
    local cur="${COMP_WORDS[COMP_CWORD]}"
    local prev="${COMP_WORDS[COMP_CWORD-1]}"

    # Call forge2 with special env var to get completions
    COMP_LINE="$COMP_LINE" COMP_POINT="$COMP_POINT" \
        forge2 __complete "$cur" "$prev"
}
complete -F _forge2_completion forge2
```

#### Zsh
```zsh
# ~/.zshrc or ~/.zsh/completions/_forge2
#compdef forge2

_forge2() {
    local line state
    # Similar completion logic
}

_forge2 "$@"
```

#### Fish
```fish
# ~/.config/fish/completions/forge2.fish
complete -c forge2 -f
complete -c forge2 -a '(forge2 __complete (commandline -cp))'
```

### Implementation Strategy

**Option 1: omelette (simple)**
- Use existing omelette package
- Works for basic command/flag completion
- Easy to set up
- Limited customization

**Option 2: Custom completion (flexible)**
- Implement `forge2 __complete` command
- Full control over completion logic
- Can provide context-aware suggestions
- More implementation work

**Recommendation**: Start with omelette, add custom logic later if needed

---

## Implementation Plan

### Phase 1: Basic Completion Generation

1. **Create completion command**: `lib/commands/completion.ts`
   ```typescript
   forge2 completion install [bash|zsh|fish]
   forge2 completion uninstall
   forge2 completion generate [shell]
   ```

2. **Integrate omelette**: Set up omelette with command structure
   ```typescript
   const omelette = require('omelette');
   const completion = omelette('forge2 <group> <command> <flags>');

   completion.on('group', ({ reply }) => {
       reply(getModuleGroups()); // ['website', 'aws', etc.]
   });

   completion.on('command', ({ fragment, reply }) => {
       const group = fragment.group;
       reply(getCommandsForGroup(group));
   });
   ```

3. **Shell detection**: Auto-detect user's shell
   ```typescript
   const shell = process.env.SHELL?.includes('zsh') ? 'zsh' : 'bash';
   ```

### Phase 2: Installation

1. **Installation paths**:
   ```
   bash:   ~/.bashrc (source completion script)
   zsh:    ~/.zshrc (source completion script)
   fish:   ~/.config/fish/completions/forge2.fish
   ```

2. **Installation logic**:
   - Generate completion script
   - Check if already installed (grep existing files)
   - Append to appropriate rc file or create completion file
   - Prompt user to reload shell

3. **Uninstallation**:
   - Remove lines added during installation
   - Clean up completion files

### Phase 3: Context-Aware Completions

1. **State-based suggestions**: Complete project names from state
2. **File/directory completion**: For path arguments
3. **Dynamic values**: Environment names, module names, etc.

---

## Open Questions

1. **Auto-install on first run?**
   - Prompt user to install completion after first `forge2` command?
   - Or require explicit `forge2 completion install`?

2. **Update strategy**:
   - How to update completions when new modules added?
   - Regenerate on every module install?
   - Or require manual `forge2 completion update`?

3. **Cross-platform support**:
   - Focus on macOS/Linux first?
   - Windows support (PowerShell, CMD)?

4. **Dynamic vs static completion**:
   - Generate static completion file (fast, but stale)?
   - Or dynamic completion calling forge2 each time (accurate, but slower)?

---

## Testing Strategy

1. **Unit tests**: Test completion script generation
2. **Integration tests**: Test installation/uninstallation
3. **Manual testing**: Actually try it in bash/zsh/fish

---

## Success Criteria

- ✅ User can install completion with one command
- ✅ Tab completion works for groups and subcommands
- ✅ Flag completion works for all commands
- ✅ Works in bash, zsh, and fish
- ✅ Installation doesn't break existing shell config
- ✅ Uninstallation cleanly removes completion

---

## Alternatives Considered

**CLI completion frameworks**:
- `tabtab`: More complex, npm-specific
- `completion`: Older, less maintained
- `omelette`: Simple, maintained, good fit ✅

**Manual scripts**: Write raw bash/zsh functions
- Pros: Full control
- Cons: More work, harder to maintain

---

## Related

- **Roadmap**: [roadmap.md](./roadmap.md)
- **Issue**: [#3](https://github.com/jdillon/forge/issues/3)
- **Command discovery**: `lib/core.ts` (existing module system)
- **Omelette docs**: https://github.com/f/omelette
