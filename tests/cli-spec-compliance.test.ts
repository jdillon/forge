/**
 * CLI Option Handling Specification Compliance Tests
 *
 * Tests the reference implementation (tests/fixtures/cli-spec.ts)
 * against the specification in docs/planning/cli-option-handling.md
 */

import { describe, test, expect } from 'bun:test';
import { spawnSync } from 'bun';

const CLI_PATH = './tests/fixtures/cli-spec.ts';

describe('CLI Specification Compliance', () => {
  // ==========================================================================
  // Exit Codes - Success (0)
  // ==========================================================================

  describe('Exit Code 0 - Success', () => {
    test('should exit 0 for --version', () => {
      const result = spawnSync([CLI_PATH, '--version']);
      expect(result.exitCode).toBe(0);
      expect(result.stdout.toString()).toContain('1.0.0');
    });

    test('should exit 0 for -V', () => {
      const result = spawnSync([CLI_PATH, '-V']);
      expect(result.exitCode).toBe(0);
      expect(result.stdout.toString()).toContain('1.0.0');
    });

    test('should exit 0 for --help', () => {
      const result = spawnSync([CLI_PATH, '--help']);
      expect(result.exitCode).toBe(0);
      const output = result.stdout.toString();
      expect(output).toContain('Usage: example');
      expect(output).toContain('Commands:');
      expect(output).toContain('greet');
      expect(output).toContain('ping');
      expect(output).toContain('deploy');
    });

    test('should exit 0 for -h', () => {
      const result = spawnSync([CLI_PATH, '-h']);
      expect(result.exitCode).toBe(0);
      expect(result.stdout.toString()).toContain('Usage: example');
    });

    test('should exit 0 for successful command', () => {
      const result = spawnSync([CLI_PATH, 'greet', 'Alice']);
      expect(result.exitCode).toBe(0);
      expect(result.stdout.toString()).toContain('Hello, Alice!');
    });

    test('should exit 0 for command with optional arg using default', () => {
      const result = spawnSync([CLI_PATH, 'greet']);
      expect(result.exitCode).toBe(0);
      expect(result.stdout.toString()).toContain('Hello, World!');
    });

    test('should exit 0 for command with required arg', () => {
      const result = spawnSync([CLI_PATH, 'deploy', 'production']);
      expect(result.exitCode).toBe(0);
      expect(result.stdout.toString()).toContain('Deploying to production');
    });
  });

  // ==========================================================================
  // Exit Codes - User Input Error (1)
  // ==========================================================================

  describe('Exit Code 1 - User Input Error', () => {
    test('should exit 1 when no subcommand provided', () => {
      const result = spawnSync([CLI_PATH]);
      expect(result.exitCode).toBe(1);
      // Should show help (but exit 1 because user didn't provide command)
      expect(result.stdout.toString()).toContain('Usage: example');
    });

    test('should exit 1 for invalid top-level option', () => {
      const result = spawnSync([CLI_PATH, '--foo']);
      expect(result.exitCode).toBe(1);
      const stderr = result.stderr.toString();
      expect(stderr).toContain('ERROR: unknown option');
      expect(stderr).toContain('--foo');
      expect(stderr).toContain('Try \'example --help\'');
    });

    test('should exit 1 for invalid top-level option before subcommand', () => {
      const result = spawnSync([CLI_PATH, '--foo', 'greet']);
      expect(result.exitCode).toBe(1);
      const stderr = result.stderr.toString();
      expect(stderr).toContain('ERROR: unknown option');
      expect(stderr).toContain('--foo');
    });

    test('should exit 1 for invalid subcommand option', () => {
      const result = spawnSync([CLI_PATH, 'greet', '--foo']);
      expect(result.exitCode).toBe(1);
      const stderr = result.stderr.toString();
      expect(stderr).toContain('ERROR: unknown option');
      expect(stderr).toContain('--foo');
    });

    test('should exit 1 for missing required argument', () => {
      const result = spawnSync([CLI_PATH, 'deploy']);
      expect(result.exitCode).toBe(1);
      const stderr = result.stderr.toString();
      expect(stderr).toContain('ERROR: missing required argument');
      expect(stderr).toContain('environment');
    });
  });

  // ==========================================================================
  // Option Positioning - Top-Level Options
  // ==========================================================================

  describe('Top-Level Option Positioning', () => {
    test('should accept top-level option before subcommand', () => {
      const result = spawnSync([CLI_PATH, '--debug', 'greet', 'Alice']);
      expect(result.exitCode).toBe(0);
      const output = result.stdout.toString();
      expect(output).toContain('[DEBUG]');
      expect(output).toContain('Hello, Alice!');
    });

    test('should accept multiple top-level options', () => {
      const result = spawnSync([CLI_PATH, '--debug', '--log-level', 'trace', 'greet', 'Alice']);
      expect(result.exitCode).toBe(0);
      const output = result.stdout.toString();
      expect(output).toContain('[DEBUG]');
      expect(output).toContain('logLevel: "trace"');
    });

    test('should reject top-level option after subcommand', () => {
      const result = spawnSync([CLI_PATH, 'greet', '--debug']);
      expect(result.exitCode).toBe(1);
      const stderr = result.stderr.toString();
      expect(stderr).toContain('ERROR: unknown option');
      expect(stderr).toContain('--debug');
    });
  });

  // ==========================================================================
  // Option Positioning - Subcommand Options
  // ==========================================================================

  describe('Subcommand Option Positioning', () => {
    test('should accept subcommand option after subcommand name', () => {
      const result = spawnSync([CLI_PATH, 'greet', '--loud', 'Alice']);
      expect(result.exitCode).toBe(0);
      expect(result.stdout.toString()).toContain('HELLO, ALICE!');
    });

    test('should accept subcommand option after argument', () => {
      const result = spawnSync([CLI_PATH, 'greet', 'Alice', '--loud']);
      expect(result.exitCode).toBe(0);
      expect(result.stdout.toString()).toContain('HELLO, ALICE!');
    });

    test('should accept combined top-level and subcommand options', () => {
      const result = spawnSync([CLI_PATH, '--debug', 'greet', 'Alice', '--loud']);
      expect(result.exitCode).toBe(0);
      const output = result.stdout.toString();
      expect(output).toContain('[DEBUG]');
      expect(output).toContain('HELLO, ALICE!');
    });
  });

  // ==========================================================================
  // Help Behavior
  // ==========================================================================

  describe('Help Behavior', () => {
    test('--help should show main program help with subcommands', () => {
      const result = spawnSync([CLI_PATH, '--help']);
      expect(result.exitCode).toBe(0);
      const output = result.stdout.toString();
      expect(output).toContain('Usage: example');
      expect(output).toContain('Commands:');
      expect(output).toContain('greet');
      expect(output).toContain('ping');
      expect(output).toContain('deploy');
    });

    test('--help before subcommand should show main program help', () => {
      const result = spawnSync([CLI_PATH, '--help', 'greet']);
      expect(result.exitCode).toBe(0);
      const output = result.stdout.toString();
      expect(output).toContain('Usage: example');
      expect(output).toContain('Commands:');
      // Should NOT show greet-specific help
      expect(output).not.toContain('Use uppercase');
    });

    test('subcommand --help should show subcommand-specific help', () => {
      const result = spawnSync([CLI_PATH, 'greet', '--help']);
      expect(result.exitCode).toBe(0);
      const output = result.stdout.toString();
      expect(output).toContain('Usage: example greet');
      expect(output).toContain('Greet someone');
      expect(output).toContain('--loud');
      expect(output).toContain('Use uppercase');
    });

    test('no subcommand should show help with exit code 1', () => {
      const result = spawnSync([CLI_PATH]);
      expect(result.exitCode).toBe(1);
      const output = result.stdout.toString();
      expect(output).toContain('Usage: example');
      expect(output).toContain('Commands:');
    });
  });

  // ==========================================================================
  // Version Behavior
  // ==========================================================================

  describe('Version Behavior', () => {
    test('--version should show version and exit 0', () => {
      const result = spawnSync([CLI_PATH, '--version']);
      expect(result.exitCode).toBe(0);
      expect(result.stdout.toString().trim()).toBe('1.0.0');
    });

    test('-V should show version and exit 0', () => {
      const result = spawnSync([CLI_PATH, '-V']);
      expect(result.exitCode).toBe(0);
      expect(result.stdout.toString().trim()).toBe('1.0.0');
    });

    test('--version should work with other options', () => {
      const result = spawnSync([CLI_PATH, '--debug', '--version']);
      expect(result.exitCode).toBe(0);
      expect(result.stdout.toString()).toContain('1.0.0');
    });
  });

  // ==========================================================================
  // Argument Handling
  // ==========================================================================

  describe('Argument Handling', () => {
    test('optional argument can be omitted', () => {
      const result = spawnSync([CLI_PATH, 'greet']);
      expect(result.exitCode).toBe(0);
      expect(result.stdout.toString()).toContain('Hello, World!');
    });

    test('optional argument can be provided', () => {
      const result = spawnSync([CLI_PATH, 'greet', 'Alice']);
      expect(result.exitCode).toBe(0);
      expect(result.stdout.toString()).toContain('Hello, Alice!');
    });

    test('required argument must be provided', () => {
      const result = spawnSync([CLI_PATH, 'deploy']);
      expect(result.exitCode).toBe(1);
      expect(result.stderr.toString()).toContain('missing required argument');
    });

    test('required argument works when provided', () => {
      const result = spawnSync([CLI_PATH, 'deploy', 'production']);
      expect(result.exitCode).toBe(0);
      expect(result.stdout.toString()).toContain('Deploying to production');
    });
  });

  // ==========================================================================
  // Error Message Format
  // ==========================================================================

  describe('Error Message Format', () => {
    test('error messages should be terse with hint', () => {
      const result = spawnSync([CLI_PATH, '--foo']);
      expect(result.exitCode).toBe(1);
      const stderr = result.stderr.toString();
      expect(stderr).toContain('ERROR:');
      expect(stderr).toContain('unknown option \'--foo\'');
      expect(stderr).toContain('Try \'example --help\' for more information');
    });

    test('missing argument error should be terse', () => {
      const result = spawnSync([CLI_PATH, 'deploy']);
      expect(result.exitCode).toBe(1);
      const stderr = result.stderr.toString();
      expect(stderr).toContain('ERROR:');
      expect(stderr).toContain('missing required argument');
      expect(stderr).toContain('Try \'example --help\' for more information');
    });
  });

  // ==========================================================================
  // Debug Mode
  // ==========================================================================

  describe('Debug Mode', () => {
    test('--debug flag should enable debug output', () => {
      const result = spawnSync([CLI_PATH, '--debug', 'greet', 'Alice']);
      expect(result.exitCode).toBe(0);
      const output = result.stdout.toString();
      expect(output).toContain('[DEBUG]');
      expect(output).toContain('greet command');
      expect(output).toContain('debug: true');
    });

    test('debug flag should pass through to subcommands', () => {
      const result = spawnSync([CLI_PATH, '--debug', 'ping']);
      expect(result.exitCode).toBe(0);
      const output = result.stdout.toString();
      expect(output).toContain('[DEBUG]');
      expect(output).toContain('ping command');
    });
  });

  // ==========================================================================
  // Subcommand Tests
  // ==========================================================================

  describe('Subcommands', () => {
    test('greet subcommand works', () => {
      const result = spawnSync([CLI_PATH, 'greet', 'Alice']);
      expect(result.exitCode).toBe(0);
      expect(result.stdout.toString()).toContain('Hello, Alice!');
    });

    test('greet --loud option works', () => {
      const result = spawnSync([CLI_PATH, 'greet', 'Alice', '--loud']);
      expect(result.exitCode).toBe(0);
      expect(result.stdout.toString()).toContain('HELLO, ALICE!');
    });

    test('ping subcommand works', () => {
      const result = spawnSync([CLI_PATH, 'ping']);
      expect(result.exitCode).toBe(0);
      expect(result.stdout.toString()).toContain('pong');
    });

    test('deploy subcommand works', () => {
      const result = spawnSync([CLI_PATH, 'deploy', 'production']);
      expect(result.exitCode).toBe(0);
      const output = result.stdout.toString();
      expect(output).toContain('Deploying to production');
      expect(output).toContain('Deployment complete!');
    });

    test('deploy --force option works', () => {
      const result = spawnSync([CLI_PATH, 'deploy', 'production', '--force']);
      expect(result.exitCode).toBe(0);
      expect(result.stdout.toString()).toContain('Deploying to production (forced)');
    });
  });
});
