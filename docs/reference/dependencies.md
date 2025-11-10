# Dependency Policy for Forge

**Philosophy**: Minimize dependencies, vet thoroughly, prefer small packages over frameworks.

---

## Supply Chain Security Concerns

The npm ecosystem has serious supply chain risks:

- **2024 polyfill.io attack** - CDN serving malicious code to 100k+ sites
- **Fake packages** - Typosquatting (e.g., `chalk-next` vs `chalk`)
- **Maintainer takeovers** - Popular packages sold to bad actors
- **Deep dependency trees** - One compromised transitive dep = owned
- **Dependency confusion** - Private package names hijacked

**Our approach:** Strict vetting, minimal deps, regular audits.

---

## Dependency Selection Criteria

### ✅ MUST Have

1. **Active maintenance** - Commits within last 3 months
2. **Established reputation** - Either:
   - 5+ years old with stable maintainer
   - OR backed by major org (Vercel, etc.)
3. **High usage** - 1M+ weekly downloads (or well-known in community)
4. **TypeScript support** - Native TS or good types
5. **Small size** - Prefer < 100KB, avoid bloat
6. **Few dependencies** - Each dep is a risk vector

### ❌ MUST NOT Have

1. Obscure packages with < 10k downloads
2. Recently transferred ownership
3. Excessive dependencies (> 10 deps)
4. Lack of security policy
5. Obfuscated code

---

## Approved Dependencies (Curated List)

### Core CLI (Choose One Approach)

#### Option A: Minimal (Recommended)
**No dependencies** - Roll our own arg parsing
- ✅ Zero supply chain risk
- ✅ Full control
- ✅ Only need simple flags (`--dry-run`, `--verbose`, `--root`)
- ⚠️ More code to maintain

#### Option B: Commander.js
```json
{
  "commander": "^12.0.0"
}
```
- ✅ Battle-tested (2011-present)
- ✅ 7M+ weekly downloads
- ✅ Minimal dependencies
- ⚠️ Slightly overkill for our needs

#### Option C: Cleye (TypeScript-first)
```json
{
  "cleye": "^1.3.0"
}
```
- ✅ Modern, TypeScript-native
- ✅ Smaller than commander
- ✅ ESM-first
- ⚠️ Newer (less battle-tested)

**Recommendation:** Start with **Option A** (no deps), add commander later if needed.

---

### Logging

#### Recommended: Pino
```json
{
  "pino": "^8.19.0",
  "pino-pretty": "^11.0.0"  // Dev only
}
```

**Why Pino:**
- ✅ Fastest logger for Node/Bun
- ✅ JSON structured logging (machine-parseable)
- ✅ Mature (7+ years)
- ✅ Used by Fastify, Platformatic
- ✅ Minimal deps (1-2 only)

**Example usage:**
```typescript
import pino from 'pino';

const log = pino({
  level: process.env.LOG_LEVEL || 'info',
  transport: process.env.NODE_ENV !== 'production'
    ? { target: 'pino-pretty' }
    : undefined
});

log.info({ bucket, files: 42 }, 'Syncing to S3');
log.error({ err }, 'Deploy failed');
```

**Alternative: Console (built-in)**
```typescript
// No dependencies!
console.log('[INFO]', 'Syncing...');
console.error('[ERROR]', 'Failed:', error);
```

---

### Colors/Formatting

#### Recommended: Picocolors
```json
{
  "picocolors": "^1.0.0"
}
```

**Why Picocolors:**
- ✅ Tiny (1.4KB)
- ✅ Zero dependencies
- ✅ Used by Vite, PostCSS, Vitest
- ✅ Same API as chalk
- ✅ Backed by Vite team

**Example usage:**
```typescript
import pc from 'picocolors';

console.log(pc.green('✓') + ' Sync complete');
console.log(pc.yellow('⚠') + ' Warning: No cache');
console.log(pc.red('✗') + ' Deploy failed');
```

**Alternative: ANSI codes (built-in)**
```typescript
// No dependencies!
const red = (s) => `\x1b[31m${s}\x1b[0m`;
const green = (s) => `\x1b[32m${s}\x1b[0m`;
```

---

### Spinners/Progress

#### Recommended: Ora
```json
{
  "ora": "^8.0.0"
}
```

**Why Ora:**
- ✅ Simple, focused
- ✅ Popular (used by Yeoman, etc.)
- ✅ Small
- ⚠️ Has dependencies (check size)

**Example usage:**
```typescript
import ora from 'ora';

const spinner = ora('Deploying to staging...').start();
await deploy();
spinner.succeed('Deployed!');
```

**Alternative: Simple dots**
```typescript
// No dependencies!
process.stderr.write('Deploying...');
const interval = setInterval(() => process.stderr.write('.'), 500);
await deploy();
clearInterval(interval);
console.log(' done!');
```

---

### Interactive Prompts

#### Recommended: Enquirer
```json
{
  "enquirer": "^2.4.1"
}
```

**Why Enquirer:**
- ✅ Lightweight
- ✅ Good TypeScript support
- ✅ Multiple prompt types (confirm, select, input)

**Example usage:**
```typescript
import { confirm } from 'enquirer';

const proceed = await confirm({
  message: 'Deploy to production?',
  initial: false
});

if (proceed) {
  await deploy();
}
```

**Alternative: Bun.prompt (built-in)**
```typescript
// No dependencies!
const input = await Bun.prompt('Deploy to production? [y/N] ');
const proceed = input?.toLowerCase() === 'y';
```

---

## Recommended Starter Package.json

### Minimal Approach (Recommended)
```json
{
  "name": "forge2",
  "version": "2.0.0-prototype",
  "type": "module",
  "dependencies": {
    "picocolors": "^1.0.0"
  },
  "devDependencies": {
    "bun-types": "latest"
  }
}
```

**Only 1 dependency** (colors). Everything else built-in.

### Enhanced Approach (If You Want Features)
```json
{
  "name": "forge2",
  "version": "2.0.0-prototype",
  "type": "module",
  "dependencies": {
    "picocolors": "^1.0.0",
    "pino": "^8.19.0",
    "ora": "^8.0.0"
  },
  "devDependencies": {
    "bun-types": "latest",
    "pino-pretty": "^11.0.0"
  }
}
```

**3 dependencies** (colors, logging, spinners). Still minimal.

---

## Security Practices

### 1. Lock Dependencies
```bash
# Bun creates bun.lockb automatically
bun install

# Commit lockfile to git
git add bun.lockb
```

### 2. Audit Regularly
```bash
# Check for known vulnerabilities
bun pm audit

# Or use npm audit
npm audit
```

### 3. Review Before Adding
Before adding any dependency:
```bash
# Check npm page
open "https://www.npmjs.com/package/PACKAGE_NAME"

# Check GitHub
# - Recent commits?
# - Active maintainer?
# - Security policy?
# - Recent issues/PRs?

# Check dependencies
bun pm ls PACKAGE_NAME
```

### 4. Pin Major Versions
```json
{
  "dependencies": {
    "picocolors": "^1.0.0"  // Allow patches/minor (1.x.x)
  }
}
```

### 5. Vendoring Critical Code
For critical utilities, consider vendoring (copying into repo):
```
lib/
├── core.ts
└── vendor/
    ├── colors.ts      # Copied from picocolors (if needed)
    └── args.ts        # Our own arg parser
```

---

## Packages to AVOID

### ❌ High-Risk Packages

- **left-pad and friends** - Tiny packages that can be replaced
- **Abandoned packages** - No commits in 2+ years
- **Recently transferred** - Check npm ownership history
- **Excessive dependencies** - If it pulls in 50+ packages, skip it
- **Obfuscated code** - If you can't read it, don't use it

### ❌ Bloated Frameworks

- **Avoid:** Full CLI frameworks like oclif, yargs (too heavy)
- **Prefer:** Small, focused libraries

---

## Dependency Review Checklist

Before adding any package:

- [ ] Check npm page for download count (> 1M/week?)
- [ ] Check GitHub for recent activity (commits in last 3 months?)
- [ ] Check dependency count (`bun pm ls PACKAGE`)
- [ ] Check package size (< 100KB unpacked?)
- [ ] Read the code (can you understand what it does?)
- [ ] Check for security policy (does repo have SECURITY.md?)
- [ ] Check recent issues (any security concerns?)
- [ ] Check maintainer history (stable or recent transfer?)

---

## Alternative: Build Our Own

For maximum security and control, we can build minimal versions:

### Simple Arg Parser (~20 lines)
```typescript
export function parseArgs(argv: string[]) {
  const flags: Record<string, boolean | string> = {};
  const args: string[] = [];

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg.startsWith('--')) {
      const key = arg.slice(2);
      const next = argv[i + 1];
      if (next && !next.startsWith('-')) {
        flags[key] = next;
        i++;
      } else {
        flags[key] = true;
      }
    } else {
      args.push(arg);
    }
  }

  return { flags, args };
}
```

### Simple Logger (~30 lines)
```typescript
const LEVELS = { debug: 0, info: 1, warn: 2, error: 3 };

export class Logger {
  constructor(private level: keyof typeof LEVELS = 'info') {}

  private log(level: keyof typeof LEVELS, ...args: any[]) {
    if (LEVELS[level] >= LEVELS[this.level]) {
      const prefix = `[${level.toUpperCase()}]`;
      console.log(prefix, ...args);
    }
  }

  debug(...args: any[]) { this.log('debug', ...args); }
  info(...args: any[]) { this.log('info', ...args); }
  warn(...args: any[]) { this.log('warn', ...args); }
  error(...args: any[]) { this.log('error', ...args); }
}
```

### Simple Colors (~10 lines)
```typescript
export const colors = {
  red: (s: string) => `\x1b[31m${s}\x1b[0m`,
  green: (s: string) => `\x1b[32m${s}\x1b[0m`,
  yellow: (s: string) => `\x1b[33m${s}\x1b[0m`,
  blue: (s: string) => `\x1b[34m${s}\x1b[0m`,
  gray: (s: string) => `\x1b[90m${s}\x1b[0m`,
};
```

**Total: ~60 lines of code, zero dependencies.**

---

## Recommendation Summary

### Phase 1: Prototype (Now)
```json
{
  "dependencies": {
    "picocolors": "^1.0.0"  // Only this one
  }
}
```

Roll our own arg parsing and logging. Keep it simple.

### Phase 2: If We Need More (Later)
```json
{
  "dependencies": {
    "picocolors": "^1.0.0",
    "pino": "^8.19.0"
  }
}
```

Add logging if structured logs become important.

### Phase 3: Polish (Much Later)
```json
{
  "dependencies": {
    "picocolors": "^1.0.0",
    "pino": "^8.19.0",
    "ora": "^8.0.0"
  }
}
```

Add spinners for better UX.

---

## References

- **Pino**: https://github.com/pinojs/pino
- **Picocolors**: https://github.com/alexeyraspopov/picocolors
- **Ora**: https://github.com/sindresorhus/ora
- **Enquirer**: https://github.com/enquirer/enquirer
- **Bun Package Manager**: https://bun.sh/docs/cli/install

---

**Bottom line:** Start minimal, add deps only when really needed, vet everything.
