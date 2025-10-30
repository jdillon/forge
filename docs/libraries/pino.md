# pino

**Fast JSON logger for Node.js**

- npm: https://www.npmjs.com/package/pino
- GitHub: https://github.com/pinojs/pino
- Downloads: 20M+ weekly
- Fastest JSON logger

---

## Installation

```bash
bun add pino
bun add -D pino-pretty
```

**Current version in forge2**: `^8.19.0` (pino), `^11.0.0` (pino-pretty)

---

## Basic Usage

```typescript
import { createLogger } from './lib/logger';

const log = createLogger('my-command');

log.info('Server started');
log.error({ err: error }, 'Request failed');
```

---

## Forge Logger Setup

```typescript
// lib/logger.ts
import pino from 'pino';

export function createLogger(name?: string) {
  const isDev = process.env.NODE_ENV !== 'production';

  return pino({
    name,
    level: process.env.LOG_LEVEL || (isDev ? 'info' : 'warn'),
    transport: isDev ? {
      target: 'pino-pretty',
      options: {
        colorize: true,
        translateTime: 'HH:MM:ss',
        ignore: 'pid,hostname'
      }
    } : undefined
  });
}
```

---

## Log Levels

```typescript
log.trace('Very detailed');  // 10
log.debug('Debug info');     // 20
log.info('Info message');    // 30
log.warn('Warning');         // 40
log.error('Error');          // 50
log.fatal('Fatal error');    // 60
```

---

## Structured Logging

```typescript
// Add context data
log.info({
  env: 'staging',
  fileCount: 42,
  duration: 1234
}, 'Deploy succeeded');

// Output (JSON):
// {"level":30,"time":1698765432,"env":"staging","fileCount":42,"duration":1234,"msg":"Deploy succeeded"}
```

---

## Error Logging

```typescript
try {
  await deploy();
} catch (error) {
  log.error({ err: error }, 'Deploy failed');
}

// Pino automatically serializes error stack
```

---

## Child Loggers

```typescript
const log = createLogger('deploy');

const childLog = log.child({ env: 'staging' });
childLog.info('Starting');  // Includes env:staging automatically
```

---

## Pretty Mode (Development)

```typescript
// Pretty output in development:
[22:34:18] INFO (deploy): Starting build
[22:34:19] INFO (deploy): Build succeeded {"duration":850}

// JSON in production:
{"level":30,"time":1698765432,"name":"deploy","msg":"Build succeeded","duration":850}
```

---

## Common Patterns in Forge

### Command Logging
```typescript
import { createLogger } from '@forge/logger';

const log = createLogger('deploy');

export const deploy: ForgeCommand = {
  description: 'Deploy',
  execute: async (options, args) => {
    log.info({ options, env: args[0] }, 'Starting deploy');

    try {
      await doWork();
      log.info({ duration: 1234 }, 'Deploy succeeded');
    } catch (error) {
      log.error({ err: error }, 'Deploy failed');
      throw error;
    }
  }
};
```

### Separation: User vs Audit
```typescript
// User-facing output (console)
console.log(chalk.green('✓ Deploy successful'));

// Audit trail (structured logs)
log.info({
  event: 'deploy',
  env: 'staging',
  fileCount: 42
}, 'Deploy completed');
```

---

## Log Level Configuration

```bash
# Environment variable
LOG_LEVEL=debug forge2 deploy

# Or programmatically
log.level = 'debug';
```

---

## Log to File

```typescript
import pino from 'pino';

const log = pino(
  pino.destination('/var/log/forge2.log')
);
```

---

## Performance

Pino is designed for speed:
- Asynchronous logging
- Minimal overhead
- Doesn't block event loop

---

## References

- Documentation: https://getpino.io/
- Pretty printer: https://github.com/pinojs/pino-pretty
