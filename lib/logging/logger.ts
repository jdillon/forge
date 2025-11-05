/**
 * Logging setup for Forge v2
 *
 * Uses Pino for structured logging with pretty mode in development
 */

import pino from 'pino';
import pretty from 'pino-pretty';

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

/**
 * Root logger instance (created after initLogging)
 * All other loggers are children of this root logger
 */
let rootLogger: pino.Logger | null = null;

export function isLoggingInitialized(): boolean {
  return rootLogger !== null;
}

/**
 * Ensure logging is initialized, throw if not
 * @throws {Error} if logging not initialized
 */
function ensureInitialized(): void {
  if (!rootLogger) {
    throw new Error('Logging not initialized. Call initLogging() first.');
  }
}

/**
 * Initialize logging system with configuration
 * Must be called before creating any loggers
 */
export function initLogging(options: Partial<LoggerConfig>): void {
  if (rootLogger) {
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

  // Create stream based on format
  const stream = config.format === 'pretty'
    ? pretty({
        colorize: config.color,
        translateTime: 'HH:MM:ss',
        ignore: 'hostname,pid',
        singleLine: true,
        sync: true,
      })
    : process.stdout;

  // Create root logger with configured stream
  rootLogger = pino(
    {
      level: config.level,
      serializers: {
        err: pino.stdSerializers.err,
        error: pino.stdSerializers.err,
      },
    },
    stream
  );
}

/**
 * Cleanup logging system
 * Flushes any pending writes
 */
export async function shutdownLogging(): Promise<void> {
  if (rootLogger) {
    rootLogger.flush();
  }
}

/**
 * Create a logger instance as a child of the root logger
 * @throws {Error} if logging not initialized
 */
export function createLogger(name?: string): pino.Logger {
  ensureInitialized();

  return rootLogger!.child({ name: name || 'forge' });
}

/**
 * Get global logger instance (root logger)
 * @throws {Error} if logging not initialized
 */
export function getGlobalLogger(): pino.Logger {
  ensureInitialized();
  return rootLogger!;
}
