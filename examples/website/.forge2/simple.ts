/**
 * Simple test module
 *
 * Demonstrates:
 * - Ultra-simple command (no options, no args)
 * - Command with defineCommand for customization
 * - Module metadata to customize group name
 */

import { createLogger } from '@forge/logger';
import type { ForgeCommand, ForgeModuleMetadata } from '@forge/core';

const log = createLogger('simple');

// Module metadata - rename group from "simple" to "basic"
export const __module__: ForgeModuleMetadata = {
  group: 'basic',
  description: 'Basic example commands'
};

// ============================================================================
// Simple command - no args, no options, just works
// ============================================================================

export const ping = {
  description: 'Simple ping command',
  execute: async () => {
    console.log('pong!');
    log.info('Pinged');
  }
};

// ============================================================================
// Command with customization
// ============================================================================

export const greet: ForgeCommand = {
  description: 'Greet someone',

  defineCommand: (cmd) =>
    cmd
      .argument('<name>', 'Name to greet')
      .option('-l, --loud', 'Use uppercase'),

  execute: async (options, args) => {
    const name = args[0];
    const greeting = options.loud
      ? `HELLO, ${name.toUpperCase()}!`
      : `Hello, ${name}!`;

    console.log(greeting);
    log.info({ name, loud: options.loud }, 'Greeted user');
  }
};
