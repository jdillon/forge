/**
 * Test logger setup - independent of app's initLogging system
 * For use in test fixtures only
 */

import pino from 'pino';

/**
 * Create a real Pino logger for tests
 * Does not require initLogging() - has its own configuration
 */
export const createTestLogger = (name?: string): pino.Logger => {
  return pino(
    {
      name: name || 'test',
      level: 'info',
    },
    process.stderr  // Log to stderr like the real logger
  );
};
