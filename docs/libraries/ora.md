# ora

**Elegant terminal spinners**

- npm: https://www.npmjs.com/package/ora
- GitHub: https://github.com/sindresorhus/ora
- Downloads: 39M+ weekly
- Maintainer: Sindre Sorhus (trusted)

---

## Installation

```bash
bun add ora
```

**Current version in forge2**: `^8.0.0`

---

## Basic Usage

```typescript
import ora from 'ora';

const spinner = ora('Loading...').start();

await doWork();

spinner.succeed('Done!');
// Output: ✔ Done!
```

---

## Spinner States

```typescript
const spinner = ora('Deploying...').start();

try {
  await deploy();
  spinner.succeed('Deployed!');
  // Output: ✔ Deployed!

} catch (error) {
  spinner.fail('Deploy failed');
  // Output: ✖ Deploy failed
}
```

### Available Methods

```typescript
spinner.start();      // Start spinning
spinner.stop();       // Stop spinner (no symbol)
spinner.succeed();    // ✔ success symbol
spinner.fail();       // ✖ failure symbol
spinner.warn();       // ⚠ warning symbol
spinner.info();       // ℹ info symbol
```

---

## Updating Text

```typescript
const spinner = ora('Building...').start();

spinner.text = 'Running tests...';
await runTests();

spinner.text = 'Uploading...';
await upload();

spinner.succeed('Complete!');
```

---

## Custom Spinners

```typescript
const spinner = ora({
  text: 'Loading',
  spinner: 'dots',      // Default
  color: 'cyan',
  prefixText: '🚀'
}).start();

// Available spinners: dots, line, arrow, bounce, pong, etc.
// See: https://github.com/sindresorhus/cli-spinners
```

---

## Promise Support

```typescript
// Automatically handle promise resolution
await ora(async () => {
  await deploy();
}, {
  text: 'Deploying...',
  successText: 'Deployed!',
  failText: 'Deploy failed'
});
```

---

## Common Patterns in Forge

### Simple Operation
```typescript
const spinner = ora('Building website...').start();

try {
  await $`npm run build`;
  spinner.succeed(chalk.green('Build complete!'));
} catch (error) {
  spinner.fail(chalk.red('Build failed'));
  throw error;
}
```

### Multi-Step with Text Updates
```typescript
const spinner = ora('Starting deploy...').start();

spinner.text = 'Cleaning build directory...';
await $`rm -rf dist`;

spinner.text = 'Building assets...';
await $`npm run build`;

spinner.text = 'Uploading to S3...';
await $`aws s3 sync dist/ s3://bucket/`;

spinner.succeed(chalk.green('Deploy complete!'));
```

### With Logging
```typescript
import { createLogger } from '@forge/logger';
const log = createLogger('deploy');

const spinner = ora('Deploying...').start();

log.info({ env: 'staging' }, 'Starting deploy');

try {
  await deploy();
  spinner.succeed('Deployed!');
  log.info('Deploy succeeded');
} catch (error) {
  spinner.fail('Deploy failed');
  log.error({ err: error }, 'Deploy failed');
  throw error;
}
```

---

## Stopping Without Symbol

```typescript
const spinner = ora('Loading...').start();
await doWork();
spinner.stop();  // Just stops, no ✔ or ✖
```

---

## Silent Mode

```typescript
const spinner = ora({
  text: 'Loading',
  isSilent: process.env.CI === 'true'  // Disable in CI
}).start();
```

---

## ESM Only

**Note**: ora v8+ is ESM-only. Requires `"type": "module"` in package.json.

---

## Performance

- Lightweight
- Works in CI (automatically disables animation)
- Respects `NO_COLOR` environment variable

---

## References

- Documentation: https://github.com/sindresorhus/ora#readme
- Spinner styles: https://github.com/sindresorhus/cli-spinners
