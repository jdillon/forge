# License Header Management

This document describes how to manage Apache 2.0 license headers in the Forge project.

## Option 1: addlicense via Homebrew (Recommended)

Google's `addlicense` tool is available via Homebrew - **no Go installation required!**

### Installation

```bash
# Install via Homebrew
brew install addlicense
```

### Verify Installation
```bash
addlicense --help
```

### Usage

**Add headers to all files:**
```bash
addlicense -c "Jason Dillon" -l apache .
```

**Check mode (CI/pre-commit):**
```bash
addlicense -c "Jason Dillon" -l apache -check .
```

**Add headers with SPDX identifier:**
```bash
addlicense -c "Jason Dillon" -l apache -s .
```

**Verbose mode:**
```bash
addlicense -c "Jason Dillon" -l apache -v .
```

### What it does

- Scans all source files recursively
- Adds Apache 2.0 license header to files without one
- Skips files that already have a header
- Supports TypeScript, JavaScript, Markdown, YAML, Shell, and many more

### Generated Header

For TypeScript/JavaScript files:
```typescript
// Copyright 2025 Jason Dillon
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//      http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
```

For Shell scripts:
```bash
# Copyright 2025 Jason Dillon
#
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
#
#      http://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.
```

## Files to Exclude

The tool automatically respects `.gitignore`, so excluded files won't get headers.

Additional exclusions can be added with `-ignore` flag:
```bash
addlicense -c "Jason Dillon" -l apache -ignore "**/*.md" .
```

## Integration Options

### Option 1: Manual (Current)
Run `addlicense` manually when adding new files.

### Option 2: Pre-commit Hook
Add to `.git/hooks/pre-commit`:
```bash
#!/bin/bash
if ! addlicense -c "Jason Dillon" -l apache -check .; then
    echo "Error: Missing license headers. Run: addlicense -c 'Jason Dillon' -l apache ."
    exit 1
fi
```

### Option 3: GitHub Action (Future)
Add CI check in GitHub Actions workflow.

### Option 4: Package Script
Add to `package.json`:
```json
{
  "scripts": {
    "license:check": "addlicense -c 'Jason Dillon' -l apache -check .",
    "license:add": "addlicense -c 'Jason Dillon' -l apache ."
  }
}
```

## Current Status

- ✅ LICENSE file created (Apache 2.0)
- ✅ package.json has `"license": "Apache-2.0"`
- ⏳ Source files need headers added
- ⏳ CI check not yet implemented

---

## Option 2: license-check-and-add (npm native)

If you prefer an npm-based solution that integrates directly with Bun/npm workflows.

### Installation

```bash
bun add -d license-check-and-add
```

### Configuration

Create `license-checker.config.json`:

```json
{
  "src": [
    "lib/**/*.ts",
    "bin/**/*",
    "tests/**/*.ts"
  ],
  "path": "license-header.txt",
  "ignore": [
    "node_modules",
    "build",
    "tmp"
  ],
  "license": "license-header.txt",
  "licenseFormats": {
    "ts|js": {
      "prepend": "//",
      "eachLine": {
        "prepend": "// "
      }
    },
    "sh": {
      "prepend": "#",
      "eachLine": {
        "prepend": "# "
      }
    }
  },
  "trailingWhitespace": "TRIM"
}
```

Create `license-header.txt`:
```
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
```

### Usage

```bash
# Check for missing headers
bunx license-check-and-add check

# Add missing headers
bunx license-check-and-add add

# Remove headers (for cleanup)
bunx license-check-and-add remove
```

### Add to package.json

```json
{
  "scripts": {
    "license:check": "license-check-and-add check",
    "license:add": "license-check-and-add add"
  }
}
```

---

## Comparison

| Feature | addlicense (Homebrew) | license-check-and-add (npm) |
|---------|----------------------|----------------------------|
| **Installation** | `brew install addlicense` | `bun add -d license-check-and-add` |
| **Dependencies** | None (Homebrew binary) | npm package |
| **Configuration** | CLI flags only | JSON config file |
| **Auto-discovery** | ✅ Yes (respects .gitignore) | Manual file patterns |
| **Simplicity** | ✅ One-liner | Requires config file |
| **npm Scripts** | ❌ External tool | ✅ Native npm integration |
| **Speed** | ✅ Fast (Go binary) | Slower (Node.js) |

**Recommendation:** Use **Homebrew addlicense** for simplicity and speed. Use **license-check-and-add** if you want everything in package.json.

---

## Next Steps

### Using Homebrew addlicense (Recommended)

1. Install: `brew install addlicense`
2. Add headers: `addlicense -c "Jason Dillon" -l apache .`
3. Verify: `addlicense -c "Jason Dillon" -l apache -check .`
4. Optional: Add to package.json scripts wrapper

### Using npm license-check-and-add

1. Install: `bun add -d license-check-and-add`
2. Create config: `license-checker.config.json`
3. Create header: `license-header.txt`
4. Add headers: `bun run license:add`
5. Add check to CI: `bun run license:check`
