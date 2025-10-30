/**
 * Forge v2 Configuration
 *
 * Declarative configuration - just list modules to load.
 * Framework auto-discovers commands from module exports.
 */

import type { ForgeConfig } from '@forge/core';

export default {
  // Modules to load - commands auto-discovered from exports
  modules: [
    './website',   // Named exports: build, sync, invalidate, publish, info
    './examples',  // Default export: hello, deploy, status, version, etc.
    './simple',    // Uses __module__ to rename group to "basic"
  ],

  // Optional: default command when none specified
  // defaultCommand: 'help',

  // Command-specific settings (layered with user/local configs)
  settings: {
    'basic.greet': {
      defaultName: 'Forge User'
    }
  },

  // Future: Could also load from npm/git
  // modules: [
  //   './website',
  //   '@forge/aws',
  //   'github:mycompany/forge-terraform',
  // ],
} satisfies ForgeConfig;
