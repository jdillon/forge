# Test Fixtures

This directory contains fixtures (test data and environments) used by the test suite.

## Structure

```
fixtures/
  test-project/           # Minimal Forge project for testing
    .forge2/
      config.yml          # Test project configuration
      test-commands.ts    # Commands designed for testing
```

## test-project

A minimal Forge project configured specifically for testing. Unlike `examples/`, this fixture:

- Has minimal configuration
- Includes commands designed for test verification
- Can be safely modified by tests
- Focuses on testing framework features, not real-world usage

## Usage in Tests

```typescript
import { join } from 'path';

const fixtureRoot = join(process.cwd(), 'tests/fixtures/test-project');

const result = spawnSync([
  './bin/forge2',
  '--root', fixtureRoot,
  'test', 'context'
]);
```

## Adding New Fixtures

1. Create subdirectory under `fixtures/`
2. Add README section documenting the fixture
3. Keep fixtures minimal and focused on specific test scenarios
