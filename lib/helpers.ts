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
 * Clean exit notification - thrown when application should exit normally
 * Used for --help, --version, or other clean exits
 */
export class ExitNotification extends Error {
  constructor(public exitCode: number = 0, message?: string) {
    super(message || `Exit with code ${exitCode}`);
    this.name = 'ExitNotification';
  }
}

/**
 * Fatal error exception - thrown when application encounters unrecoverable error
 * Logged with stack trace and exits with non-zero code
 */
export class FatalError extends Error {
  public exitCode: number;

  constructor(message: string, options?: { exitCode?: number; cause?: unknown }) {
    super(message, { cause: options?.cause });
    this.name = 'FatalError';
    this.exitCode = options?.exitCode ?? 1;
  }
}

/**
 * Exit process with code (clean exit)
 * Throws ExitNotification for normal exits
 */
export function exit(code: number = 0): never {
  throw new ExitNotification(code);
}

/**
 * Print error message without exiting
 * For non-fatal errors that must always show (not affected by --silent)
 */
export function error(message: string): void {
  console.error(chalk.red(`ERROR: ${message}`));
}

/**
 * Die with fatal error (unrecoverable)
 * Throws FatalError - caught by main error handler
 * This is safe to use anywhere - it throws so stack traces are preserved
 *
 * @param message - Error message describing what went wrong
 * @param cause - Optional original error that caused this failure (preserves stack trace)
 */
export function die(message: string, cause?: unknown): never {
  throw new FatalError(message, { cause });
}
