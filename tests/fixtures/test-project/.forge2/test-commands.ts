/**
 * Test commands for verifying Forge functionality
 */

import type { ForgeCommand } from '../../../../lib/types';

// Command to output context fields as JSON
export const context: ForgeCommand = {
  description: 'Output ForgeContext fields as JSON',
  async execute(options, args, context) {
    // Output context as JSON for test verification
    const output = {
      hasForge: !!context.forge,
      hasConfig: !!context.config,
      hasSettings: !!context.settings,
      hasState: !!context.state,
      commandName: context.commandName,
      groupName: context.groupName,
      logLevel: context.logLevel,
      logFormat: context.logFormat,
      color: context.color,
      settings: context.settings,
    };

    console.log(JSON.stringify(output));
  }
};

// Simple echo command for basic testing
export const echo: ForgeCommand = {
  description: 'Echo arguments back',
  async execute(options, args, context) {
    console.log(args.join(' '));
  }
};

// Export module metadata to rename group
export const __module__ = {
  group: 'test',
  description: 'Test commands for framework verification'
};
