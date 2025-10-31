# Customize Commander Error Message Format

**Status**: Backlog / Low Priority
**Type**: Enhancement
**Complexity**: Simple
**Related**: Error handling, CLI UX

---

## Overview

Commander.js provides `outputError()` callback in `configureOutput()` that allows customizing error message text. This could be used to make error messages more consistent with Forge's style or potentially support internationalization.

## Current State

**Location**: `lib/cli.ts` lines 112-115

```typescript
program.configureOutput({
  writeErr: (str) => process.stderr.write(useColor ? chalk.red(str) : str),
  outputError: (str, write) => write(useColor ? chalk.red(str) : str),
});
```

Currently only handles coloring, not message formatting.

**Commander's default error format**:
```
error: option '--log-format <format>' argument 'xml' is invalid. Allowed choices are json, pretty.
```

## Options

### Option 1: Style Consistency Only

**Goal**: Make Commander errors match Forge's `ERROR:` convention

**Implementation**:
```typescript
program.configureOutput({
  writeErr: (str) => process.stderr.write(useColor ? chalk.red(str) : str),
  outputError: (str, write) => {
    // Customize Commander's error messages to match our style
    const customized = str
      .replace(/^error:/i, 'ERROR:')  // Uppercase ERROR
      .replace(/argument '([^']+)' is invalid/, "value '$1' is invalid");
    write(customized);
  },
});
```

**Result**:
```
ERROR: option '--log-format <format>' value 'xml' is invalid. Allowed choices are json, pretty.
```

**Pros**:
- ✅ Consistent with our `die()` and manual error messages
- ✅ Simple regex replacements
- ✅ No external dependencies

**Cons**:
- ❌ Fragile - breaks if Commander changes message format
- ❌ Regex pattern matching needed for each error type
- ❌ Maintenance overhead

### Option 2: Internationalization (i18n)

**Goal**: Support multiple languages for error messages

**Challenges**:
- ❌ Commander has no built-in i18n support
- ❌ Error messages are unstructured strings (no error codes)
- ❌ Would require pattern matching every Commander error type
- ❌ Fragile - breaks if Commander changes wording
- ❌ High maintenance overhead

**Example approach**:
```typescript
import i18n from 'i18next';

program.configureOutput({
  outputError: (str, write) => {
    const translated = translateCommanderError(str, i18n.language);
    write(translated);
  }
});

function translateCommanderError(str: string, locale: string): string {
  // Parse patterns and translate
  if (str.includes('is invalid. Allowed choices')) {
    const match = str.match(/argument '([^']+)' is invalid/);
    return i18n.t('errors.invalidChoice', { value: match[1] });
  }
  // ... many more patterns
}
```

**Recommendation**: NOT worth it unless there's a specific requirement
- CLI tools rarely need i18n
- Target audience (developers) typically comfortable with English
- Error messages reference code/config (mixing languages confusing)
- Maintenance cost very high

### Option 3: Do Nothing

**Goal**: Keep Commander's default error format

**Pros**:
- ✅ Zero maintenance
- ✅ Standard format developers recognize
- ✅ No risk of breakage

**Cons**:
- ❌ Inconsistent with our manual error messages (`ERROR:` vs `error:`)
- ❌ Different style from `die()` errors

## Recommendation

**Short term**: Do nothing (Option 3)
- Current error messages are clear and functional
- Inconsistency is minor (lowercase vs uppercase "error")
- Not worth maintenance overhead

**Future consideration**: If users request consistent styling, implement Option 1
- Only if there's actual feedback about inconsistency
- Keep regex replacements minimal and well-documented
- Test after Commander.js updates

## Related

- `lib/helpers.ts` - `die()` and `error()` functions use `ERROR:` format
- `lib/cli.ts` - Manual error messages use `ERROR:` format
- Commander.js docs: https://github.com/tj/commander.js/blob/master/examples/configure-output.js

## Notes

**Why CLI tools don't typically use i18n**:
1. Target audience is developers (English is lingua franca)
2. Error messages reference code identifiers, file paths, config keys
3. Mixing languages in technical output creates confusion
4. High maintenance cost for limited benefit
5. Translation quality matters - bad translations worse than English

**If i18n becomes a requirement**:
- Consider only translating user-facing messages (not developer/debug messages)
- Use error codes/keys instead of string matching
- Would require significant refactoring of error handling
- Estimate: 2-3 days for initial implementation + ongoing maintenance
