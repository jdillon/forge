/**
 * Debug utility to show module resolution paths
 * Use with --debug flag or FORGE_DEBUG=1 env var
 */

export function debugModulePaths() {
  const debug = process.env.FORGE_DEBUG === '1' || process.argv.includes('--debug');

  if (!debug) {
    return;
  }

  console.error('\n=== Forge Module Resolution Debug ===');
  console.error('NODE_PATH (env):', process.env.NODE_PATH || '(not set)');
  console.error('CWD:', process.cwd());

  // @ts-ignore - Module internals
  if (typeof require !== 'undefined' && require.resolve) {
    try {
      // @ts-ignore
      const Module = require('module');
      console.error('Module paths:', Module._nodeModulePaths?.(process.cwd()) || '(not available)');
    } catch (err) {
      console.error('Module paths: (error accessing Module internals)');
    }
  }

  // Check if Bun exposes module resolution info
  // @ts-ignore
  if (typeof Bun !== 'undefined' && Bun.resolve) {
    console.error('Bun.resolve available: yes');
  }

  console.error('=====================================\n');
}
