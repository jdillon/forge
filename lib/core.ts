/*
 * Copyright 2025 Jason Dillon
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { Command } from 'commander';
import { StateManager } from './state';
import { die, ExitNotification } from './helpers';
import { getLoggerConfig, createLogger } from './logging';
import { rewriteModulePath, symlinkForgeDir } from './module-symlink';
import { resolveModule } from './module-resolver';
import { autoInstallDependencies, RESTART_EXIT_CODE } from './auto-install';
import * as builtins from './builtins';
import type { Logger } from './logging';
import type {
  ForgeCommand,
  ForgeConfig,
  ForgeModuleMetadata,
  ForgeContext,
} from './types';

const log = createLogger('core');

// ============================================================================
// Module Loading & Command Discovery
// ============================================================================

/**
 * Check if an object looks like a ForgeCommand (duck typing)
 */
function isForgeCommand(obj: any): obj is ForgeCommand {
  return obj
    && typeof obj === 'object'
    && typeof obj.description === 'string'
    && typeof obj.execute === 'function';
}

/**
 * Derive group name from module path
 * './website' → 'website'
 * './website.ts' → 'website'
 * '@forge/aws' → 'aws'
 */
function deriveGroupName(modulePath: string): string {
  const basename = modulePath.split('/').pop() || '';
  return basename.replace(/\.(ts|js|mjs)$/, '');
}

/**
 * Discover ForgeCommands from a module's exports
 *
 * Extracts command definitions from:
 * - Named exports (e.g., export const myCmd: ForgeCommand)
 * - Default export (if it's an object containing commands)
 * - __module__ metadata for group name and description
 *
 * @param module - The imported module object
 * @param defaultGroupName - Default group name if not specified in __module__
 * @returns Object with groupName, description, and discovered commands
 */
export function discoverCommands(
  module: any,
  defaultGroupName?: string | false
): { groupName: string | false; description?: string; commands: Record<string, ForgeCommand> } {
  const commands: Record<string, ForgeCommand> = {};
  let groupName: string | false = defaultGroupName ?? false;
  let description: string | undefined;

  log.debug({ defaultGroupName }, 'Starting command discovery');

  // Check for __module__ metadata export
  if (module.__module__) {
    const metadata = module.__module__ as ForgeModuleMetadata;
    log.debug({ metadata }, 'Found __module__ metadata');

    if (metadata.group !== undefined) {
      groupName = metadata.group;
      log.debug({ override: groupName }, 'Group name overridden by metadata');
    }
    description = metadata.description;
  }

  // First: Check default export (could be object of commands)
  if (module.default && typeof module.default === 'object') {
    const defaultExportCount = Object.keys(module.default).length;
    log.debug({ exportCount: defaultExportCount }, 'Scanning default export');

    for (const [name, value] of Object.entries(module.default)) {
      if (isForgeCommand(value)) {
        commands[name] = value as ForgeCommand;
        log.debug({ name, source: 'default export' }, 'Command discovered');
      } else {
        log.debug({ name, type: typeof value }, 'Default export entry is not a command');
      }
    }
  }

  // Second: Check all named exports
  const namedExports = Object.keys(module).length;
  log.debug({ namedExports }, 'Scanning named exports');

  for (const [name, value] of Object.entries(module)) {
    if (name === 'default' || name === '__module__') {
      log.debug({ name }, 'Skipping metadata export');
      continue;
    }

    if (isForgeCommand(value)) {
      // Named export becomes command name
      commands[name] = value as ForgeCommand;
      log.debug({ name, source: 'named export' }, 'Command discovered');
    }
  }

  log.debug({
    groupName,
    commandCount: Object.keys(commands).length,
    commands: Object.keys(commands)
  }, 'Command discovery complete');

  return { groupName, description, commands };
}

/**
 * Load a module from a path and discover its commands
 *
 * Handles:
 * - Module resolution (local .forge2/ or npm package)
 * - Symlink rewriting for correct forge instance
 * - Command discovery via discoverCommands()
 *
 * @param modulePath - Module path (relative, absolute, or package name)
 * @param forgeDir - Forge directory for resolution
 * @returns Object with groupName, description, and discovered commands
 */
export async function loadModule(
  modulePath: string,
  forgeDir: string
): Promise<{ groupName: string | false; description?: string; commands: Record<string, ForgeCommand> }> {
  const defaultGroupName = deriveGroupName(modulePath);

  log.debug({ modulePath, defaultGroupName, forgeDir }, 'Starting module load');

  // Resolve module path with priority: local → shared
  const resolveStart = Date.now();
  const fullPath = await resolveModule(modulePath, forgeDir);
  const resolveDuration = Date.now() - resolveStart;

  log.debug({ durationMs: resolveDuration, fullPath }, 'Module path resolved');

  // Rewrite path to go through symlink in node_modules
  // This ensures user commands import forge from the correct instance
  // Requires bun --preserve-symlinks
  const symlinkStart = Date.now();
  const symlinkPath = await rewriteModulePath(fullPath, forgeDir);
  const symlinkDuration = Date.now() - symlinkStart;

  log.debug({
    durationMs: symlinkDuration,
    original: fullPath,
    symlinked: symlinkPath
  }, 'Path rewritten through symlink');

  const url = import.meta.resolve(symlinkPath, import.meta.url);
  log.debug({ url }, 'Import URL computed');

  const importStart = Date.now();
  const module = await import(url);
  const importDuration = Date.now() - importStart;

  log.debug({ durationMs: importDuration }, 'Module imported');

  // Discover commands from module exports
  return discoverCommands(module, defaultGroupName);
}

// ============================================================================
// Command Execution
// ============================================================================

/**
 * Main forge runner
 */
export class Forge {
  public config: ForgeConfig;  // Public so commands can access
  private log: Logger;

  // Top-level commands (no group)
  public topLevelCommands: Record<string, ForgeCommand> = {};

  // Command groups (subcommands)
  public commandGroups: Record<string, {
    description?: string;
    commands: Record<string, ForgeCommand>;
  }> = {};

  public state: StateManager;
  public globalOptions: Record<string, any>;

  constructor(config: ForgeConfig) {
    this.log = createLogger('forge');
    this.log.debug({ config });

    this.config = config;

    // Create state manager if project present
    this.state = config.projectPresent && config.projectRoot
      ? new StateManager(config.projectRoot)
      : null as any;

    // Store bootstrap options as global options
    this.globalOptions = {
      debug: config.debug,
      quiet: config.quiet,
      silent: config.silent,
      logLevel: config.logLevel,
      logFormat: config.logFormat,
      colorMode: config.colorMode,
    };
  }

  /**
   * Register commands from a module into the appropriate location
   * - groupName === false → top-level commands
   * - groupName === string → command group
   *
   * @param groupName - Group name or false for top-level
   * @param description - Optional group description
   * @param commands - Commands to register
   */
  private registerCommandGroup(
    groupName: string | false,
    description: string | undefined,
    commands: Record<string, ForgeCommand>
  ): void {
    if (groupName === false) {
      // Top-level commands
      Object.assign(this.topLevelCommands, commands);
      log.debug({ commands: Object.keys(commands) }, 'Registered top-level commands');
    } else {
      // Command group
      if (!this.commandGroups[groupName]) {
        this.commandGroups[groupName] = { commands: {} };
      }

      if (description) {
        this.commandGroups[groupName].description = description;
      }

      Object.assign(this.commandGroups[groupName].commands, commands);
      log.debug({ groupName, commands: Object.keys(commands) }, 'Registered command group');
    }
  }

  /**
   * Initialize Forge instance
   *
   * Handles:
   * - Loading builtin commands (always)
   * - Symlink setup (if project present)
   * - Loading config and user modules (if project present)
   * - Dependency installation (if project present)
   *
   * @throws ExitNotification if restart needed after dependency installation
   */
  async initialize(): Promise<void> {
    log.debug('Starting Forge initialization');

    // 1. Always load builtins (available everywhere)
    log.debug('Phase 1: Loading builtins');
    const builtinStart = Date.now();
    const { groupName, description, commands } = discoverCommands(builtins, false);
    this.registerCommandGroup(groupName, description, commands);
    const builtinDuration = Date.now() - builtinStart;

    log.debug({
      durationMs: builtinDuration,
      commandCount: Object.keys(commands).length
    }, 'Builtins loaded');

    // TODO: Implement project-context filtering for builtins
    // Some builtins should only be available in project context
    // Need per-command flag: { requiresProject: boolean }

    // 2. If no project, we're done
    if (!this.config.projectPresent || !this.config.projectRoot || !this.config.forgeDir) {
      log.debug({
        projectPresent: this.config.projectPresent,
        projectRoot: this.config.projectRoot
      }, 'No project context, skipping module loading');
      return;
    }

    log.debug({
      projectRoot: this.config.projectRoot,
      forgeDir: this.config.forgeDir
    }, 'Project context available');

    // 3. Setup symlink for .forge2 directory
    log.debug('Phase 2: Setting up .forge2 symlink');
    const symlinkStart = Date.now();
    await symlinkForgeDir(this.config.forgeDir);
    const symlinkDuration = Date.now() - symlinkStart;

    log.debug({ durationMs: symlinkDuration }, 'Symlink setup complete');

    // 4. Auto-install dependencies if needed
    if (this.config.dependencies && this.config.dependencies.length > 0) {
      log.debug({ count: this.config.dependencies.length }, 'Phase 3: Checking dependencies');
      const depsStart = Date.now();

      const needsRestart = await autoInstallDependencies(
        this.config,
        this.config.forgeDir,
        this.config.isRestarted,
      );

      const depsDuration = Date.now() - depsStart;
      log.debug({ durationMs: depsDuration, needsRestart }, 'Dependency check complete');

      if (needsRestart) {
        log.debug('Dependencies installed, requesting restart');
        // Signal restart via ExitNotification
        throw new ExitNotification(RESTART_EXIT_CODE);
      }
    } else {
      log.debug('No dependencies declared, skipping');
    }

    // 5. Load user modules
    if (this.config.modules && this.config.modules.length > 0) {
      log.debug({ count: this.config.modules.length }, 'Phase 4: Loading user modules');
      const modulesStart = Date.now();

      for (const modulePath of this.config.modules) {
        const moduleStart = Date.now();
        const { groupName, description, commands } = await loadModule(
          modulePath,
          this.config.forgeDir
        );
        const moduleDuration = Date.now() - moduleStart;

        log.debug({
          modulePath,
          durationMs: moduleDuration,
          commandCount: Object.keys(commands).length
        }, 'Module loaded');

        this.registerCommandGroup(groupName, description, commands);
      }

      const modulesDuration = Date.now() - modulesStart;
      log.debug({ durationMs: modulesDuration }, 'All modules loaded');
    } else {
      log.debug('No user modules declared, skipping');
    }

    // Final summary
    const topLevel = Object.keys(this.topLevelCommands);
    const groups = Object.keys(this.commandGroups);
    const groupDetails = Object.fromEntries(
      Object.entries(this.commandGroups).map(([group, data]) => [group, Object.keys(data.commands)])
    );
    log.debug({ topLevel, groups, groupDetails }, 'Forge initialization complete');
  }

  /**
   * Register all discovered commands with Commander program
   * This is the bridge between Forge and Commander
   */
  async registerCommands(program: Command): Promise<void> {
    log.debug(
      { topLevelCount: Object.keys(this.topLevelCommands).length, groupCount: Object.keys(this.commandGroups).length },
      'Registering commands with Commander'
    );

    // Register top-level commands first
    for (const [cmdName, forgeCmd] of Object.entries(this.topLevelCommands)) {
      const cmd = this.buildCommanderCommand(cmdName, forgeCmd);
      cmd.copyInheritedSettings(program);  // Copy inherited settings from program
      program.addCommand(cmd);
      log.debug({ cmdName }, 'Registered top-level command');
    }

    // Register command groups as subcommands
    for (const [groupName, group] of Object.entries(this.commandGroups)) {
      // Create group subcommand
      const groupCmd = new Command(groupName);
      groupCmd.copyInheritedSettings(program);  // Copy inherited settings from parent

      // Set description if provided
      if (group.description) {
        groupCmd.description(group.description);
      }

      // Add each command to the group
      for (const [cmdName, forgeCmd] of Object.entries(group.commands)) {
        const cmd = this.buildCommanderCommand(cmdName, forgeCmd, groupName);
        cmd.copyInheritedSettings(groupCmd);  // Copy from group command
        groupCmd.addCommand(cmd);
      }

      log.debug({ groupName, commandCount: Object.keys(group.commands).length, subcommands: groupCmd.commands.map(c => c.name()) }, 'Registering command group');
      program.addCommand(groupCmd);
    }

    log.debug({ totalCommands: program.commands.length }, 'Commander registration complete');
  }

  /**
   * Build a Commander Command from a ForgeCommand definition
   * Internal method - bridges Forge commands to Commander
   */
  private buildCommanderCommand(
    name: string,
    forgeCmd: ForgeCommand,
    groupName?: string
  ): Command {
    // 1. Create Commander Command
    const cmd = new Command(name);
    cmd.description(forgeCmd.description);

    // 2. Let command customize Commander Command (if defined)
    if (forgeCmd.defineCommand) {
      forgeCmd.defineCommand(cmd);
    } else {
      // No defineCommand - use simple model: usage string + allowUnknown
      if (forgeCmd.usage) {
        // Add usage as argument definition (e.g., '<text...>' or '[options]')
        cmd.argument(forgeCmd.usage, '');
      } else {
        // No usage specified - allow any arguments
        cmd.allowUnknownOption(true);
        cmd.allowExcessArguments(true);
      }
    }

    // 3. Install action handler that calls our execute function
    cmd.action(async (...actionArgs) => {
      // Commander passes: (arg1, arg2, ..., options, command)
      // Last arg is Command object
      const command = actionArgs[actionArgs.length - 1] as Command;
      const options = actionArgs[actionArgs.length - 2];

      // Get positional args from command.args (for commands without defineCommand)
      // or from the action args (for commands with defineCommand)
      const positionalArgs = command.args.length > 0
        ? command.args
        : actionArgs.slice(0, -2) as string[];

      // Build ForgeContext for command
      const loggerConfig = getLoggerConfig();
      const context: ForgeContext = {
        forge: this,
        config: this.config!,
        settings: (groupName && this.config?.settings)
          ? (this.config.settings[`${groupName}.${name}`] || {})
          : {},
        state: this.state,
        groupName,
        commandName: name,
        logLevel: loggerConfig.level,
        logFormat: loggerConfig.format,
        colorMode: loggerConfig.colorMode,
      };

      try {
        await forgeCmd.execute(options, positionalArgs, context);
      } catch (err) {
        die(`Command failed: ${name}\n${err}`);
      }
    });

    return cmd;
  }
}

