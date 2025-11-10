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

import chalk from 'chalk';

/**
 * Clean exit notification - thrown when application should exit normally
 * Used for --help, --version, or other clean exits
 */
export class ExitNotification extends Error {
  constructor(public exitCode: number = 0, message?: string) {
    super(message || `Exit with code ${exitCode}`);
    this.name = 'ExitNotification';
  }
}

/**
 * Fatal error exception - thrown when application encounters unrecoverable error
 * Logged with stack trace and exits with non-zero code
 */
export class FatalError extends Error {
  public exitCode: number;

  constructor(message: string, options?: { exitCode?: number; cause?: unknown }) {
    super(message, { cause: options?.cause });
    this.name = 'FatalError';
    this.exitCode = options?.exitCode ?? 1;
  }
}

/**
 * Exit process with code (clean exit)
 * Throws ExitNotification for normal exits
 */
export function exit(code: number = 0): never {
  throw new ExitNotification(code);
}

/**
 * Print error message without exiting
 * For non-fatal errors that must always show (not affected by --silent)
 */
export function error(message: string): void {
  console.error(chalk.red(`ERROR: ${message}`));
}

/**
 * Die with fatal error (unrecoverable)
 * Throws FatalError - caught by main error handler
 * This is safe to use anywhere - it throws so stack traces are preserved
 *
 * @param message - Error message describing what went wrong
 * @param cause - Optional original error that caused this failure (preserves stack trace)
 */
export function die(message: string, cause?: unknown): never {
  throw new FatalError(message, { cause });
}
