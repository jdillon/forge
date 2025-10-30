/**
 * Tests for logger configuration
 */

import { describe, test, expect, beforeEach } from 'bun:test';
import { configureLogger, getLoggerConfig, createLogger } from '../lib/logger';

describe('Logger Configuration', () => {
  beforeEach(() => {
    // Reset to defaults before each test
    configureLogger({ level: 'info', format: 'pretty', color: true });
  });

  test('should have default configuration', () => {
    const config = getLoggerConfig();
    expect(config.level).toBe('info');
    expect(config.format).toBe('pretty');
    expect(config.color).toBe(true);
  });

  test('should update log level', () => {
    configureLogger({ level: 'debug' });
    const config = getLoggerConfig();
    expect(config.level).toBe('debug');
  });

  test('should update log format to json', () => {
    configureLogger({ format: 'json' });
    const config = getLoggerConfig();
    expect(config.format).toBe('json');
  });

  test('should update log format to pretty', () => {
    configureLogger({ format: 'pretty' });
    const config = getLoggerConfig();
    expect(config.format).toBe('pretty');
  });

  test('should disable colors', () => {
    configureLogger({ color: false });
    const config = getLoggerConfig();
    expect(config.color).toBe(false);
  });

  test('should enable colors', () => {
    configureLogger({ color: false });
    configureLogger({ color: true });
    const config = getLoggerConfig();
    expect(config.color).toBe(true);
  });

  test('should update multiple settings at once', () => {
    configureLogger({ level: 'debug', format: 'json', color: false });
    const config = getLoggerConfig();
    expect(config.level).toBe('debug');
    expect(config.format).toBe('json');
    expect(config.color).toBe(false);
  });

  test('should create logger instance', () => {
    const logger = createLogger('test');
    expect(logger).toBeDefined();
    expect(logger.level).toBe('info');
  });

  test('should create logger with custom name', () => {
    const logger = createLogger('custom-logger');
    expect(logger).toBeDefined();
    // Note: Pino doesn't expose name directly, but we can verify it's created
  });
});
