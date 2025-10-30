# chalk

**Terminal colors and styling**

- npm: https://www.npmjs.com/package/chalk
- GitHub: https://github.com/chalk/chalk
- Downloads: 320M+ weekly
- Maintainer: Sindre Sorhus (trusted)

---

## Installation

```bash
bun add chalk
```

**Current version in forge2**: `^5.3.0`

---

## Basic Usage

```typescript
import chalk from 'chalk';

// Simple colors
console.log(chalk.blue('Hello world'));
console.log(chalk.green('Success!'));
console.log(chalk.yellow('Warning!'));
console.log(chalk.red('Error!'));
console.log(chalk.gray('Hint: try --help'));

// Styling
console.log(chalk.bold('Bold text'));
console.log(chalk.italic('Italic text'));
console.log(chalk.underline('Underlined'));
console.log(chalk.dim('Dimmed'));
```

---

## Chaining Styles

```typescript
// Combine multiple styles
console.log(chalk.blue.bold('Bold blue text'));
console.log(chalk.red.underline('Underlined red'));
console.log(chalk.green.bold.inverse('Inverted bold green'));

// Background colors
console.log(chalk.bgRed.white('White text on red background'));
console.log(chalk.bgGreen.black('Black text on green'));
```

---

## Template Literals

```typescript
// Clean syntax for mixed colors
console.log(chalk`
  Status: {green.bold Success}
  Files: {cyan 42}
  Duration: {yellow 1.2s}
`);
```

---

## RGB/Hex Colors

```typescript
// RGB
console.log(chalk.rgb(123, 45, 67)('Custom RGB color'));

// Hex
console.log(chalk.hex('#DEADED')('Custom hex color'));
```

---

## Common Patterns in Forge

### Success Messages
```typescript
console.log(chalk.green('✓') + ' Deploy successful');
spinner.succeed(chalk.green('Build complete!'));
```

### Error Messages
```typescript
console.log(chalk.red('✗') + ' Deploy failed');
console.error(chalk.red('ERROR:') + ' ' + message);
```

### Warnings
```typescript
console.log(chalk.yellow('⚠') + ' Warning: Cache disabled');
```

### Info/Hints
```typescript
console.log(chalk.cyan('Building website...'));
console.log(chalk.gray('Hint: use --dry-run to preview'));
```

### Values/Highlights
```typescript
console.log(`Deploying to ${chalk.cyan(environment)}`);
console.log(`Uploaded ${chalk.yellow(fileCount)} files`);
```

---

## Environment Detection

Chalk automatically detects terminal capabilities:
- Supports 16 colors, 256 colors, or truecolor based on terminal
- Respects `NO_COLOR` environment variable
- Detects CI environments and disables colors appropriately

---

## Disable Colors

```typescript
// Programmatically
import chalk from 'chalk';
const noColor = new chalk.Instance({ level: 0 });

// Or via environment
process.env.NO_COLOR = '1';
```

---

## ESM Only

**Note**: chalk v5+ is ESM-only. Requires `"type": "module"` in package.json.

---

## Performance

Chalk is highly optimized:
- No dependencies
- Lazy evaluation
- Minimal overhead

---

## References

- Documentation: https://github.com/chalk/chalk#readme
- Color reference: https://github.com/chalk/chalk#colors
