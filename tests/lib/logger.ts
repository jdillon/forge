/**
 * Logger for test infrastructure - independent of app's initLogging system
 * For use in test fixtures and test helpers
 */

import pino from 'pino';
import pretty from 'pino-pretty';

/**
 * Create a logger for tests.
 * Uses pino-pretty for human-readable output
 *
 * Only outputs when VERBOSE=1 is set (like println())
 */
export const createLogger = (name?: string): pino.Logger => {
  const stream = pretty({
    colorize: true,
    translateTime: 'HH:MM:ss.l',
    ignore: 'hostname,pid',
    levelFirst: true,
    messageFormat: '{levelLabel} [{name}] {msg}',
    sync: true, // Required for test environments
  });

  return pino(
    {
      name: name || 'test',
      // Silent by default, debug when VERBOSE=1 (matches println behavior)
      level: process.env.VERBOSE ? 'debug' : 'silent',
    },
    stream
  );
};
