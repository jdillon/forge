# boxen

**Beautiful boxes around text**

- npm: https://www.npmjs.com/package/boxen
- GitHub: https://github.com/sindresorhus/boxen
- Downloads: 14.4M+ weekly
- Maintainer: Sindre Sorhus (trusted)

---

## Installation

```bash
bun add boxen
```

**Current version in forge2**: `^7.1.1`

---

## Basic Usage

```typescript
import boxen from 'boxen';

console.log(boxen('Hello World!'));
```

**Output:**
```
┌─────────────┐
│Hello World! │
└─────────────┘
```

---

## Styling

```typescript
console.log(boxen('Success!', {
  padding: 1,
  margin: 1,
  borderStyle: 'round',
  borderColor: 'green'
}));
```

**Output:**
```
   ╭───────────╮
   │           │
   │  Success! │
   │           │
   ╰───────────╯
```

---

## Border Styles

```typescript
// round (default)
boxen('text', { borderStyle: 'round' });
// ╭─────╮
// │ text│
// ╰─────╯

// single
boxen('text', { borderStyle: 'single' });
// ┌─────┐
// │ text│
// └─────┘

// double
boxen('text', { borderStyle: 'double' });
// ╔═════╗
// ║ text║
// ╚═════╝

// classic
boxen('text', { borderStyle: 'classic' });
// +-----+
// | text|
// +-----+
```

---

## Colors

```typescript
import chalk from 'chalk';

// Border color
boxen('Info', { borderColor: 'blue' });

// Background
boxen('Warning', { backgroundColor: 'yellow' });

// Colored text inside
boxen(chalk.green.bold('✓ Success!'), {
  borderColor: 'green',
  padding: 1
});
```

---

## Padding and Margin

```typescript
boxen('Text', {
  padding: 1,      // Inside box
  margin: 1        // Outside box
});

// Or specific sides
boxen('Text', {
  padding: {
    top: 1,
    bottom: 1,
    left: 2,
    right: 2
  }
});
```

---

## Alignment

```typescript
boxen('Centered', {
  textAlignment: 'center',
  width: 30
});

boxen('Right', {
  textAlignment: 'right',
  width: 30
});
```

---

## Fixed Width

```typescript
boxen('Long text that will wrap if needed', {
  width: 20,
  padding: 1
});
```

---

## Common Patterns in Forge

### Success Summary
```typescript
console.log(boxen(
  chalk.green.bold('✓ Deploy Successful!') + '\n\n' +
  chalk.gray('Environment: ') + chalk.cyan(env) + '\n' +
  chalk.gray('Files: ') + chalk.yellow(fileCount) + '\n' +
  chalk.gray('Duration: ') + chalk.yellow(duration),
  {
    padding: 1,
    margin: 1,
    borderStyle: 'round',
    borderColor: 'green'
  }
));
```

### Error Display
```typescript
console.log(boxen(
  chalk.red.bold('✗ Deploy Failed') + '\n\n' +
  chalk.gray(error.message),
  {
    padding: 1,
    borderStyle: 'round',
    borderColor: 'red'
  }
));
```

### Warning
```typescript
console.log(boxen(
  chalk.yellow.bold('⚠ Warning') + '\n\n' +
  'Cache is disabled',
  {
    padding: 1,
    borderColor: 'yellow'
  }
));
```

### Update Notification
```typescript
console.log(boxen(
  'Update available: ' + chalk.gray('2.0.0') + ' → ' + chalk.green('2.1.0') + '\n' +
  'Run ' + chalk.cyan('forge2 update') + ' to update',
  {
    padding: 1,
    margin: 1,
    borderStyle: 'round',
    borderColor: 'yellow'
  }
));
```

---

## Title

```typescript
boxen('Content', {
  title: 'Deploy Summary',
  titleAlignment: 'center'
});
```

---

## ESM Only

**Note**: boxen v7+ is ESM-only. Requires `"type": "module"` in package.json.

---

## References

- Documentation: https://github.com/sindresorhus/boxen#readme
