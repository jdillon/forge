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

/**
 * Parse log level from process.argv and environment
 * Mirrors the logic in cli.ts bootstrap() function
 */
function parseLogLevel(): string {
  const args = process.argv;

  // Check for explicit --log-level <level>
  const logLevelIndex = args.findIndex(arg => arg === '--log-level');
  if (logLevelIndex !== -1 && args[logLevelIndex + 1]) {
    return args[logLevelIndex + 1];
  }

  // Check for debug/quiet/silent flags (mirrors cli.ts priority)
  if (args.includes('--debug') || args.includes('-d')) {
    return 'debug';
  }
  if (args.includes('--silent') || args.includes('-s')) {
    return 'silent';
  }
  if (args.includes('--quiet') || args.includes('-q')) {
    return 'warn';
  }

  // Fallback to environment variable
  if (process.env.FORGE_DEBUG) {
    return 'debug';
  }

  return 'info';
}

// Create stream based on format
const stream = pretty({
  colorize: true,
  translateTime: 'HH:MM:ss',
  ignore: 'hostname,pid',
  // singleLine: true,
  sync: true,
})

const level = parseLogLevel();

const rootLogger = pino(
    {
      level: level,
      serializers: {
        err: pino.stdSerializers.err,
        error: pino.stdSerializers.err,
      },
    },
    stream
  );

/**
 * Create a bootstrap logger with a custom name
 * Used for logging before the main logging system is initialized
 */
export function createBootstrapLogger(name: string): pino.Logger {
  return rootLogger.child({ name });
}
