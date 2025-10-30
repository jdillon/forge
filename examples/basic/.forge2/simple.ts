/**
 * Simple test module
 *
 * Demonstrates:
 * - Ultra-simple command (no options, no args)
 * - Command with defineCommand for customization
 * - Module metadata to customize group name
 */

import { createLogger, type ForgeCommand, type ForgeModuleMetadata, type ForgeContext } from '@forge/command';

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
  execute: async (options: any, args: string[], context: ForgeContext) => {
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
      .argument('[name]', 'Name to greet (uses config default if not provided)')
      .option('-l, --loud', 'Use uppercase'),

  execute: async (options, args, context) => {
    // Get name from args or fall back to config default
    const defaultName = context.settings.defaultName || 'World';
    const name = args[0] || defaultName;

    log.debug({ defaultName, providedName: args[0] }, 'Processing greet command');

    const greeting = options.loud
      ? `HELLO, ${name.toUpperCase()}!`
      : `Hello, ${name}!`;

    console.log(greeting);
    log.info({ userName: name, loud: options.loud, usedDefault: !args[0] }, 'Greeted user');
  }
};
