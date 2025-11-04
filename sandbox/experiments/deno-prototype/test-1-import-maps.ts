/**
 * Test 1: Import Maps for Module Resolution Control
 *
 * This tests the CORE problem - can we control which version of a module
 * gets loaded when there are multiple possible sources?
 *
 * Scenario: We're in a "fixture" that's inside the forge project, but we want
 * to import from the "installed" version, not the local source.
 */

console.log('=== Test 1: Import Maps for Module Resolution Control ===\n');

// Import from the "installed" version via import map
import { log as installedLog } from '@planet57/forge-installed/logger.ts';

// Import from the "local source" version via import map
import { log as localLog } from '@planet57/forge/logger.ts';

console.log('\n--- Testing Resolution Control ---');
console.log(`Installed logger instance: ${installedLog.instanceId}`);
console.log(`Local logger instance: ${localLog.instanceId}`);

if (installedLog.instanceId === localLog.instanceId) {
  console.error('\n❌ FAIL: Both imports resolved to the same instance');
  console.error('This means import maps did NOT provide resolution control');
  Deno.exit(1);
} else {
  console.log('\n✅ PASS: Import maps successfully controlled resolution');
  console.log('We can force fixtures to use installed version!');
}

// Test that re-importing uses the same instance (singleton preserved)
console.log('\n--- Testing Singleton Preservation ---');
import { log as installedLog2 } from '@planet57/forge-installed/logger.ts';

if (installedLog.instanceId !== installedLog2.instanceId) {
  console.error('\n❌ FAIL: Singleton not preserved across imports');
  Deno.exit(1);
} else {
  console.log('✅ PASS: Singleton preserved - same instance on re-import');
}

console.log('\n=== Test 1 Complete ===');
