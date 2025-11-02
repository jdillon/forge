/**
 * Forge v2 - Core Framework
 *
 * Pure Bun/TypeScript implementation
 */

import { join, dirname, resolve } from 'path';
import { existsSync } from 'fs';
import { Command } from 'commander';
import { StateManager } from './state';
import { die, exit } from './helpers';
import { getForgePaths } from './xdg';
import { getLoggerConfig, log } from './logger';
import type {
  ForgeCommand,
  ForgeConfig,
  ForgeModuleMetadata,
  ForgeProjectContext,
  ForgeContext
} from './types';

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
 * Auto-discover ForgeCommands from a module's exports
 * Returns: { groupName, description, commands }
 */
export async function loadModule(
  modulePath: string,
  forgeDir: string
): Promise<{ groupName: string | false; description?: string; commands: Record<string, ForgeCommand> }> {
  const debug = process.env.FORGE_DEBUG === '1' || process.argv.includes('--debug');
  const commands: Record<string, ForgeCommand> = {};
  let groupName: string | false = deriveGroupName(modulePath);
  let description: string | undefined;

  log.debug({ modulePath, groupName }, 'Loading module');

  // Resolve module path with priority: local → shared
  const { resolveModule } = await import('./module-resolver');
  const fullPath = await resolveModule(modulePath, forgeDir);

  log.debug({ fullPath }, 'Module resolved');

  try {
    const module = await import(fullPath);

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

    log.debug({ commands: Object.keys(commands) }, 'Commands discovered');

    return { groupName, description, commands };
  } catch (err) {
    die(`Failed to load module ${modulePath}: ${err}`);
  }
}

// ============================================================================
// Command Execution
// ============================================================================

/**
 * Main forge runner
 */
export class Forge {
  private projectContext: ForgeProjectContext;
  public config: ForgeConfig | null = null;  // Public so commands can access settings

  // Command groups (subcommands)
  public commandGroups: Record<string, {
    description?: string;
    commands: Record<string, ForgeCommand>;
  }> = {};

  public state: StateManager;
  public globalOptions: Record<string, any>;

  constructor(projectRoot: string | null, globalOptions: Record<string, any> = {}) {
    this.projectContext = {
      projectRoot: projectRoot || '',
      forgeDir: projectRoot ? join(projectRoot, '.forge2') : '',
      cwd: process.cwd(),
    };
    this.state = projectRoot ? new StateManager(projectRoot) : null as any;
    this.globalOptions = globalOptions;
  }

  async loadConfig(): Promise<void> {
    const debug = process.env.FORGE_DEBUG === '1' || process.argv.includes('--debug');

    // Skip loading config if no project root (for --help/--version)
    if (!this.projectContext.projectRoot) {
      this.config = null;
      return;
    }

    try {
      // Load layered config (user + project + local)
      const { loadLayeredConfig } = await import('./config-loader');
      const { config: userConfigDir } = getForgePaths();

      this.config = await loadLayeredConfig(this.projectContext.projectRoot, userConfigDir);

      // Verify we got a valid config
      if (!this.config) {
        die(`No config found in ${this.projectContext.forgeDir}`);
      }

      log.debug({ modules: this.config.modules }, 'Loading modules');

      // Auto-discover commands from modules
      if (this.config?.modules) {
        for (const modulePath of this.config.modules) {
          const { groupName, description, commands } = await loadModule(modulePath, this.projectContext.forgeDir);

          if (groupName !== false) {
            // Store commands under group
            if (!this.commandGroups[groupName]) {
              this.commandGroups[groupName] = { commands: {} };
            }

            // Set description if provided
            if (description) {
              this.commandGroups[groupName].description = description;
            }

            // Merge discovered commands (last wins)
            Object.assign(this.commandGroups[groupName].commands, commands);
          }
          // else: groupName === false means top-level, skip for now
        }
      }

      const groups = Object.keys(this.commandGroups);
      const groupDetails = Object.fromEntries(
        Object.entries(this.commandGroups).map(([group, data]) => [group, Object.keys(data.commands)])
      );
      log.debug({ groups, groupDetails }, 'Command groups registered');
    } catch (err) {
      die(`Failed to load config: ${err}`);
    }
  }

  async run(commandName: string, args: string[]): Promise<void> {
    if (!this.config) {
      await this.loadConfig();
    }

    // Handle no command (use default if set)
    if (!commandName) {
      if (this.config!.defaultCommand) {
        commandName = this.config!.defaultCommand;
      } else {
        this.showUsage();
        exit(0);
      }
    }

    // Find command
    const command = this.commands[commandName];

    if (!command) {
      this.showUsage();
      die(`Unknown command: ${commandName}`);
    }

    // Execute command
    try {
      await command.execute(args, []);
    } catch (err) {
      die(`Command failed: ${commandName}\n${err}`);
    }
  }

  private showUsage(): void {
    console.log(`usage: forge <command> [options]\n`);
    console.log('Available commands:\n');

    const commands = Object.entries(this.commands);
    if (commands.length === 0) return;

    const maxLen = Math.max(...commands.map(([name]) => name.length));

    for (const [name, cmd] of commands) {
      const padding = ' '.repeat(maxLen - name.length + 2);
      console.log(`  ${name}${padding}${cmd.description}`);
    }
  }

  getContext(): ForgeContext {
    return this.context;
  }

  /**
   * Register all discovered commands with Commander program
   * This is the bridge between Forge and Commander
   */
  async registerCommands(program: Command): Promise<void> {
    log.debug({ groupCount: Object.keys(this.commandGroups).length }, 'Registering command groups with Commander');

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
        color: loggerConfig.color,
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

