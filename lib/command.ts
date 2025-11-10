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

// ============================================================================
// Types - Command authors implement these
// ============================================================================

export type {
  ForgeCommand,
  ForgeConfig,
  ForgeModuleMetadata,
  ForgeContext
} from './types';

// ============================================================================
// Core API - Forge utilities
// ============================================================================

export { createLogger } from './logging/logger';
export { die, exit, error } from './helpers';
export { getForgeHomePath } from './forge-home';

// ============================================================================
// Runtime utilities
// ============================================================================

export { $ } from './runtime';

// ============================================================================
// Commander (CLI framework)
// ============================================================================

export { Command } from 'commander';

// ============================================================================
// Terminal UI utilities
// ============================================================================

// Colors
import chalkDefault from 'chalk';
export { chalkDefault as chalk };

// Spinners
import oraDefault from 'ora';
export { oraDefault as ora };

// Boxes
import boxenDefault from 'boxen';
export { boxenDefault as boxen };

// Task lists
export { Listr } from 'listr2';

// Tables
import TableDefault from 'cli-table3';
export { TableDefault as Table };
