/**
 * Logging setup for Forge v2
 *
 * Uses Pino for structured logging with pretty mode in development
 */

import pino from 'pino';

/**
 * Create a logger instance
 *
 * In development: Pretty colored output
 * In production: JSON structured logs
 */
export function createLogger(name?: string) {
  const isDev = process.env.NODE_ENV !== 'production';
  const level = process.env.LOG_LEVEL || (isDev ? 'info' : 'warn');

  // Disable pino-pretty for now - it creates worker threads that delay process exit
  // TODO: Re-enable with proper cleanup or use sync pretty printer
  return pino({
    name: name || 'forge2',
    level,
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
}

/**
 * Global logger instance
 */
export const log = createLogger();
