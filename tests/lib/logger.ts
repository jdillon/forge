/**
 * Logger for test infrastructure - independent of app's initLogging system
 * For use in test fixtures and test helpers
 */

import pino from 'pino';
import pretty from 'pino-pretty';

const root = pino(
  {
    // Silent by default, debug when VERBOSE=1 (matches println behavior)
    level: process.env.VERBOSE ? 'debug' : 'silent',
    serializers: {
      err: pino.stdSerializers.err,
      error: pino.stdSerializers.err,
    },
  },
  pretty({
    colorize: true,
    translateTime: 'HH:MM:ss.l',
    ignore: 'hostname,pid',
    sync: true, // Required for test environments
  })
);

/**
 * Create a logger for tests.
 */
export const createLogger = (name?: string): pino.Logger => {
  return root.child({
      name: name || 'test'
    });
};
