# License-Check-And-Add Format Examples

The `license-check-and-add` tool supports multiple comment formats through the `licenseFormats` configuration.

## Format Object Structure

```json
{
  "licenseFormats": {
    "file-pattern": {
      "prepend": "text before entire license",
      "append": "text after entire license",
      "eachLine": {
        "prepend": "text before each line",
        "append": "text after each line"
      }
    }
  }
}
```

## Example 1: Line Comments (Current - TypeScript/JS)

```json
{
  "ts|js": {
    "eachLine": {
      "prepend": "// "
    }
  }
}
```

**Result:**
```typescript
// Copyright 2025 Jason Dillon
//
// Licensed under the Apache License, Version 2.0 (the "License");
// ...
```

---

## Example 2: Block Comments (Alternative for TypeScript/JS)

```json
{
  "ts|js": {
    "prepend": "/**",
    "append": " */",
    "eachLine": {
      "prepend": " * "
    }
  }
}
```

**Result:**
```typescript
/**
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
```

---

## Example 3: Simple Block Comment (C-style)

```json
{
  "ts|js|c|cpp|java": {
    "prepend": "/*",
    "append": "*/"
  }
}
```

**Result:**
```typescript
/*
Copyright 2025 Jason Dillon

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

     http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
*/
```

---

## Example 4: HTML Comments

```json
{
  "html|xml|svg": {
    "prepend": "<!--",
    "append": "-->"
  }
}
```

**Result:**
```html
<!--
Copyright 2025 Jason Dillon

Licensed under the Apache License, Version 2.0 (the "License");
...
-->
```

---

## Example 5: Multiple Formats in One Config

```json
{
  "licenseFormats": {
    "ts|js": {
      "prepend": "/**",
      "append": " */",
      "eachLine": {
        "prepend": " * "
      }
    },
    "sh|bash": {
      "eachLine": {
        "prepend": "# "
      }
    },
    "html|xml": {
      "prepend": "<!--",
      "append": "-->"
    },
    "css|scss": {
      "prepend": "/*",
      "append": "*/"
    }
  }
}
```

---

## Comparison: Line vs Block Comments

| Style | Pros | Cons |
|-------|------|------|
| **Line comments** (`// ...`) | Clean, consistent line-by-line | Takes more vertical space |
| **Block comments** (`/* ... */`) | More compact, traditional | Can interfere with JSDoc |

---

## Current Project Setup

We're using **line comments** (`//`) for TypeScript/JavaScript because:
- ✅ Doesn't interfere with JSDoc comments
- ✅ Consistent with existing code style
- ✅ Easy to read and modify
- ✅ Works well with editors

---

## To Switch to Block Comments

If you prefer block comments, update `license-checker.config.json`:

```json
{
  "licenseFormats": {
    "ts|js": {
      "prepend": "/**",
      "append": " */",
      "eachLine": {
        "prepend": " * "
      }
    },
    "sh": {
      "eachLine": {
        "prepend": "# "
      }
    }
  }
}
```

Then re-run:
```bash
bun run license:remove  # Remove old headers
bun run license:add     # Add new block-style headers
```
