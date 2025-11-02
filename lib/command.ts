/**
 * Forge v2 - Command API
 *
 * Single namespace for command authors - batteries included!
 *
 * Usage:
 *   import { chalk, ora, createLogger, type ForgeCommand } from '@forge/command';
 *
 * Provides:
 * - Core types (ForgeCommand, ForgeContext, etc.)
 * - Utilities (createLogger, confirm, die)
 * - Third-party packages (chalk, ora, boxen, etc.)
 */

// ============================================================================
// Types - Command authors implement these
// ============================================================================

export type {
  ForgeCommand,
  ForgeConfig,
  ForgeModuleMetadata,
  ForgeContext
} from './types';

// ============================================================================
// Core API - Forge utilities
// ============================================================================

export { createLogger } from './logging';
export { confirm, die, exit, error } from './helpers';
export { getForgePaths } from './xdg';

// ============================================================================
// Bun utilities
// ============================================================================

export { $ } from 'bun';

// ============================================================================
// Commander (CLI framework)
// ============================================================================

export { Command } from 'commander';

// ============================================================================
// Terminal UI utilities
// ============================================================================

// Colors
import chalkDefault from 'chalk';
export { chalkDefault as chalk };

// Spinners
import oraDefault from 'ora';
export { oraDefault as ora };

// Boxes
import boxenDefault from 'boxen';
export { boxenDefault as boxen };

// Task lists
export { Listr } from 'listr2';

// Prompts
import enquirerDefault from 'enquirer';
export { enquirerDefault as enquirer };
export const { prompt, confirm: enquirerConfirm } = enquirerDefault;

// Tables
import TableDefault from 'cli-table3';
export { TableDefault as Table };
