// Verbose test showing actual file paths
import { createLogger, LOGGER_ID } from '@planet57/forge/logger';
import { fileURLToPath } from 'url';

const logger = createLogger('test-fixture');

console.log('=== Resolution Test ===');
console.log('Logger ID:', LOGGER_ID);
console.log('Expected:', 'MOCK_FORGE_LOGGER_VIA_TSCONFIG');
console.log('Match:', LOGGER_ID === 'MOCK_FORGE_LOGGER_VIA_TSCONFIG');
console.log();

// Try to get the actual module path
try {
  const moduleUrl = import.meta.url;
  console.log('Test file:', fileURLToPath(moduleUrl));
} catch (e) {
  // Ignore
}

console.log();
if (LOGGER_ID === 'MOCK_FORGE_LOGGER_VIA_TSCONFIG') {
  console.log('✅ SUCCESS: tsconfig paths working correctly');
  console.log('   - node_modules has @planet57/forge (WRONG_LOGGER)');
  console.log('   - tsconfig paths override to mock-forge (CORRECT)');
  process.exit(0);
} else if (LOGGER_ID === 'WRONG_LOGGER_FROM_NODE_MODULES') {
  console.log('❌ FAILED: Bun ignored tsconfig paths');
  console.log('   - Resolved to node_modules instead of tsconfig override');
  process.exit(1);
} else {
  console.log('❌ FAILED: Unknown logger source');
  process.exit(1);
}
