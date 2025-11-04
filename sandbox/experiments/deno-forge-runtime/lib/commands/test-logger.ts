/**
 * Test import map resolution
 *
 * Imports logger.ts via "forge/" prefix to verify import maps work
 */

import { log, getVersion } from 'forge/logger.ts';

export function testLoggerCommand(): void {
  console.log('Testing import map resolution...\n');

  // This import uses "forge/" prefix from deno.json imports
  log('Import map resolution works!');

  console.log(`\nVersion from logger: ${getVersion()}`);
  console.log('\n✅ Import maps working correctly');
}
