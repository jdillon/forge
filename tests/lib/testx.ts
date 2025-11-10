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
 * Enhanced test extension for Bun that provides test context
 *
 * Only wraps `describe` and `test` to inject TestContext.
 * Import everything else directly from 'bun:test':
 *
 * @example
 * import { describe, test } from './lib/testx';
 * import { expect, beforeEach } from 'bun:test';
 *
 * describe('My Suite', () => {
 *   test('my test', async (ctx) => {
 *     expect(ctx.fileName).toBe('my-file.test.ts');
 *   });
 * });
 */

import { describe as bunDescribe, test as bunTest } from 'bun:test';

/**
 * Test context injected into wrapped test functions
 */
export interface TestContext {
  /** Test file name (e.g., "cli-help.test.ts") */
  fileName: string;
  /** Current test name */
  testName: string;
  /** Stack of describe block names from outermost to innermost */
  describePath: string[];
  /** Full hierarchical name with " > " separator */
  fullName: string;
}

/**
 * Function signature for wrapped tests
 */
type TestFunction = (ctx: TestContext) => void | Promise<void>;

// Track describe block stack (reset per file)
let describeStack: string[] = [];

// Track whether we're in Bun's execution phase (to skip our own tracking)
let inBunExecution = false;

/**
 * Get the current test file name from stack trace
 */
function getTestFileName(): string {
  const err = new Error();
  const stack = err.stack || '';

  // Look for .test.ts or .test.js in stack trace
  const match = stack.match(/([^/\s]+\.test\.[tj]s)/);
  if (match) {
    return match[1];
  }

  return 'unknown.test.ts';
}

/**
 * Build test context for a test
 */
function buildContext(testName: string): TestContext {
  const fileName = getTestFileName();
  const describePath = [...describeStack];
  const fullName = describePath.length > 0
    ? `${describePath.join(' > ')} > ${testName}`
    : testName;

  return {
    fileName,
    testName,
    describePath,
    fullName,
  };
}

// ============================================================================
// Describe Wrappers
// ============================================================================

/**
 * Enhanced describe that tracks the describe block stack
 */
export function describe(name: string, fn: () => void): void {
  if (!inBunExecution) {
    // Our own execution: track stack for context capture
    describeStack.push(name);

    try {
      // Call function to register tests/nested describes with stack context
      fn();
    } finally {
      describeStack.pop();
    }
  }

  // Register with Bun (will call fn again, but with inBunExecution=true)
  bunDescribe(name, () => {
    const wasInBunExecution = inBunExecution;
    inBunExecution = true;
    try {
      fn();
    } finally {
      inBunExecution = wasInBunExecution;
    }
  });
}

describe.skip = function(name: string, fn: () => void): void {
  return bunDescribe.skip(name, () => {
    describeStack.push(name);
    try {
      fn();
    } finally {
      describeStack.pop();
    }
  });
};

describe.only = function(name: string, fn: () => void): void {
  return bunDescribe.only(name, () => {
    describeStack.push(name);
    try {
      fn();
    } finally {
      describeStack.pop();
    }
  });
};

describe.todo = function(name: string): void {
  return bunDescribe.todo(name, () => {});
};

// ============================================================================
// Test Wrappers
// ============================================================================

/**
 * Enhanced test that injects TestContext
 */
export function test(name: string, fn: TestFunction, timeout?: number): void {
  if (!inBunExecution) {
    // First pass: capture context at registration time
    const ctx = buildContext(name);

    // Register with Bun (only during our own execution, not Bun's re-execution)
    return bunTest(name, async () => {
      await fn(ctx);
    }, timeout);
  }
  // During Bun's re-execution of describe blocks, don't re-register tests
}

test.skip = function(name: string, fn: TestFunction, timeout?: number): void {
  const ctx = buildContext(name);

  return bunTest.skip(name, async () => {
    await fn(ctx);
  }, timeout);
};

test.only = function(name: string, fn: TestFunction, timeout?: number): void {
  const ctx = buildContext(name);

  return bunTest.only(name, async () => {
    await fn(ctx);
  }, timeout);
};

test.todo = function(name: string, fn?: TestFunction, timeout?: number): void {
  if (fn) {
    const ctx = buildContext(name);
    return bunTest.todo(name, async () => {
      await fn(ctx);
    }, timeout);
  }
  return bunTest.todo(name, () => {});
};

test.if = function(condition: boolean) {
  return function(name: string, fn: TestFunction, timeout?: number): void {
    const ctx = buildContext(name);

    return bunTest.if(condition)(name, async () => {
      await fn(ctx);
    }, timeout);
  };
};

test.skipIf = function(condition: boolean) {
  return function(name: string, fn: TestFunction, timeout?: number): void {
    const ctx = buildContext(name);

    return bunTest.skipIf(condition)(name, async () => {
      await fn(ctx);
    }, timeout);
  };
};

test.each = function<T>(table: T[]) {
  return function(name: string, fn: (item: T, ctx: TestContext) => void | Promise<void>, timeout?: number): void {
    return bunTest.each(table)(name, async (item: T) => {
      const ctx = buildContext(name);
      await fn(item, ctx);
    }, timeout);
  };
};
