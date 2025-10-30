/**
 * Forge v2 - Helper Functions
 *
 * Utility functions for use in commands
 */

import chalk from 'chalk';

/**
 * Simple confirmation prompt
 */
export async function confirm(prompt: string = 'Continue?'): Promise<boolean> {
  const input = await Bun.prompt(`${prompt} [y/N] `);
  return input?.toLowerCase() === 'y';
}

/**
 * Exit process with code
 * Centralized exit point for better testability
 */
export function exit(code: number = 0): never {
  process.exit(code);
}

/**
 * Print error message without exiting
 * For non-fatal errors that must always show (not affected by --silent)
 */
export function error(message: string): void {
  console.error(chalk.red(`ERROR: ${message}`));
}

/**
 * Die with error message and exit(1)
 * Fatal errors that must always show (not affected by --silent)
 */
export function die(message: string): never {
  error(message);
  exit(1);
}
