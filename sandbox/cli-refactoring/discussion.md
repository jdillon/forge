⏺ Current State Analysis

  cli.ts is doing too much (lines 288-421):
  1. Bootstrap CLI args
  2. Initialize logging  ✓ (belongs here)
  3. Project discovery (await findProjectRoot)
  4. Symlink management (await import module-symlink)
  5. Config loading (await import config-loader)
  6. Dependency installation (await import auto-install)
  7. Restart coordination (exit with magic code)
  8. Build CLI via buildRealCLI which:
    - Imports Forge (await import core)
    - Creates Forge
    - Calls forge.loadBuiltins()
    - Calls forge.loadConfig()
    - Calls forge.registerCommands()
  9. Commander error handling

  Current Forge responsibilities (core.ts):
  - loadBuiltins()
  - loadConfig()
  - registerCommands()
  - buildCommanderCommand()

  Architecture Questions

  Before proposing a refactor, I need to understand your intent:

  1. Restart handling: The auto-install can trigger a process restart (exit code 42). Should:
    - Forge handle this internally and return a "needs restart" signal?
    - Or should cli.ts coordinate the restart after Forge setup?
  2. Project discovery timing: Should Forge:
    - Accept a startDir and find the project itself?
    - Or receive a pre-discovered ProjectConfig?
  3. Logging dependency: Forge methods use loggers. Should:
    - Logging always be initialized before Forge is created?
    - Or should Forge initialize logging if needed?
  4. No-project scenarios: For --help/--version outside projects:
    - Should Forge gracefully handle null projectConfig (already does)?
    - Should builtins work without a project (they should)?
  5. Symlink + dependency management: These feel infrastructure-level. Should:
    - Forge own this (setup phase)?
    - Or should a separate "ForgeBootstrap" class handle it?

  Proposed Refactoring Options

  Option A: Forge.initialize() - Single setup phase

  // cli.ts becomes minimal
  async function run() {
    const bootstrapConfig = bootstrap(process.argv.slice(2));
    initLogging(bootstrapConfig);

    const forge = new Forge(bootstrapConfig);
    const needsRestart = await forge.initialize();  // All setup
    if (needsRestart) exit(RESTART_EXIT_CODE);

    const program = await forge.buildCLI();
    await program.parseAsync(cliArgs, { from: "user" });
  }

  // Forge.initialize() does:
  // - Project discovery
  // - Symlink creation
  // - Config loading
  // - Dependency installation
  // - Returns restart flag

  Option B: Multi-phase Forge (my recommendation)

  // cli.ts - clear phases
  async function run() {
    const bootstrapConfig = bootstrap(process.argv.slice(2));
    initLogging(bootstrapConfig);

    const forge = await Forge.create(bootstrapConfig);  // Static factory
    // Factory handles: project discovery, symlinks, deps, restart check

    const program = forge.buildCLI();  // Sync - already initialized
    await program.parseAsync(cliArgs, { from: "user" });
  }

  // Forge.create() async factory:
  // - Discovers project
  // - Creates Forge instance
  // - Calls internal setup()
  // - Handles restart (throws special error or calls process.exit)
  // - Returns ready Forge

  // forge.buildCLI() synchronous:
  // - loadBuiltins() - already sync (just import)
  // - loadConfig() - already loaded in create()
  // - registerCommands()
  // - Returns Commander program

  Option C: Separate Bootstrap class

  // Separate infrastructure concerns
  class ForgeBootstrap {
    static async setup(config: BootstrapConfig): Promise<ProjectConfig | null> {
      // Project discovery, symlinks, deps
    }
  }

  // cli.ts
  async function run() {
    const config = bootstrap(process.argv.slice(2));
    initLogging(config);

    const projectConfig = await ForgeBootstrap.setup(config);

    const forge = new Forge(projectConfig, config);
    const program = await forge.buildCLI();
    await program.parseAsync(cliArgs, { from: "user" });
  }

  My Recommendation: Option B

  Why:
  - Single entry point: Forge.create() is clear contract
  - Encapsulation: All Forge concerns (discovery, setup, commands) inside Forge
  - No restart logic in cli.ts: Factory can exit(42) internally
  - Minimal cli.ts: Just bootstrap → logging → Forge → execute

  What moves into Forge:
  - Project discovery (from cli.ts line 320-325)
  - Symlink management (from cli.ts line 335-336)
  - Config loading - already partially there
  - Dependency installation (from cli.ts line 347-354)
  - Restart coordination (from cli.ts line 358-361)

  What stays in cli.ts:
  - Bootstrap arg parsing
  - Logging initialization
  - Commander error handling
  - Entry point orchestration

  Resulting cli.ts would be ~100 lines vs current ~470 lines.

  Should I proceed with Option B, or do you prefer A/C, or have different architectural preferences?

  # ANSWERS

  1) forge can use a notification to indicate restart needed, cli should probably handle actual process.exit invoke; as that is part
  of teh _cli abstraction_.
  2) in order to handle bootstrap config we have to resolve some bits of project, so we can detetct settings in .forge/config.yml.
  what we might want is a seperate module, which handles all config loading, ie. cli bootstrap runs to extract options, then we hand the options/args over to a config resolver; that fully resolves forge config.  Then we hand that config to Forge instance.
  3) generally my philosopy is everything shoudl use logging.  The problem is how do you bootstrap to configure logging.  For now we want to isolate cli.ts and per-2 config resolver module to be varey careful about logging (eventually *not now* we'll add a Bootstrap logger that uses a special Pino setup that we can control via-env-var, etc).  Everything else I would like to have loggers, though i'm not a huge fan of module loggers, except when there isn't a class or other useful place to have a per-context named logger.
  4) yes, no-project is still valid.  though we should have that clear in the config, as for example when we register builtin commands, some of these commands may not be appropriate unless there is a project in context.  Some will though.
  5) since config for now is yml (it supports ts, but we'll have to see how that behaves, but the intent is not that even with ts that it should be importing or using forge libraries like logger), we don't need to have the config resolve require do the fancy symlink handling.  symlink handling is really when we go to `import()` command modules so that we ensure they load dependencies from $FORGE_HOME/node_modules.  However depending on what we might run into
  this could be considered as part of config-resolution step.  So I think we A: should have that bit of logic clearly isolated into af helper (incase we have to move it later) and probably can for now plan on defering that step until we load command modules (which happens inside of some Forge.addModule method or something).  It abs could also make sense to do then in the config resolver, which needs to resolve if there is a .forge/ project directory in scope.  TBH i'm not sure yet here the responsiblity for this lies.

# REFACTOR OPTIONS

I don't think any of A, B, or C is reasaonble.  B is close, *BUT* to resolve bootstrap config so we can bootstrap logging, I think we want to allow .forge/config.yml to influence this.  I know we don't support it *yet* but imagine we hae a config options that says: "logger.log-level": "DEBUG", I would want that to be taken but overridable by cli or maybe ENV-var. 

All of this is surrounded by an exception handler:
* catches exceptions for emitting as either console.err
* OR
* if logging is initialized a log.error

So we do want to have an explicit configuration resolver:
* resolve phase1-parsing of CLI to get forge options (logging, settings def, etc)
* resolve env-vars
* detect if ther is a .forge dir
* read the .forge config file
* merge config with forge-home config and defaults config

And then we can:
* bootstrap logging(with merged config)
* create forge instance(with merged config)

For init with project:
* symlink to prepare for ts module loading
* load modules and resolve dependencies
* load builtins (including project context aware)
* emit restart signal if needed

For init without project:
* load builtins (excluding project context aware)
* emit restart signal if needed (maybe forge auto-update was triggered or something like that)

Cli now has a fully configured Forge:
* creates a phase-2 program to execute user requested command
* ask it to append cli sub-commands to program
* execute program
* handles adaption of commander-js exception codes

---

Review and restate so we are on the same page.
Are there any other cases we are missing?
Any other open questions need answering?
We are ~55% context use presently.  We should capture the refactor plan here as a MD file so that this important conversation and refactoring plan isn't lost if we need to compact or clear+resume.
This File is in tmp/tmp.md,  lets move this plus your updated docs to a sandbox/ directory to track this important work.

---

Phase flow feedbacK;

for 2 "Merge: .forge/config.yml → forge-home config → defaults" this is the future plan, we can/should defer actually merging until we have the current rfactor sorted.  comment where it goes is good enough.  Simlar for ENV we have a few env-vars we support now.  We might support a wider ranger, we can/should defer anything but the simple ENV handling until later (just comment).   "No logging here (or very careful)" ... lets add a log() function that we can use, that will just write tou console.log() for now so we can still trace this critical implementation.  I'll replace it later with something better.

for 6. " forge.buildCLI() → returns Commander program with all commands", this needs to take a program so that cli.ts can prepare with teh common options.

Open questions feedback:

1. B
2. it should include all of the above.  This should be all of the config needed to initialize a forge instance.
3. we will need to make something on the forge command reigstration that indicates this.  its per-command not per-module.  We can defer this refactor but make sure the point where we configure builtins has information to tell one way or other other; and put a "TODO: ..." comments for now is fine, if not prefered until we get the overall architecture resolved.
4. ATM we are using an exception/notification as a singal.  This is probably fine for now.  We use that to cope with commands asking for exit as well & controlling for tests to handle when exit happens, w/o actually killing a test case process ;-) We could consider this later but for now lets use a throwable notification.
5. private log() function in config resolver module.  will replace later with something else.  Or we could just make a private log created with a bootstrap pino impl.  and then log.debug() everywhere.  

Missing cases feedbacK:

`  - ❓ Config file has errors (yml parse failure)?` expect an exception with information to be thrown, cli. error handler shows the error and trace.
`Conflicting CLI options (e.g., --debug --silent)?` ... add a TODO to resolve in future
`Invalid project structure (.forge exists but no config.yml)?` ... log warning, can probably continue to bootup (this is just user didn't configure anything so project in context but file is missing, add built ins)?
`Circular module dependencies?` how does bun work?  we are using bun to resolve, all we are doing is abstratct the config to our yml, but we still have to figure out what we need to add/udpate and then asking bun to resolve dependencies.  I would expect an exception to be thrown if an Bun operation fails.

"  Should I capture this discussion in sandbox/cli-refactoring-plan.md?" -> lets use "sandbox/cli-refactoring/plan.md" and then move the tmp/tmp.md to that directory to keep things together. for contenxt reset/resume.
