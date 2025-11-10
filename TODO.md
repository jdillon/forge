# Forge - TODO

## High Priority

### ✅ Fix Pretty Logging - COMPLETE
**Problem:** Disabled pino-pretty because worker threads delay exit by ~1 second

**Solution:** Custom synchronous PrettyStream that formats logs with chalk
- No worker threads - formats JSON directly in main thread
- Fast exit: ~0.08s (vs ~1.1s with pino-pretty)
- Colorized output: time, level, logger name, message, extras
- Can disable with `FORGE_PRETTY_LOGS=0` env var

**Note:** Avoid using `name` field in log data - it conflicts with Pino's internal logger name field. Use descriptive field names like `userName`, `fileName`, etc.

---

## Medium Priority

### ✅ Configuration Management - COMPLETE
Now using **cosmiconfig** with YAML/JSON/JS support:
- Layered config: user → project → local (gitignored)
- Multiple format support (.yml, .json, .js, .forge2rc)
- Deep merge algorithm for settings

**TODO**: Add optional runtime validation with Zod
- Validate config structure on load
- Better error messages for invalid configs
- Type-safe settings access

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
