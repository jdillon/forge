/*
 * Copyright 2025 Jason Dillon
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import process from 'node:process';
import pino from 'pino';
import pretty from 'pino-pretty';
import { isColorSupported } from 'colorette';
import type { ColorMode } from '../types';

/**
 * Logger type - re-exported to avoid direct pino dependency
 */
export type Logger = pino.Logger;

/**
 * Resolve color mode to a boolean for use with pino-pretty
 * Uses colorette for auto-detection when mode is 'auto'
 */
function resolveColorMode(mode: ColorMode): boolean {
  if (mode === 'always') return true;
  if (mode === 'never') return false;

  // Auto-detect using colorette (same library pino-pretty uses)
  // This handles TTY detection, terminal capabilities, CI/CD environments, etc.
  return isColorSupported;
}

// Logger configuration state
interface LoggerConfig {
  level: string;
  format: 'json' | 'pretty';
  colorMode: ColorMode;
}

const config: LoggerConfig = {
  level: 'info',
  format: 'pretty',
  colorMode: 'auto',
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
  if (options.colorMode !== undefined) {
    config.colorMode = options.colorMode;
  }

  // Resolve color mode to boolean for pino-pretty
  const useColor = resolveColorMode(config.colorMode);

  // Create stream based on format
  const stream = config.format === 'pretty'
    ? pretty({
        colorize: useColor,
        translateTime: 'HH:MM:ss',
        ignore: 'hostname,pid',
        // singleLine: true,
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
