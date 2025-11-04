// Test: Does tsconfig paths override node_modules resolution?
import { createLogger, LOGGER_ID } from '@planet57/forge/logger';

const logger = createLogger('test-fixture');

console.log('Logger ID:', LOGGER_ID);
console.log('Expected: MOCK_FORGE_LOGGER_VIA_TSCONFIG');
console.log('Match:', LOGGER_ID === 'MOCK_FORGE_LOGGER_VIA_TSCONFIG');

if (LOGGER_ID === 'MOCK_FORGE_LOGGER_VIA_TSCONFIG') {
  console.log('✅ SUCCESS: tsconfig paths overrode node_modules resolution');
  process.exit(0);
} else {
  console.log('❌ FAILED: Resolved to wrong location');
  process.exit(1);
}
