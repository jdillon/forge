/**
 * Minimal logger for testing import map resolution
 *
 * This file will be imported via "forge/" import map prefix
 */

export function log(message: string): void {
  console.log(`[FORGE-LOGGER] ${message}`);
}

export function getVersion(): string {
  return '0.0.1-poc';
}
