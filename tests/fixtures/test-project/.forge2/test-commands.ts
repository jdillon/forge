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
/**
 * Test commands for verifying Forge functionality
 */

import type { ForgeCommand } from '@planet57/forge/command';
import { createLogger } from '@planet57/forge/command';

const log = createLogger('test');

// Command to output context fields as JSON
export const context: ForgeCommand = {
  description: 'Output ForgeContext fields as JSON to a file',
  usage: '<output-file>',
  async execute(options, args, context) {
    const outputFile = args[0];
    if (!outputFile) {
      console.error('ERROR: output file required');
      console.error('Usage: forge test context <output-file>');
      process.exit(1);
    }

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
      colorMode: context.colorMode,
      settings: context.settings,
    };

    // Write to file instead of stdout
    await Bun.write(outputFile, JSON.stringify(output));
  }
};

// Simple echo command for basic testing
export const echo: ForgeCommand = {
  description: 'Echo arguments back',
  async execute(options, args, context) {
    console.log(args.join(' '));
  }
};

// Command with options for testing option parsing
export const greet: ForgeCommand = {
  description: 'Greet someone',

  defineCommand: (cmd) =>
    cmd
      .argument('[name]', 'Name to greet')
      .option('-l, --loud', 'Use uppercase'),

  async execute(options, args, context) {
    const name = args[0] || 'World';
    const greeting = options.loud
      ? `HELLO, ${name.toUpperCase()}!`
      : `Hello, ${name}!`;

    console.log(greeting);
    log.info({ name, loud: options.loud }, 'Greeted user');
  }
};

// Export module metadata to rename group
export const __module__ = {
  group: 'test',
  description: 'Test commands for framework verification'
};
