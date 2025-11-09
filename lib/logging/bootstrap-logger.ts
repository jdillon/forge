import process from 'node:process';

/**
 * Private log function for pre-logger-init tracing
 * Simple console wrapper - will be replaced with bootstrap logger in future
 */
export const log = {
  debug: (message: string, ...args: any[]) => {
    // Only log if DEBUG env var is set (before --debug flag is processed)
    if (process.env.DEBUG || process.env.FORGE_DEBUG) {
      console.log(`[bootstrap] ${message}`, ...args);
    }
  },
  warn: (message: string, ...args: any[]) => {
    console.warn(`[boostrap] ${message}`, ...args);
  },
};
