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

// ============================================================================
// Shell Execution
// ============================================================================

/**
 * Shell command builder (dax-like API)
 * Currently re-exports Bun's $ operator
 */
export { $ } from 'bun';

// ============================================================================
// File System Operations
// ============================================================================

/**
 * Read text file
 * TODO: Add logging later (bootstrap issue)
 */
export async function readTextFile(path: string): Promise<string> {
  const file = Bun.file(path);
  return await file.text();
}

/**
 * Write text file
 * TODO: Add logging later (bootstrap issue)
 */
export async function writeTextFile(path: string, content: string): Promise<void> {
  await Bun.write(path, content);
}

/**
 * Read JSON file
 * TODO: Add logging later (bootstrap issue)
 */
export async function readJsonFile<T = any>(path: string): Promise<T> {
  const file = Bun.file(path);
  return await file.json();
}

/**
 * Write JSON file (pretty-printed with 2-space indent)
 * TODO: Add logging later (bootstrap issue)
 */
export async function writeJsonFile(path: string, data: any): Promise<void> {
  await Bun.write(path, JSON.stringify(data, null, 2));
}

// ============================================================================
// Process Control
// ============================================================================

/**
 * Exit process with code
 * TODO: Add logging later (bootstrap issue)
 */
export function exit(code: number): never {
  process.exit(code);
}

// ============================================================================
// Environment Variables
// ============================================================================

/**
 * Environment variable operations
 */
export const env = {
  get(key: string): string | undefined {
    return process.env[key];
  },

  set(key: string, value: string): void {
    process.env[key] = value;
  },

  has(key: string): boolean {
    return key in process.env;
  },

  delete(key: string): void {
    delete process.env[key];
  },
};

// ============================================================================
// Process Spawning
// ============================================================================

/**
 * Spawn options (runtime-agnostic subset)
 */
export interface SpawnOptions {
  cwd?: string;
  env?: Record<string, string>;
  stdout?: 'pipe' | 'inherit' | 'ignore';
  stderr?: 'pipe' | 'inherit' | 'ignore';
  stdin?: 'pipe' | 'inherit' | 'ignore';
}

/**
 * Spawned process handle
 */
export interface SpawnedProcess {
  readonly pid: number;
  readonly stdin: WritableStream<Uint8Array> | null;
  readonly stdout: ReadableStream<Uint8Array> | null;
  readonly stderr: ReadableStream<Uint8Array> | null;
  readonly exited: Promise<number>;
  kill(signal?: number): void;
}

/**
 * Spawn a subprocess
 * TODO: Add logging later (bootstrap issue)
 */
export function spawn(
  cmd: string[],
  options?: SpawnOptions,
): SpawnedProcess {
  const proc = Bun.spawn(cmd, options as any);

  return {
    pid: proc.pid,
    stdin: proc.stdin ?? null,
    stdout: proc.stdout ?? null,
    stderr: proc.stderr ?? null,
    exited: proc.exited,
    kill: (signal?: number) => proc.kill(signal),
  };
}
