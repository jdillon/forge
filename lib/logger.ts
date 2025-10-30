/**
 * Logging setup for Forge v2
 *
 * Uses Pino for structured logging with pretty mode in development
 */

import pino from 'pino';
import chalk from 'chalk';
import { Writable } from 'stream';

// Logger configuration state
interface LoggerConfig {
  level: string;
  format: 'json' | 'pretty';
  color: boolean;
}

const config: LoggerConfig = {
  level: 'info',
  format: 'pretty',
  color: true,
};

// Registry of all logger instances (for future cleanup if needed)
const loggers: pino.Logger[] = [];

/**
 * Custom pretty stream (synchronous, no worker threads)
 * Formats JSON log lines with optional colors
 */
class PrettyStream extends Writable {
  constructor(private useColors: boolean = true) {
    super();
  }

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

      // Level labels
      let levelLabel = '';
      if (level >= 60) levelLabel = 'FATAL';
      else if (level >= 50) levelLabel = 'ERROR';
      else if (level >= 40) levelLabel = 'WARN';
      else if (level >= 30) levelLabel = 'INFO';
      else if (level >= 20) levelLabel = 'DEBUG';
      else levelLabel = 'TRACE';

      // Build output line with optional colors
      const c = this.useColors ? chalk : {
        gray: (s: string) => s,
        red: (s: string) => s,
        yellow: (s: string) => s,
        blue: (s: string) => s,
        cyan: (s: string) => s,
        white: (s: string) => s,
        bgRed: { white: (s: string) => s }
      };

      const levelColor = this.useColors ? (
        level >= 60 ? chalk.bgRed.white :
        level >= 50 ? chalk.red :
        level >= 40 ? chalk.yellow :
        level >= 30 ? chalk.blue :
        chalk.gray
      ) : (s: string) => s;

      const parts = [
        c.gray(time),
        levelColor(levelLabel.padEnd(5)),
        name ? c.cyan(`[${name}]`) : '',
        msg || ''
      ].filter(Boolean);

      // Add extra fields (excluding internal pino fields)
      const internalFields = ['time', 'level', 'msg', 'pid', 'hostname'];
      const extras = Object.keys(obj)
        .filter(key => {
          if (internalFields.includes(key)) return false;
          // Skip 'name' only if it matches the logger name (already displayed)
          if (key === 'name' && obj.name === name) return false;
          return true;
        })
        .map(key => `${c.gray(key)}=${c.white(JSON.stringify(obj[key]))}`)
        .join(' ');

      if (extras) {
        parts.push(extras);
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
 * Configure logger settings (called by CLI framework)
 */
export function configureLogger(options: { level?: string; format?: 'json' | 'pretty'; color?: boolean }): void {
  if (options.level) {
    config.level = options.level;
  }
  if (options.format) {
    config.format = options.format;
  }
  // Color setting is independent of format
  if (options.color !== undefined) {
    config.color = options.color;
  }
}

/**
 * Get current logger configuration
 */
export function getLoggerConfig(): Readonly<LoggerConfig> {
  return config;
}

/**
 * Create a logger instance
 * Simple factory that uses current configuration
 */
export function createLogger(name?: string): pino.Logger {
  // Determine output stream based on format
  let stream: Writable | undefined;
  if (config.format === 'pretty') {
    // Pretty format - human-readable with optional colors
    stream = new PrettyStream(config.color);
  }
  // else json: use default (stdout as JSON)

  const logger = pino(
    {
      name: name || 'forge2',
      level: config.level,
    },
    stream
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
 * Set log level for all existing loggers
 * Called when CLI flags like --debug or --log-level are parsed
 */
export function setGlobalLogLevel(level: string): void {
  config.level = level;

  // Update all existing logger instances
  for (const logger of loggers) {
    logger.level = level;
  }
}

/**
 * Global logger instance
 */
export const log = createLogger();
