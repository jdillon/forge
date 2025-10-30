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
 * Die with error message
 */
export function die(message: string): never {
  console.error(`ERROR: ${message}`);
  process.exit(1);
}
