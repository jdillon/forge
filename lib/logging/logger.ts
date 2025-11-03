/**
 * Logging setup for Forge v2
 *
 * Uses Pino for structured logging with pretty mode in development
 */

import pino from 'pino';

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

/**
 * Get current logger configuration
 */
export function getLoggerConfig(): Readonly<LoggerConfig> {
  return config;
}

// Shared transport (created during initLogging)
let transport: pino.DestinationStream | null = null;

// Registry of all logger instances (for future cleanup if needed)
const loggers: pino.Logger[] = [];

/**
 * Global logger instance (created after initLogging)
 */
let globalLogger: pino.Logger | null = null;
let initialized = false;

export function isLoggingInitialized(): boolean {
  return initialized;
}

/**
 * Ensure logging is initialized, throw if not
 * @throws {Error} if logging not initialized
 */
function ensureInitialized(): void {
  if (!initialized) {
    throw new Error('Logging not initialized. Call initLogging() first.');
  }
}

/**
 * Initialize logging system with configuration
 * Must be called before creating any loggers
 */
export function initLogging(options: { level?: string; format?: 'json' | 'pretty'; color?: boolean }): void {
  if (initialized) {
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

  // Create shared transport based on format
  if (config.format === 'pretty') {
    transport = pino.transport({
      target: 'pino-pretty',
      options: {
        colorize: config.color,
        translateTime: 'HH:MM:ss',
        ignore: 'hostname,pid',
        levelFirst: true,
        singleLine: true,
        messageFormat: '{msg}',
        errorLikeObjectKeys: ['err', 'error'],
      },
      sync: true, // Required for CLI to ensure output order
    });
  } else {
    // JSON format - output to stderr
    transport = process.stderr;
  }

  // Create global logger
  globalLogger = _createLogger('forge');
  globalLogger.debug({ level: config.level, format: config.format, color: config.color }, 'Logging initialized');

  initialized = true;
}

/**
 * Cleanup all logger instances
 * Flushes and closes transport workers
 */
export async function shutdownLogging(): Promise<void> {
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
 * Create a logger instance
 * Simple factory that uses shared transport configured during initLogging
 * @throws {Error} if logging not initialized
 */
export function createLogger(name?: string): pino.Logger {
  ensureInitialized();

  return _createLogger(name);
}

function _createLogger(name?: string): pino.Logger {
  const logger = pino(
    {
      name: name || 'forge',
      level: config.level,
      serializers: {
        err: pino.stdSerializers.err,
        error: pino.stdSerializers.err,
      },
    },
    transport!
  );

  // Register for cleanup
  loggers.push(logger);

  return logger;
}

/**
 * Get global logger instance
 * @throws {Error} if logging not initialized
 */
export function getGlobalLogger(): pino.Logger {
  ensureInitialized();
  return globalLogger!;
}
