# Forge v2 - TODO

## High Priority

### Fix Pretty Logging
**Problem:** Disabled pino-pretty because worker threads delay exit by ~1 second

**Options to investigate:**
1. **pino/file** - Write to stdout synchronously without workers
   ```typescript
   import pino from 'pino';
   const logger = pino(pino.destination({ sync: true }));
   ```

2. **Custom formatter** - Use Pino's formatters without transport
   ```typescript
   const logger = pino({
     formatters: {
       level: (label) => ({ level: label }),
       log: (object) => object
     },
     // Custom sync prettifier
   });
   ```

3. **Alternative pretty printers:**
   - `pino-colada` - Simpler, might not use workers
   - `pino-tiny` - Minimal pretty printer
   - Custom chalk-based formatter

4. **Proper worker cleanup:**
   - Research pino-pretty worker API
   - Implement graceful shutdown hooks
   - Use `process.on('beforeExit')` or similar

5. **Conditional pretty:**
   - Only enable for long-running commands
   - Disable for quick commands (--help, errors)
   - ENV var to toggle: `FORGE_PRETTY_LOGS=1`

**Current workaround:** JSON logs (fast exit)
**Desired:** Colored pretty logs with fast exit (<0.1s)

---

## Medium Priority

### Configuration Management
Research libraries for layered config (defaults → project → user):
- **cosmiconfig** - Find config in multiple places
- **conf** - Electron-style config with schema
- **rc** - Runtime config with cascading

### Module Sharing
Design how modules are published and consumed:
- npm packages vs git URLs
- Versioning strategy
- Private module auth
- Module registry/discovery

### Shell Completion
- Implement using `omelette` (already installed)
- Generate completion scripts for bash/zsh/fish
- Auto-complete commands, options, arguments

---

## Low Priority

### Testing Framework
- How to test forge commands?
- Mock $() shell calls?
- Integration vs unit tests?

### Documentation
- User guide
- Module authoring guide
- Migration guide (forge v1 → v2)
- API reference

### Error Messages
- Better styled error output (use chalk/boxen)
- Helpful hints for common errors
- Stack traces only in debug mode

### Top-Level Commands
- Implement `group: false` in module metadata
- Allow commands outside of groups
- Example: `forge2 version` (not `forge2 utils version`)

---

## Ideas / Future

- Watch mode for dev commands
- Interactive command picker (enquirer)
- Command aliases
- Hooks/plugins system
- Telemetry/analytics (opt-in)
- Auto-update mechanism
