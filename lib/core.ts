/**
 * Forge v2 - Core Framework
 *
 * Pure Bun/TypeScript implementation
 */

import { join, dirname } from 'path';
import { existsSync } from 'fs';
import { homedir } from 'os';
import { Command } from 'commander';
import { StateManager } from './state';
import { die, exit } from './helpers';
import type {
  ForgeCommand,
  ForgeConfig,
  ForgeModuleMetadata,
  ForgeProjectContext,
  ForgeContext
} from './types';

// ============================================================================
// Project Discovery
// ============================================================================

/**
 * Walk up directory tree to find .forge2/ directory
 * Similar to how git finds .git/
 */
export async function discoverProject(startDir?: string): Promise<string | null> {
  let dir = startDir || process.cwd();

  // Walk up to root
  while (dir !== '/' && dir !== '.') {
    const forgeDir = join(dir, '.forge2');

    if (existsSync(forgeDir)) {
      return dir;
    }

    const parent = dirname(dir);
    if (parent === dir) break; // Reached root
    dir = parent;
  }

  return null;
}

/**
 * Check for FORGE_PROJECT env var override
 */
export function getProjectRoot(): string | null {
  // Env var override
  if (process.env.FORGE_PROJECT) {
    const envPath = process.env.FORGE_PROJECT;
    if (existsSync(join(envPath, '.forge2'))) {
      return envPath;
    }
    die(`FORGE_PROJECT=${envPath} but .forge2/ not found`);
  }

  return null;
}

// ============================================================================
// XDG Base Directory Paths
// ============================================================================

function getXDGDataHome(): string {
  return process.env.XDG_DATA_HOME || join(homedir(), '.local', 'share');
}

function getXDGConfigHome(): string {
  return process.env.XDG_CONFIG_HOME || join(homedir(), '.config');
}

function getXDGCacheHome(): string {
  return process.env.XDG_CACHE_HOME || join(homedir(), '.cache');
}

function getXDGStateHome(): string {
  return process.env.XDG_STATE_HOME || join(homedir(), '.local', 'state');
}

/**
 * Get forge2 installation paths (XDG-compliant)
 */
export function getForgePaths() {
  return {
    data: join(getXDGDataHome(), 'forge2'),
    config: join(getXDGConfigHome(), 'forge2'),
    cache: join(getXDGCacheHome(), 'forge2'),
    state: join(getXDGStateHome(), 'forge2'),
    modules: join(getXDGDataHome(), 'forge2', 'modules'),
    runtime: join(getXDGDataHome(), 'forge2', 'runtime'),
  };
}

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
  const commands: Record<string, ForgeCommand> = {};
  let groupName: string | false = deriveGroupName(modulePath);
  let description: string | undefined;

  // Resolve module path (relative to .forge2/)
  const fullPath = modulePath.startsWith('.')
    ? join(forgeDir, modulePath)
    : modulePath;

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

  constructor(projectRoot: string, globalOptions: Record<string, any> = {}) {
    this.projectContext = {
      projectRoot,
      forgeDir: join(projectRoot, '.forge2'),
      cwd: process.cwd(),
    };
    this.state = new StateManager(projectRoot);
    this.globalOptions = globalOptions;
  }

  async loadConfig(): Promise<void> {
    try {
      // Load layered config (user + project + local)
      const { loadLayeredConfig } = await import('./config-loader');
      const { config: userConfigDir } = getForgePaths();

      this.config = await loadLayeredConfig(this.projectContext.projectRoot, userConfigDir);

      // Verify we got a valid config
      if (!this.config) {
        die(`No config found in ${this.projectContext.forgeDir}`);
      }

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
    console.log(`usage: forge2 <command> [options]\n`);
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
}

// ============================================================================
// Commander Integration
// ============================================================================

/**
 * Build a Commander Command from a ForgeCommand definition
 * This is the bridge between our simple config and Commander's parsing
 */
export function buildCommanderCommand(
  name: string,
  forgeCmd: ForgeCommand,
  groupName?: string,
  forge?: Forge
): Command {
  // 1. Create Commander Command
  const cmd = new Command(name);
  cmd.description(forgeCmd.description);

  if (forgeCmd.usage) {
    cmd.usage(forgeCmd.usage);
  }

  // 2. Let command customize Commander Command (if defined)
  if (forgeCmd.defineCommand) {
    forgeCmd.defineCommand(cmd);
  } else {
    // If no defineCommand, allow unknown arguments/options
    cmd.allowUnknownOption(true);
    cmd.allowExcessArguments(true);
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
    const context: ForgeContext = forge
      ? {
          forge,
          config: forge.config!,
          settings: (groupName && forge.config?.settings)
            ? (forge.config.settings[`${groupName}.${name}`] || {})
            : {},
          state: forge.state,
          groupName,
          commandName: name,
        }
      : {
          forge: {} as any, // Fallback if no forge instance
          config: {} as any,
          settings: {},
          state: {} as any,
          commandName: name,
        };

    try {
      await forgeCmd.execute(options, positionalArgs, context);
    } catch (err) {
      die(`Command failed: ${name}\n${err}`);
    }
  });

  return cmd;
}
