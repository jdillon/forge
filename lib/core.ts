/**
 * Forge v2 - Core Framework
 *
 * Pure Bun/TypeScript implementation
 */

import { join, dirname } from 'path';
import { existsSync } from 'fs';
import { homedir } from 'os';

// ============================================================================
// Types
// ============================================================================

export interface ForgeCommand {
  description: string;
  usage?: string;
  execute: (args: string[]) => Promise<void>;
}

export interface ForgeConfig {
  modules?: string[];
  commands: Record<string, ForgeCommand>;
  defaultCommand?: string;
  state?: {
    project?: Record<string, any>;
    user?: Record<string, any>;
  };
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
// Module Loading
// ============================================================================

/**
 * Find module path in search order:
 * 1. Project modules: <project>/.forge2/modules/<name>/
 * 2. User modules: ~/.local/share/forge2/modules/<name>/
 * 3. System modules: (future)
 */
export function findModulePath(moduleName: string, projectRoot: string): string | null {
  const paths = getForgePaths();
  const candidates = [
    join(projectRoot, '.forge2', 'modules', moduleName),
    join(paths.modules, moduleName),
  ];

  for (const path of candidates) {
    if (existsSync(join(path, 'module.ts'))) {
      return path;
    }
  }

  return null;
}

/**
 * Load a module and merge its commands
 */
export async function loadModule(
  moduleName: string,
  projectRoot: string
): Promise<Record<string, ForgeCommand>> {
  const modulePath = findModulePath(moduleName, projectRoot);

  if (!modulePath) {
    console.error(`ERROR: Module not found: ${moduleName}`);
    process.exit(1);
  }

  const moduleFile = join(modulePath, 'module.ts');

  try {
    const module = await import(moduleFile);
    return module.default || module;
  } catch (err) {
    console.error(`ERROR: Failed to load module ${moduleName}:`, err);
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

      // Load additional modules if specified
      if (this.config?.modules) {
        for (const moduleName of this.config.modules) {
          const moduleCommands = await loadModule(moduleName, this.context.projectRoot);
          this.config.commands = {
            ...this.config.commands,
            ...moduleCommands,
          };
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
    const command = this.config!.commands[commandName];

    if (!command) {
      console.error(`ERROR: Unknown command: ${commandName}`);
      this.showUsage();
      process.exit(1);
    }

    // Execute command
    try {
      await command.execute(args);
    } catch (err) {
      console.error(`ERROR: Command failed: ${commandName}`);
      console.error(err);
      process.exit(1);
    }
  }

  private showUsage(): void {
    console.log(`usage: forge2 <command> [options]\n`);
    console.log('Available commands:\n');

    if (!this.config) return;

    const commands = Object.entries(this.config.commands);
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
