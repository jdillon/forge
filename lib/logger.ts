/**
 * Logging setup for Forge v2
 *
 * Uses Pino for structured logging with pretty mode in development
 */

import pino from 'pino';

// Registry of all logger instances (for future cleanup if needed)
const loggers: pino.Logger[] = [];

/**
 * Create a logger instance
 *
 * In development: Pretty colored output
 * In production: JSON structured logs
 */
export function createLogger(name?: string) {
  const isDev = process.env.NODE_ENV !== 'production';
  const level = process.env.LOG_LEVEL || (isDev ? 'info' : 'warn');

  const logger = pino({
    name: name || 'forge2',
    level,
    // Disable pino-pretty transport - worker threads delay process exit by ~1s
    // TODO: Find alternative pretty printer or implement proper worker cleanup
    // transport: isDev ? {
    //   target: 'pino-pretty',
    //   options: {
    //     colorize: true,
    //     translateTime: 'HH:MM:ss',
    //     ignore: 'pid,hostname,name',
    //     singleLine: true
    //   }
    // } : undefined
  });

  // Register for cleanup
  loggers.push(logger);

  return logger;
}

/**
 * Cleanup all logger instances
 * Flushes and closes transport workers
 */
export async function shutdownLoggers(): Promise<void> {
  const promises = [];

  for (const logger of loggers) {
    // Flush pending writes
    logger.flush();

    // Try to close transport (pino-pretty worker)
    // @ts-ignore - internal API
    const transport = logger[Symbol.for('pino.transport')];
    if (transport) {
      // Try multiple methods to close the worker
      if (typeof transport.end === 'function') {
        const promise = new Promise(resolve => {
          transport.end();
          resolve(undefined);
        });
        promises.push(promise);
      }
      if (typeof transport[Symbol.for('pino.end')] === 'function') {
        transport[Symbol.for('pino.end')]();
      }
    }
  }

  // Wait for transports to close (with timeout)
  await Promise.race([
    Promise.all(promises),
    new Promise(resolve => setTimeout(resolve, 50))
  ]);
}

/**
 * Global logger instance
 */
export const log = createLogger();
