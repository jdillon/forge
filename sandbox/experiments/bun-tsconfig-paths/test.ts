/**
 * Test: Can tsconfig.json paths control module resolution?
 *
 * We have:
 * - local-source/logger.ts (should NOT be used)
 * - cache/forge/logger.ts (should be used via paths mapping)
 *
 * Test if importing @planet57/forge/logger resolves to cache
 */

console.log('=== Bun tsconfig.json Paths Test ===\n');

// This import should resolve to cache/forge/logger.ts via tsconfig paths
import { log } from '@planet57/forge/logger';

console.log('\n--- Testing Resolution ---');
console.log(`Logger instance ID: ${log.instanceId}`);

if (log.instanceId.startsWith('CACHED-')) {
  console.log('\n✅ SUCCESS: tsconfig paths redirected import to cache!');
  console.log('This means we can use tsconfig.json paths instead of import maps!');
} else if (log.instanceId.startsWith('LOCAL-')) {
  console.log('\n❌ FAIL: Import resolved to local source, not cache');
  console.log('tsconfig paths did not work as expected');
} else {
  console.log('\n❓ UNKNOWN: Unexpected instance ID pattern');
}

// Test singleton preservation
console.log('\n--- Testing Singleton Preservation ---');
import { log as log2 } from '@planet57/forge/logger';

if (log.instanceId === log2.instanceId) {
  console.log('✅ Singleton preserved - same instance on re-import');
} else {
  console.log('❌ Singleton broken - different instances');
}

console.log('\n=== Test Complete ===');
