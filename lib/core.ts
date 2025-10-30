/**
 * Forge v2 - Core Framework
 *
 * Pure Bun/TypeScript implementation
 */

import { join, dirname } from 'path';
import { existsSync } from 'fs';
import { homedir } from 'os';
import { Command } from 'commander';

// ============================================================================
// Types
// ============================================================================

export interface ForgeCommand {
  description: string;
  usage?: string;

  // Optional: Let command customize Commander Command object
  // Just mutate cmd directly, no need to return
  defineCommand?: (cmd: Command) => void;

  // Execute with parsed options from Commander
  // options: parsed flags/options object
  // args: positional arguments array (always present, may be empty)
  execute: (options: any, args: string[]) => Promise<void>;
}

export interface ForgeConfig {
  // Module paths to auto-discover commands from
  modules: string[];

  // Optional default command when none specified
  defaultCommand?: string;

  // Future: configuration settings
  // config?: Record<string, any>;
}

export interface ForgeContext {
  projectRoot: string;
  forgeDir: string;
  cwd: string;
}

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
    console.error(`ERROR: FORGE_PROJECT=${envPath} but .forge2/ not found`);
    process.exit(1);
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
 * Returns: { groupName, commands }
 */
export async function loadModule(
  modulePath: string,
  forgeDir: string
): Promise<{ groupName: string; commands: Record<string, ForgeCommand> }> {
  const commands: Record<string, ForgeCommand> = {};
  const groupName = deriveGroupName(modulePath);

  // Resolve module path (relative to .forge2/)
  const fullPath = modulePath.startsWith('.')
    ? join(forgeDir, modulePath)
    : modulePath;

  try {
    const module = await import(fullPath);

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
      if (name === 'default') continue;  // Already handled

      if (isForgeCommand(value)) {
        // Named export becomes command name
        commands[name] = value as ForgeCommand;
      }
    }

    return { groupName, commands };
  } catch (err) {
    console.error(`ERROR: Failed to load module ${modulePath}:`, err);
    process.exit(1);
  }
}

// ============================================================================
// State Management
// ============================================================================

const STATE_FILE = 'state.json';
const USER_STATE_FILE = 'state.local.json';

/**
 * Simple JSON-based state management
 */
export class StateManager {
  private projectRoot: string;
  private forgeDir: string;

  constructor(projectRoot: string) {
    this.projectRoot = projectRoot;
    this.forgeDir = join(projectRoot, '.forge2');
  }

  private async readJSON(filename: string): Promise<Record<string, any>> {
    const filepath = join(this.forgeDir, filename);
    if (!existsSync(filepath)) {
      return {};
    }
    try {
      const file = Bun.file(filepath);
      return await file.json();
    } catch (err) {
      console.error(`WARNING: Failed to read ${filename}:`, err);
      return {};
    }
  }

  private async writeJSON(filename: string, data: Record<string, any>): Promise<void> {
    const filepath = join(this.forgeDir, filename);
    await Bun.write(filepath, JSON.stringify(data, null, 2));
  }

  // Project state (git-tracked)
  async getProject(key: string): Promise<any> {
    const state = await this.readJSON(STATE_FILE);
    return state[key];
  }

  async setProject(key: string, value: any): Promise<void> {
    const state = await this.readJSON(STATE_FILE);
    state[key] = value;
    await this.writeJSON(STATE_FILE, state);
  }

  // User state (gitignored)
  async getUser(key: string): Promise<any> {
    const state = await this.readJSON(USER_STATE_FILE);
    return state[key];
  }

  async setUser(key: string, value: any): Promise<void> {
    const state = await this.readJSON(USER_STATE_FILE);
    state[key] = value;
    await this.writeJSON(USER_STATE_FILE, state);
  }
}

// ============================================================================
// Command Execution
// ============================================================================

/**
 * Main forge runner
 */
export class Forge {
  private context: ForgeContext;
  private config: ForgeConfig | null = null;

  // Command groups (subcommands)
  public commandGroups: Record<string, {
    commands: Record<string, ForgeCommand>;
  }> = {};

  public state: StateManager;
  public globalOptions: Record<string, any>;

  constructor(projectRoot: string, globalOptions: Record<string, any> = {}) {
    this.context = {
      projectRoot,
      forgeDir: join(projectRoot, '.forge2'),
      cwd: process.cwd(),
    };
    this.state = new StateManager(projectRoot);
    this.globalOptions = globalOptions;
  }

  async loadConfig(): Promise<void> {
    const configPath = join(this.context.forgeDir, 'config.ts');

    if (!existsSync(configPath)) {
      console.error(`ERROR: No config found at ${configPath}`);
      process.exit(1);
    }

    try {
      const module = await import(configPath);
      this.config = module.default;

      // Auto-discover commands from modules
      if (this.config?.modules) {
        for (const modulePath of this.config.modules) {
          const { groupName, commands } = await loadModule(modulePath, this.context.forgeDir);

          // Store commands under group
          if (!this.commandGroups[groupName]) {
            this.commandGroups[groupName] = { commands: {} };
          }

          // Merge discovered commands (last wins)
          Object.assign(this.commandGroups[groupName].commands, commands);
        }
      }
    } catch (err) {
      console.error('ERROR: Failed to load config:', err);
      process.exit(1);
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
        process.exit(0);
      }
    }

    // Find command
    const command = this.commands[commandName];

    if (!command) {
      console.error(`ERROR: Unknown command: ${commandName}`);
      this.showUsage();
      process.exit(1);
    }

    // Execute command
    try {
      await command.execute(args, []);
    } catch (err) {
      console.error(`ERROR: Command failed: ${commandName}`);
      console.error(err);
      process.exit(1);
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
export function buildCommanderCommand(name: string, forgeCmd: ForgeCommand): Command {
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

    try {
      await forgeCmd.execute(options, positionalArgs);
    } catch (err) {
      console.error(`ERROR: Command failed: ${name}`);
      console.error(err);
      process.exit(1);
    }
  });

  return cmd;
}

// ============================================================================
// Helpers
// ============================================================================

/**
 * Simple confirmation prompt
 */
export async function confirm(prompt: string = 'Continue?'): Promise<boolean> {
  const input = await Bun.prompt(`${prompt} [y/N] `);
  return input?.toLowerCase() === 'y';
}

/**
 * Die with error message
 */
export function die(message: string): never {
  console.error(`ERROR: ${message}`);
  process.exit(1);
}
