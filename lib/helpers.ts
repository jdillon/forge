/**
 * Forge v2 - Helper Functions
 *
 * Utility functions for use in commands
 */

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
 * Die with error message and exit(1)
 */
export function die(message: string): never {
  console.error(`ERROR: ${message}`);
  exit(1);
}
