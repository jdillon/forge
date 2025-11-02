/**
 * Logging setup for Forge v2
 *
 * Uses Pino for structured logging with pretty mode in development
 */

import pino from 'pino';
import { Writable } from 'stream';
import { PrettyStream } from './pretty-stream';

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
 * Get current logger configuration
 */
export function getLoggerConfig(): Readonly<LoggerConfig> {
  return config;
}

/**
 * Create a logger instance
 * Simple factory that uses current configuration
 * @throws {Error} if logging not initialized
 */
export function createLogger(name?: string): pino.Logger {
  ensureInitialized();

  // Determine output stream based on format
  let stream: Writable;
  if (config.format === 'pretty') {
    // Pretty format - human-readable with optional colors
    stream = new PrettyStream(config.color);
  } else {
    // JSON format - output to stderr
    stream = process.stderr;
  }

  const logger = pino(
    {
      name: name || 'forge',
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
 * Global logger instance (created after initLogging)
 */
let _globalLogger: pino.Logger | null = null;
let _initialized = false;

export function isLoggingInitialized(): boolean {
  return _initialized;
}

/**
 * Ensure logging is initialized, throw if not
 * @throws {Error} if logging not initialized
 */
function ensureInitialized(): void {
  if (!_initialized) {
    throw new Error('Logging not initialized. Call initLogging() first.');
  }
}

/**
 * Initialize logging system with configuration
 * Must be called before creating any loggers
 */
export function initLogging(options: { level?: string; format?: 'json' | 'pretty'; color?: boolean }): void {
  if (_initialized) {
    throw new Error('Logging already initialized');
  }

  // Configure logging
  if (options.level) {
    config.level = options.level;
  }
  if (options.format) {
    config.format = options.format;
  }
  if (options.color !== undefined) {
    config.color = options.color;
  }

  _initialized = true;

  // Create global logger
  _globalLogger = createLogger('forge');
  _globalLogger.debug({ level: config.level, format: config.format, color: config.color }, 'Logging initialized');
}

/**
 * Get global logger instance
 * @throws {Error} if logging not initialized
 */
export function getGlobalLogger(): pino.Logger {
  ensureInitialized();
  return _globalLogger!;
}
