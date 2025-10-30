# CLI Libraries Reference

**Philosophy**: "It's for me mostly, so I like awesome"

Since we're using Bun anyway, let's make this CLI **absolutely delightful** to use.

---

## Installed Libraries

### Core UI/UX
- **[chalk](chalk.md)** - Terminal colors and styling
- **[ora](ora.md)** - Elegant terminal spinners
- **[listr2](listr2.md)** - Multi-step task lists with progress
- **[boxen](boxen.md)** - Beautiful boxes around text
- **[cli-table3](cli-table3.md)** - Terminal tables
- **[enquirer](enquirer.md)** - Interactive prompts

### Framework & Utilities
- **[commander](commander.md)** - CLI framework and arg parsing
- **[pino](pino.md)** - Structured logging (JSON + pretty)
- **[update-notifier](update-notifier.md)** - Update notifications
- **[omelette](omelette.md)** - Shell completion (bash/zsh/fish)
- **[cosmiconfig](cosmiconfig.md)** - Configuration file loader
- **[zod](zod.md)** - TypeScript schema validation

### Optional
- **[figlet](figlet.md)** - ASCII art text
- **[cli-progress](cli-progress.md)** - Progress bars

---

## Quick Examples

### Colored Output
```typescript
import chalk from 'chalk';
console.log(chalk.green('✓ Success!'));
```

### Spinner
```typescript
import ora from 'ora';
const spinner = ora('Deploying...').start();
await deploy();
spinner.succeed('Deployed!');
```

### Task List
```typescript
import { Listr } from 'listr2';
const tasks = new Listr([
  { title: 'Build', task: async () => await build() },
  { title: 'Deploy', task: async () => await deploy() }
]);
await tasks.run();
```

### Success Box
```typescript
import boxen from 'boxen';
console.log(boxen('Deploy Successful!', {
  padding: 1,
  borderColor: 'green'
}));
```

---

## Security Notes

All libraries are:
- ✅ Actively maintained
- ✅ Millions of downloads per week
- ✅ Trusted maintainers
- ✅ Minimal dependencies

**Before updating**: Always run `bun pm audit` and check package reputation.
