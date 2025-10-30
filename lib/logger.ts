/**
 * Logging setup for Forge v2
 *
 * Uses Pino for structured logging with pretty mode in development
 */

import pino from 'pino';
import chalk from 'chalk';
import { Writable } from 'stream';

// Registry of all logger instances (for future cleanup if needed)
const loggers: pino.Logger[] = [];

/**
 * Custom pretty stream (synchronous, no worker threads)
 * Formats JSON log lines with colors
 */
class PrettyStream extends Writable {
  _write(chunk: any, encoding: string, callback: () => void) {
    const line = chunk.toString().trim();
    if (!line) {
      callback();
      return;
    }

    try {
      const obj = JSON.parse(line);
      const time = new Date(obj.time).toLocaleTimeString('en-US', { hour12: false });
      const level = obj.level;
      const name = obj.name;
      const msg = obj.msg;

      // Level colors and labels
      let levelLabel = '';
      let levelColor = chalk.gray;

      if (level >= 60) {      // fatal
        levelLabel = 'FATAL';
        levelColor = chalk.bgRed.white;
      } else if (level >= 50) { // error
        levelLabel = 'ERROR';
        levelColor = chalk.red;
      } else if (level >= 40) { // warn
        levelLabel = 'WARN';
        levelColor = chalk.yellow;
      } else if (level >= 30) { // info
        levelLabel = 'INFO';
        levelColor = chalk.blue;
      } else if (level >= 20) { // debug
        levelLabel = 'DEBUG';
        levelColor = chalk.gray;
      } else {                  // trace
        levelLabel = 'TRACE';
        levelColor = chalk.gray;
      }

      // Build output line
      const parts = [
        chalk.gray(time),
        levelColor(levelLabel.padEnd(5)),
        name ? chalk.cyan(`[${name}]`) : '',
        msg || ''
      ].filter(Boolean);

      // Add extra fields (excluding internal pino fields)
      // Note: 'name' could be both logger name and log data - we already used it above
      const internalFields = ['time', 'level', 'msg', 'pid', 'hostname'];
      const extras = Object.keys(obj)
        .filter(key => {
          if (internalFields.includes(key)) return false;
          // Skip 'name' only if it matches the logger name (already displayed)
          if (key === 'name' && obj.name === name) return false;
          return true;
        })
        .map(key => `${chalk.gray(key)}=${chalk.white(JSON.stringify(obj[key]))}`)
        .join(' ');

      if (extras) {
        parts.push(chalk.gray(extras));
      }

      process.stdout.write(parts.join(' ') + '\n');
    } catch (err) {
      // If not JSON, just write it
      process.stdout.write(line + '\n');
    }

    callback();
  }
}

/**
 * Create a logger instance
 *
 * In development: Pretty colored output (synchronous)
 * In production: JSON structured logs
 */
export function createLogger(name?: string): pino.Logger {
  const isDev = process.env.NODE_ENV !== 'production';
  const level = process.env.LOG_LEVEL || (isDev ? 'info' : 'warn');
  const pretty = isDev && process.env.FORGE_PRETTY_LOGS !== '0';

  const logger = pino(
    {
      name: name || 'forge2',
      level,
    },
    pretty ? new PrettyStream() : undefined
  );

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
