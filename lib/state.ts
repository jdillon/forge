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
import { join } from 'path';
import { existsSync } from 'fs';
import { readJsonFile, writeJsonFile } from './runtime';

const PROJECT_STATE_FILE = 'state.json';
const USER_STATE_FILE = 'state.local.json';

/**
 * Simple JSON-based state management
 * - Project state: state.json (git-tracked, shared across team)
 * - User state: state.local.json (gitignored, per-user)
 */
export class StateManager {
  private projectRoot: string;
  private forgeDir: string;

  constructor(projectRoot: string) {
    this.projectRoot = projectRoot;
    this.forgeDir = join(projectRoot, '.forge2');
  }

  private async readJSON(filename: string): Promise<Record<string, any>> {
    const filepath = join(this.forgeDir, filename);
    if (!existsSync(filepath)) {
      return {};
    }
    try {
      return await readJsonFile(filepath);
    } catch (err) {
      console.error(`WARNING: Failed to read ${filename}:`, err);
      return {};
    }
  }

  private async writeJSON(filename: string, data: Record<string, any>): Promise<void> {
    const filepath = join(this.forgeDir, filename);
    await writeJsonFile(filepath, data);
  }

  // Project state (git-tracked)
  async getProject(key: string): Promise<any> {
    const state = await this.readJSON(PROJECT_STATE_FILE);
    return state[key];
  }

  async setProject(key: string, value: any): Promise<void> {
    const state = await this.readJSON(PROJECT_STATE_FILE);
    state[key] = value;
    await this.writeJSON(PROJECT_STATE_FILE, state);
  }

  // User state (gitignored)
  async getUser(key: string): Promise<any> {
    const state = await this.readJSON(USER_STATE_FILE);
    return state[key];
  }

  async setUser(key: string, value: any): Promise<void> {
    const state = await this.readJSON(USER_STATE_FILE);
    state[key] = value;
    await this.writeJSON(USER_STATE_FILE, state);
  }
}
