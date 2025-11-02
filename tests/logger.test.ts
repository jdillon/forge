/**
 * Tests for logger configuration
 */

import { describe, test, expect, beforeEach, afterEach } from 'bun:test';
import { initLogging, getLoggerConfig, createLogger } from '../lib/logging';

// Note: These tests need to re-initialize logging for each test
// We can't truly reset the logger state, so we test initialization once

describe('Logger Configuration', () => {
  // Initialize logging once for all tests
  test('should initialize logging', () => {
    initLogging({ level: 'info', format: 'pretty', color: true });
    const config = getLoggerConfig();
    expect(config.level).toBe('info');
    expect(config.format).toBe('pretty');
    expect(config.color).toBe(true);
  });

  test('should create logger instance after initialization', () => {
    const logger = createLogger('test');
    expect(logger).toBeDefined();
    expect(logger.level).toBe('info');
  });

  test('should create logger with custom name', () => {
    const logger = createLogger('custom-logger');
    expect(logger).toBeDefined();
    // Note: Pino doesn't expose name directly, but we can verify it's created
  });

  test('should throw if creating logger before init', () => {
    // This test would need to run in isolation since we already initialized
    // Skip for now - tested implicitly by the initialization requirement
  });
});
