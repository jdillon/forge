# License-Check-And-Add Pattern Matching

## Extension Patterns

Match files by extension (no prefix):
```json
"ts|js|jsx": { ... }
```
Matches: `*.ts`, `*.js`, `*.jsx`

---

## Specific Filenames (No Extension)

Use `^` prefix to match exact filename:
```json
"^Dockerfile|^Makefile": { ... }
```
Matches: files named exactly `Dockerfile` or `Makefile`

---

## Combined Patterns

Mix extensions and filenames:
```json
"sh|^forge|^forge-dev": { ... }
```
Matches:
- `*.sh` (any file with .sh extension)
- Files named exactly `forge`
- Files named exactly `forge-dev`

---

## Our Configuration

```json
{
  "licenseFormats": {
    "ts|js": {
      "prepend": "/*",
      "append": " */",
      "eachLine": {
        "prepend": " * "
      }
    },
    "sh|^forge|^forge-dev": {
      "eachLine": {
        "prepend": "# "
      }
    }
  }
}
```

**Why we need `^forge` and `^forge-dev`:**
- `bin/forge` and `bin/forge-dev` have no file extension
- They are bash scripts (need `#` comments)
- Using `^` prefix matches them by exact filename
- Combined with `sh` pattern to also match `*.sh` files

---

## Source

From license-check-and-add documentation:
> "To include a file which contains no extension, use a ^ at the start of the filename."

Example from docs:
```json
"sh|^Dockerfile": {
  "eachLine": {
    "prepend": "# "
  }
}
```
