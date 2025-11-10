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
import { join } from 'node:path';
import { homedir } from 'node:os';
import { readFile } from 'node:fs/promises';

export interface VersionInfo {
  version: string;        // Base version (from package.json)
  hash: string;           // Short git hash
  hashFull: string;       // Full git hash
  timestamp: string;      // ISO 8601
  timestampUnix: number;  // Unix timestamp
  branch: string;         // Git branch
  dirty: boolean;         // Uncommitted changes?
  semver: string;         // Full semver string
}

/**
 * Get version information.
 * Reads from version.json generated at install time.
 */
export async function getVersion(): Promise<VersionInfo> {
  // Inline forge home path logic to avoid importing forge-home.ts
  // (which imports package-manager which requires logging to be initialized)
  const forgeHome = process.env.FORGE_HOME || join(homedir(), '.forge');
  const versionFile = join(forgeHome, 'version.json');

  try {
    const content = await readFile(versionFile, 'utf-8');
    return JSON.parse(content);
  } catch (error) {
    // Fallback if version.json missing (shouldn't happen in normal operation)
    return {
      version: 'unknown',
      hash: 'unknown',
      hashFull: 'unknown',
      timestamp: new Date().toISOString(),
      timestampUnix: Math.floor(Date.now() / 1000),
      branch: 'unknown',
      dirty: false,
      semver: 'unknown'
    };
  }
}

/**
 * Get semver string for --version flag.
 * Fast: just the version string, no extra details.
 */
export async function getVersionString(): Promise<string> {
  const info = await getVersion();
  return info.semver;
}
