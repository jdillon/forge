/**
 * Forge v2 - Core Framework
 *
 * Pure Bun/TypeScript implementation
 */

import { Command } from 'commander';
import { StateManager } from './state';
import { die, ExitNotification } from './helpers';
import { getLoggerConfig, createLogger } from './logging';
import { rewriteModulePath, symlinkForgeDir } from './module-symlink';
import { resolveModule } from './module-resolver';
import { autoInstallDependencies, RESTART_EXIT_CODE } from './auto-install';
import * as builtins from './builtins';
import type pino from 'pino';
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

  // Check for __module__ metadata export
  if (module.__module__) {
    const metadata = module.__module__ as ForgeModuleMetadata;
    if (metadata.group !== undefined) {
      groupName = metadata.group;
    }
    description = metadata.description;
  }

  // First: Check default export (could be object of commands)
  if (module.default && typeof module.default === 'object') {
    for (const [name, value] of Object.entries(module.default)) {
      if (isForgeCommand(value)) {
        commands[name] = value as ForgeCommand;
      }
    }
  }

  // Second: Check all named exports
  for (const [name, value] of Object.entries(module)) {
    if (name === 'default' || name === '__module__') continue;  // Skip metadata

    if (isForgeCommand(value)) {
      // Named export becomes command name
      commands[name] = value as ForgeCommand;
    }
  }

  log.debug({ groupName, commands: Object.keys(commands) }, 'Commands discovered');

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

  log.debug({ modulePath, defaultGroupName }, 'Loading module');

  // Resolve module path with priority: local → shared
  const fullPath = await resolveModule(modulePath, forgeDir);

  log.debug({ fullPath }, 'Module resolved');

  // Rewrite path to go through symlink in node_modules
  // This ensures user commands import forge from the correct instance
  // Requires bun --preserve-symlinks
  const symlinkPath = await rewriteModulePath(fullPath, forgeDir);
  log.debug({ original: fullPath, symlink: symlinkPath }, 'Using symlinked path');

  const url = import.meta.resolve(symlinkPath, import.meta.url);
  log.debug({ url }, 'Importing module');

  const module = await import(url);

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
  private log: pino.Logger;

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
    // 1. Always load builtins (available everywhere)
    log.debug('Loading builtins');
    const { groupName, description, commands } = discoverCommands(builtins, false);
    this.registerCommandGroup(groupName, description, commands);

    // TODO: Implement project-context filtering for builtins
    // Some builtins should only be available in project context
    // Need per-command flag: { requiresProject: boolean }

    // 2. If no project, we're done
    if (!this.config.projectPresent || !this.config.projectRoot || !this.config.forgeDir) {
      log.debug('No project present, skipping module/dependency loading');
      return;
    }

    // 3. Setup symlink for .forge2 directory
    await symlinkForgeDir(this.config.forgeDir);

    log.debug({ modules: this.config.modules }, 'Loading user modules');

    // 4. Auto-install dependencies if needed
    if (this.config.dependencies && this.config.dependencies.length > 0) {
      const needsRestart = await autoInstallDependencies(
        this.config,
        this.config.forgeDir,
        this.config.isRestarted,
      );

      if (needsRestart) {
        // Signal restart via ExitNotification
        throw new ExitNotification(RESTART_EXIT_CODE);
      }
    }

    // 5. Load user modules
    if (this.config.modules && this.config.modules.length > 0) {
      for (const modulePath of this.config.modules) {
        const { groupName, description, commands } = await loadModule(
          modulePath,
          this.config.forgeDir
        );
        this.registerCommandGroup(groupName, description, commands);
      }
    }

    const topLevel = Object.keys(this.topLevelCommands);
    const groups = Object.keys(this.commandGroups);
    const groupDetails = Object.fromEntries(
      Object.entries(this.commandGroups).map(([group, data]) => [group, Object.keys(data.commands)])
    );
    log.debug({ topLevel, groups, groupDetails }, 'Commands registered');
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

