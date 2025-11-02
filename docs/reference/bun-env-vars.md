I'll research the environment variables that Bun uses for you.Based on my research of Bun's documentation and community resources, here's a comprehensive list of environment variables that Bun uses:

## Bun-Specific Environment Variables

### Runtime & Transpiler
- **`BUN_RUNTIME_TRANSPILER_CACHE_PATH`** - Sets the directory for caching transpiled files (>50 KB). Set to empty string or `"0"` to disable caching
- **`BUN_OPTIONS`** - Prepends command-line arguments to any Bun execution (e.g., `BUN_OPTIONS="--hot"`)

### Debugging & Logging
- **`BUN_CONFIG_VERBOSE_FETCH`** - Logs network requests made with `fetch()` or `node:http`
  - `curl` = logs as curl commands
  - `1` or `true` = logs request/response without curl format
- **`BUN_DEBUG_<scope>`** - Enables debug logging for specific scopes (e.g., `BUN_DEBUG_EventLoop=1`)
- **`BUN_DEBUG_QUIET_LOGS`** - Set to `1` to disable all debug logging except explicitly enabled scopes
- **`BUN_DEBUG`** - Set to a file path (e.g., `BUN_DEBUG=output.log`) to dump debug logs to a file

### Installation & Package Management
- **`BUN_INSTALL`** - Bun's installation directory (typically `~/.bun`)
- **`BUN_INSTALL_BIN`** - Directory where globally installed binaries/CLIs are placed (default: `~/.bun/bin`)
- **`BUN_INSTALL_CACHE_DIR`** - Location of the global package cache (default: `~/.bun/install/cache`)
- **`BUN_INSTALL_GLOBAL_DIR`** - Directory for globally installed packages
- **`BUN_CONFIG_REGISTRY`** - Set npm registry URL (default: `https://registry.npmjs.org`)
- **`BUN_CONFIG_TOKEN`** - Set an auth token for registry
- **`BUN_CONFIG_YARN_LOCKFILE`** - Save a Yarn v1-style `yarn.lock`
- **`BUN_CONFIG_LINK_NATIVE_BINS`** - Control linking of native binaries
- **`BUN_CONFIG_MAX_HTTP_REQUESTS`** - Maximum concurrent HTTP requests for `fetch` and `bun install` (default: 256)

### Display & Output
- **`NO_COLOR`** - Set to `1` to disable ANSI color output
- **`FORCE_COLOR`** - Set to `1` to force enable ANSI color output (overrides `NO_COLOR`)
- **`BUN_CONFIG_NO_CLEAR_TERMINAL_ON_RELOAD`** - Set to `true` to prevent clearing console on reload with `--watch`

### System & Performance
- **`TMPDIR`** - Temporary directory for intermediate assets (default: `/tmp` on Linux, `/private/tmp` on macOS)
- **`BUN_GARBAGE_COLLECTOR_LEVEL`** - Controls garbage collection aggressiveness

### Telemetry & Crash Reporting
- **`DO_NOT_TRACK`** - Set to `1` to disable crash report uploads and telemetry

### Executable Behavior
- **`BUN_BE_BUN`** - Set to `1` to make a standalone executable behave like the `bun` CLI itself

### Node.js Compatibility
- **`NODE_TLS_REJECT_UNAUTHORIZED`** - Set to `0` to disable SSL certificate validation (inherited from Node.js)
- **`NODE_ENV`** - Standard environment variable (values: `production`, `development`, `test`)

## Standard Environment Variables Bun Reads

Bun automatically loads environment variables from `.env` files in this order (increasing precedence):
1. `.env`
2. `.env.production` / `.env.development` / `.env.test` (based on `NODE_ENV`)
3. `.env.local`

You can also specify custom env files with the `--env-file` flag.

All these variables can be accessed in your code via:
- `process.env.VARIABLE_NAME`
- `Bun.env.VARIABLE_NAME`
- `import.meta.env.VARIABLE_NAME`
