/**
 * Forge Built-in Commands
 *
 * Commands that are always available, no config required
 */

import process from 'node:process';
import { getForgeHomePath } from './forge-home';
import type { ForgeCommand, ForgeModuleMetadata } from './types';

/**
 * Module metadata - top-level commands (no group)
 */
export const __module__: ForgeModuleMetadata = {
  group: false,
  description: 'Built-in commands',
};

/**
 * Launch a shell in the forge home directory.
 */
export const cd: ForgeCommand = {
  description: 'Launch a shell in the forge home directory',
  execute: async () => {
    const forgeHome = getForgeHomePath();

    // Detect shell (use $SHELL env var, fallback to /bin/sh)
    const shell = process.env.SHELL || '/bin/sh';

    // Spawn interactive shell in forge home
    const proc = Bun.spawn([shell], {
      cwd: forgeHome,
      stdio: ['inherit', 'inherit', 'inherit'],
      env: {
        ...process.env,
        FORGE_HOME: forgeHome,
      },
    });

    // Wait for shell to exit
    await proc.exited;
    process.exit(proc.exitCode || 0);
  },
};
