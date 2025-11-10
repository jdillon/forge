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

import { spawn } from './runtime';
import { createLogger } from './logging';
import { join } from 'path';
import { readFileSync, existsSync } from 'fs';
import { createHash } from 'crypto';
import { getForgeHomePath } from './forge-home';

/**
 * Package Manager - handles dependency installation
 */
export class PackageManager {
  private readonly log = createLogger('package-manager');
  /**
   * Get current package.json content hash for change detection
   */
  private getPackageHash(): string {
    const pkgPath = join(getForgeHomePath(), 'package.json');
    if (!existsSync(pkgPath)) return '';

    const content = readFileSync(pkgPath, 'utf8');
    return createHash('sha256').update(content).digest('hex');
  }

  /**
   * Install a single dependency
   * Returns true if package.json changed (restart needed)
   *
   * Handles:
   * - npm packages: lodash@^4.0.0
   * - file: URLs: file:/path/to/module
   * - git+ URLs: git+https://github.com/user/repo#branch
   */
  async installDependency(dep: string): Promise<boolean> {
    this.log.debug({ dep }, 'Installing dependency');

    const forgeHome = getForgeHomePath();
    const beforeHash = this.getPackageHash();

    // Run bun add from forge home directory
    const proc = spawn(['bun', 'add', dep], {
      cwd: forgeHome,
      stdout: 'pipe',
      stderr: 'pipe',
    });

    const exitCode = await proc.exited;

    if (exitCode !== 0) {
      // Read stderr for error message
      const stderr = proc.stderr
        ? await new Response(proc.stderr).text()
        : 'Unknown error';
      throw new Error(`Failed to install ${dep}: ${stderr}`);
    }

    const afterHash = this.getPackageHash();
    const changed = beforeHash !== afterHash;

    this.log.debug({ dep, changed }, 'Dependency installed');

    return changed;
  }

  /**
   * Parse dependency string to extract package name
   * Examples:
   *   "lodash@^4.0.0" → "lodash"
   *   "@aws-sdk/client-s3@^3.0.0" → "@aws-sdk/client-s3"
   *   "github:lodash/lodash" → "github:lodash/lodash" (git URL, keep as-is)
   */
  parseDependencyName(dep: string): string {
    // Git URLs (github:, git+https://, etc.) - keep as-is
    if (dep.startsWith('github:') || dep.startsWith('git+')) {
      return dep;
    }

    // Scoped package: @scope/name@version → @scope/name
    if (dep.startsWith('@')) {
      const parts = dep.split('@');
      // parts = ['', 'scope/name', 'version']
      if (parts.length >= 3) {
        return `@${parts[1]}`;
      }
      return dep; // Malformed, return as-is
    }

    // Regular package: name@version → name
    return dep.split('@')[0];
  }

  /**
   * Check if a dependency is already installed
   *
   * Handles different dependency types:
   * - Local paths: file:/path, /path, ../path - checks if value matches
   * - Git URLs: github:user/repo, git+https://... - checks if value matches
   * - Package names: lodash@1.0.0, @scope/pkg - checks if key exists
   */
  isInstalled(dep: string): boolean {
    const pkgPath = join(getForgeHomePath(), 'package.json');
    if (!existsSync(pkgPath)) return false;

    try {
      const pkg = JSON.parse(readFileSync(pkgPath, 'utf8'));
      const deps = pkg.dependencies || {};

      // For local file dependencies, check if the value matches (not the key)
      // bun installs these with the package name as key, but path/URL as value
      if (
        dep.startsWith('file:') ||
        dep.startsWith('/') ||
        dep.startsWith('.') ||
        dep.startsWith('github:') ||
        dep.startsWith('git+')
      ) {
        return Object.values(deps).includes(dep);
      }

      // For package names (lodash, @scope/pkg), check if key exists
      const depName = this.parseDependencyName(dep);
      return depName in deps;
    } catch (err) {
      // Corrupted package.json
      this.log.warn({ err }, 'Failed to read package.json');
      return false;
    }
  }
}

/**
 * Singleton package manager instance
 */
export const packageManager = new PackageManager();
