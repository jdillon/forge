# Questions for Jason

Based on my analysis of forge, commando, and the requirements you've outlined, I have questions organized by topic.

## Installation & Distribution Model

### Q1: Installation Method Priority

You mentioned wanting a git-clone install (like jenv/tfenv). What's your preferred installation experience?

**Options:**
- **A)** Git clone to `~/.forge`, add to PATH
  - `git clone https://github.com/user/forge ~/.forge`
  - `export PATH="$HOME/.forge/bin:$PATH"`
  - Updates: `cd ~/.forge && git pull`

- **B)** Install script that copies to `~/bin` or `/usr/local/bin`
  - `curl https://forge.sh/install | bash`
  - Updates: Re-run installer

- **C)** Package managers (Homebrew, apt)
  - `brew install forge`
  - Updates: `brew upgrade forge`

- **D)** Multiple options (git for devs, packages for enterprise)

> I like A and B, C less so cause it means more work for me (and my team working on common repos).  Maybe one day its popular enough to be packaged.
> I like ~/.forge, though maybe modern stuff diesn't litter into ~/. but uses ~/.config or ~/.local.
> Need to consider where the project-specific config goes too.

**Follow-up:** Should the framework auto-update itself?

> Yes, keeping itself and bundles updated is important.

### Q2: Backward Compatibility

You have existing forge scripts in cirqil/admin and cirqil/website. Should the new design:

**A)** Be fully backward compatible (no changes needed to existing projects)
**B)** Require migration (provide migration guide/script)
**C)** Support both modes (detect old vs new style)

**Cost of backward compatibility:**
- Maintains location-dependent behavior for old projects
- Can't remove forgedir concept immediately
- More complex code

## Configuration Discovery

> backwards compatible not an issue; change has a cost!  thats okay :-)

### Q3: Config Location Strategy

When forge is installed globally and you run it from a subdirectory, how should it find config?

**Options:**

**A) Walk up directory tree** (like git)
```
/home/user/projects/myapp/src/components/
  ↓ search upward
/home/user/projects/myapp/.forge/  ← found!
```

**B) Use marker file** (like .git directory)
```
/home/user/projects/myapp/.forge/
/home/user/projects/myapp/.forgeroot  ← marker
```

**C) Environment variable**
```bash
export FORGE_ROOT=/home/user/projects/myapp
forge deploy  # from anywhere
```

**D) Combination** (walk up + env var override)

> lets say D; prefer walk up like git, otherwise cli flag, or env-var

**Follow-up:** What if multiple nested `.forge/` directories exist? (monorepo scenario)

> I think it should work like git; or you have to be explicit.  Might be interesting to consider contextual commands, but mabye we'll add that as an improvement

### Q4: Config File Naming

Current: `.forge/config.bash`

Should we:
- **A)** Keep `.forge/` hidden directory (Unix convention)
- **B)** Use visible `forge/` directory (more discoverable)
- **C)** Support both (search `.forge/` then `forge/`)

**Trade-off:** Hidden = cleaner `ls`, Visible = more discoverable

> so maybe if we end up using ~/.forge for the install.  Then <project>/forge is okay. It helps keep related support things organized (.* stay sorted together)?  Dunno I need to think about it more

## Module System

### Q5: Module Repository Structure

For shared modules (aws, terraform, etc), where should they live?

**Options:**

**A) System-wide** (`/usr/local/share/forge/lib/`)
- Installed with framework
- Updated with framework
- Requires sudo for install

**B) User-specific** (`~/.forge/lib/`)
- No sudo needed
- Per-user customization
- User manages updates

**C) Project-vendored** (`myproject/.forge/lib/`)
- Full control
- Version-locked
- Duplication across projects

**D) Hybrid** - All three with precedence:
1. Project (highest priority)
2. User
3. System (lowest priority)

**My recommendation:** Hybrid (D) - flexibility for all scenarios

> defs D, I want to share common modules (and have them automatically update along with the forge script/core itself), and per-project modules so that folks can package into their repo.

### Q6: Module Loading - Explicit vs Auto

Current forge requires explicit sourcing:
```bash
# In .forge/config.bash
source "${forgedir}/aws.bash"
source "${forgedir}/terraform.bash"
```

Should the new design:

**A) Keep explicit** (maintain control, clear dependencies)
```bash
# In .forge/config.bash
load_module aws
load_module terraform
```

**B) Auto-load all** (convenience, convention)
```bash
# Automatically sources all .bash files in lib/
# Order determined by filename or dependencies
```

**C) Hybrid** (auto-load system/user, explicit for project)

**Trade-off:** Explicit = control, Auto = convenience

> So, its been a while since I worked in Commando, but I think it was explicit her to help also inform on dependencies. So I think its still reasonable to have explicit modules you load.

### Q7: Module Dependencies

The terraform module depends on aws (uses `aws_vault_prefix()`). How to handle?

**Options:**

**A) Manual ordering** (current approach)
```bash
source aws.bash  # Must be first
source terraform.bash
```

**B) Dependency declaration** in modules
```bash
# In terraform.bash
# FORGE_REQUIRES: aws
```
Framework loads in correct order.

**C) No formal dependencies** (modules check at runtime)
```bash
# In terraform.bash
if ! type -t aws_vault_prefix >/dev/null; then
  die "terraform module requires aws module"
fi
```

> I think the module system in commando does this?  But I think its reasonable to have explicit module requires.

**Follow-up:** Should we support module versions? (`FORGE_REQUIRES: aws>=2.0`)

> I think that might get messy, for now I think there is just a *latest* version of everything.  If we end up building something more robust, I think it might also get too complex?
> If we control the with a git clone-like thingy, then maybe if modules are are also git controlled, then git branches/tags can be used to handle versions.

## State Management

### Q8: State System Improvements

Current state system is simple key-value. Should we:

**A) Keep current design** (simple, works)

**B) Add proper escaping** (handle special chars)
```bash
state["last_deploy"]="prod's environment"  # Currently breaks
```

**C) Use JSON/YAML** (structured, safer)
```bash
# .forge/state.json
{
  "last_deploy": "prod",
  "last_time": 1234567890
}
```

**D) Remove state system** (use files/git for persistence)

**My concern:** Current state system has no escaping, breaks with quotes/newlines

> If we make it fancier and keep it simple (or stuff the complexity into a library) then structured would be great.  Not sure if JSON or YAML is better.  I do like YAML TBH; .gitconfig style thats TOML or whatever?

### Q9: State Scope

Should state be:

**A) Project-wide** (current - `.forge/state.bash`)
**B) User-specific** (`.forge/state.bash.${USER}`)
**C) Both** (project state + user state)

**Use case:** Multiple developers working on same project

> probably C, but we need to consider more use-cases for this.  My first use-case of state was a terraform "env" memory.  So that I could select "prod" then run commands w/o having to constantly say which env it was.
> I think you pointed out that might be bad.
> Maybe if there is some way to help automate config (like git has for eample command to set stuff in ~/.giconfig).

## Help & Discovery

### Q10: Help System Verbosity

Given the choice between:

**A) Commando-style** (rich but verbose to configure)
```bash
help_define_description deploy 'Deploy application'
help_define_syntax deploy '<env>'
help_define_doc deploy '...'
```

**B) Forge-style** (none - read source)

**C) Minimal** (auto-discovery + optional one-liners)
```bash
command_deploy_description="Deploy application"
```

**D) Metadata functions** (opt-in full help)
```bash
function command_deploy_help {
  cat <<EOF
Usage: forge deploy <env>
...
EOF
}
```

**My recommendation:** C + D (minimal by default, full when needed)

> I was pretty proud of the man stuff I did in Commando but it got pretty hard to maintain.  And cumbersome to make new commands, felt painful.  Defs lets start out with simple descriptions; and usage-syntax-help.  Maybe help pages are an improvement (just like man pages are seperate system but tools can include them).

## Command Organization

### Q11: Namespace/Grouping

For projects with many commands, should we support:

**A) Flat namespace** (current)
```bash
forge deploy
forge deploy_staging
forge deploy_prod
forge test
forge test_unit
```

**B) Subcommands**
```bash
forge deploy staging
forge deploy prod
forge test unit
```

**C) Both** (auto-detect based on naming)
```bash
# command_deploy_staging → forge deploy staging
# command_deploy → forge deploy
```

**Trade-off:** Subcommands are cleaner but change the calling convention

> if we can make subcommands work that might be nice, i'm okay with flat too if it simplers.


### Q12: Command Aliases

Should we support command aliases?

```bash
# Define once
function command_terraform { ... }

# Auto-alias
command_terraform_aliases="tf"

# Now both work:
forge terraform plan
forge tf plan
```

**Use case:** Short names for frequently-used commands

> lets keep it as an option, I do like short versions but I like long full versions for clarity.

## Shell Completion

### Q13: Completion Priority

How important is shell completion support?

**A) Critical** - Must have from day 1
**B) Important** - Add soon after initial release
**C) Nice to have** - Add if time permits
**D) Not important** - Users can add if they want

**Cost:** Adds complexity, testing burden, multiple shells (bash/zsh/fish)

> B ... I really want it for my own use-cases

### Q14: Completion Sophistication

If we add completion, how smart should it be?

**A) Basic** - Command names only
```bash
forge d<TAB> → forge deploy
```

**B) Intermediate** - Command names + static options
```bash
forge deploy <TAB> → dev staging prod
```

**C) Advanced** - Dynamic completion based on context
```bash
forge deploy <TAB> → (lists actual terraform workspaces)
```

**My recommendation:** Start with A+B, allow commands to opt-in to C

> A and B I think, C is too much unless we get it for free some how

## Error Handling

### Q15: Error Verbosity

Commando has detailed stack traces. Forge has simple errors. Preference?

**A) Simple** (current forge)
```
ERROR: forge command failed with exit code 1
Command: forge deploy prod
```

**B) Detailed** (commando-style)
```
ERROR: Unexpected failure
---
Lines [42 38]
Functions: [command_deploy __main]
Exit code: 1
Source trace:
  - /path/to/forge
  - /path/to/.forge/config.bash
Last command: terraform apply
---
```

**C) Configurable** (simple by default, verbose with `--debug`)

**My recommendation:** C - simple is less noisy, verbose helps debugging

> C

## Development & Testing

### Q16: Testing Framework

Should we include a testing framework for user commands?

**Options:**

**A) No testing support** (users figure it out)

**B) Document bats-core** (recommend but don't include)

**C) Include test runner**
```bash
forge test  # Runs tests in .forge/tests/
```

**D) Build-in test helpers**
```bash
function command_test {
  assert_command_exists terraform
  assert_env_set AWS_PROFILE
  # ...
}
```

> I need some advise here, if its bash based i'm not sure what tests for that look like.  However this is probably only in the primary repo (I would'nt expect users to run tests)

**Your use case:** Do you write tests for your forge commands?

> nope... i'm lazy; I find out when things break the hard way

### Q17: Development Mode

Should there be a development/debug mode?

```bash
forge --debug deploy prod
# Shows: Each command executed, variables, timing, etc.
```

**Or:**
```bash
FORGE_DEBUG=1 forge deploy prod
```

**Or:**
```bash
# In .forge/local.bash
debug=true
```

> I would like to have a debug mode, this is important so I can diagnose issues.  Commando does this IIRC, forge not really (but its a much smaller framework).

## Versioning & Updates

### Q18: Version Management

Should the framework support version pinning?

**A) No versioning** - Always use latest from git/install

**B) Project pins version**
```bash
# In .forge/config.bash
FORGE_VERSION="2.1.0"  # Error if different version
```

**C) Module versions**
```bash
# In .forge/config.bash
load_module aws@2.0
load_module terraform@1.5
```

**Use case:** Ensure consistent behavior across team

> lets look at leaning on git repo carrying the install or carrying bundles for all version mamgement.  We could explore a high level version requirement mechanism, but lets talk more about how we can leverage git clones to manage distributions, versions and modularity/sharing.

### Q19: Update Mechanism

How should users update forge?

**A) Manual** - `cd ~/.forge && git pull` or re-run installer

**B) Built-in update command**
```bash
forge --update
# Or
forge self-update
```

**C) Automatic checks** (notify when updates available)

**D) No updates** (framework is stable, rarely changes)

> probably B and C; automatic check but not auto-update

## Community & Distribution

### Q20: Open Source Plans?

Are you planning to:

**A) Open source publicly** (GitHub, encourage community)
**B) Keep private** (internal use only)
**C) Open source later** (after polish)

**Impact:** Affects naming, documentation, support burden

> I'll probably keep it in my github account as public, ASL2.  But there isn't a community per-say.  It should have enough polish that I can remember how it works, maintain it.  And if I show it to a coworker and tell them how it works that it does'nt look like a cluster-f.  But lets not spend a lot of time/tokens on making it all shiney and pollished mirror.

### Q21: Module Registry?

Should there be a way to discover/install community modules?

**A) No** - Users share modules manually (copy files)

**B) Git-based**
```bash
forge module install https://github.com/user/forge-aws
```

**C) Registry** (like npm, pypi)
```bash
forge module install aws
# Downloads from registry.forge.dev or similar
```

**My recommendation:** Start with A (manual), add B (git) if there's demand

> If we go git-based which I think we should stronly consider then install/remove/update ye, but discover no.

## Scope Decisions

### Q22: What Should Be Included?

Which modules should be part of the core framework?

**Core framework:**
- [ ] Command system (required)
- [ ] Help system
- [ ] Completion
- [ ] State management
- [ ] Error handling

**Standard library modules:**
- [ ] AWS/aws-vault
- [ ] Terraform
- [ ] Docker
- [ ] Git
- [ ] Kubernetes
- [ ] Ansible

**My recommendation:**
- Core: Yes to all
- Standard lib: Publish separately, reference in docs

> Your recommendations are perfect.

### Q23: Cross-Platform Support?

Should forge support:

**A) Unix only** (Linux, macOS, BSDs)
**B) Unix + WSL** (Windows via WSL)
**C) Native Windows** (cmd.exe, PowerShell)

**Cost:** Windows adds significant complexity

**Your use case:** Do you need Windows support?

> I hate Windows.  But if you can run Bash in Windows it should probably work.  Screw windows c:\foo and powershell trash. ;-)

## Naming Decision

### Q24: Name for New Version?

Should this be:

**A) Forge 2.0** (evolution of current)
**B) New name** (clean break - "kit", "dx", etc.)
**C) Keep "forge"** (smooth transition)

**If new name:**
- Can we keep "forge" as alias for compatibility?
- What about existing projects?

> lets just keep it as forge for now.

## Priority & Timeline

### Q25: What's Most Important?

Rank these features by importance to you:

1. CWD-aware config discovery
2. Shared module repository
3. Help system
4. Shell completion
5. Better error handling
6. Testing support
7. Module versioning
8. Auto-update mechanism

**This helps me prioritize implementation order.**

> 1, 2, 8, 4, 5, 3 ... 6, 7

### Q26: Timeline & Approach

What's your preference?

**A) Quick prototype** (get CWD-awareness working, iterate)
**B) Full redesign** (get all features right before release)
**C) Evolutionary** (improve forge incrementally, maintain compatibility)

**My recommendation:** A (prototype) → test with real projects → B (full redesign)

> A ... I'm still thinking through what is best, so lets explore some options in prototypes.

## Specific Technical Questions

### Q27: Bash Version

You mentioned Bash 4+ requirement. Should we:

**A) Stick with Bash 4.0** (maximum compatibility)
**B) Require Bash 4.3+** (better features, same auto-upgrade)
**C) Require Bash 5.0+** (latest, fewer systems)

**Forge currently handles this well with auto-upgrade. Keep that?**

> need to understand what really is better about > 4.0

### Q28: Commando Module System

The commando module system (define_module, require_module, prepare_module) - thoughts?

**A) Too complex** (agreed, over-engineered)
**B) Useful pattern** (keep but simplify)
**C) Keep for reference** (don't port to new framework)

**My analysis:** Over-engineered for typical use case. Simple sourcing better.

> probably, I though it was novel, but it probably is over engineered

### Q29: Real-World Usage

How many projects currently use:
- Forge: ___
- Commando: ___

How many commands per project typically: ___

> doesn't matter

**This helps me understand scale and requirements.**

## Summary: Most Critical Questions

If you only answer a few, these are the most important:

1. **Q2** - Backward compatibility expectations
2. **Q3** - Config discovery strategy
3. **Q5** - Module repository structure
4. **Q10** - Help system approach
5. **Q26** - Timeline and approach

---

## How to Answer

Feel free to answer inline:

```markdown
### Q1: Installation Method Priority
**Answer:** A - Git clone approach

**Reasoning:** ...
```

Or just list question numbers with brief answers:
```
Q1: A
Q2: B with migration script
Q3: D (walk up + env var)
...
```

I answered above with comments in each section prefixed with "> "

I'll use your answers to create a detailed design proposal and implementation plan.
