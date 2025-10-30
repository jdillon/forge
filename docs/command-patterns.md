# Command Patterns - Quick Reference

The best way to learn: see working examples that are tested and stay current.

---

## Working Examples

**[examples/website/.forge2/](../examples/website/.forge2/)** - Full working project

Files:
- `website.ts` - Real commands with options, spinners, task lists
- `examples.ts` - Various pattern examples
- `simple.ts` - Minimal examples with module metadata

These are actual tested code that stays in sync with the implementation.

---

## Basic Structure

```typescript
export const myCommand: ForgeCommand = {
  description: 'Command description',

  defineCommand: (cmd) => {
    cmd
      .argument('<arg>', 'Argument description')
      .option('--flag', 'Flag description');
  },

  execute: async (options, args, context) => {
    // options.flag - parsed options
    // args[0] - positional arguments
    // context.forge, context.config, context.state
  }
};
```

---

## Common Patterns

### Simple Command
```typescript
export const version = {
  description: 'Show version',
  execute: async () => console.log('v2.0.0')
};
```

### With Options
```typescript
export const deploy: ForgeCommand = {
  description: 'Deploy to environment',

  defineCommand: (cmd) => {
    cmd
      .argument('<env>', 'Environment name')
      .option('-s, --skip-tests', 'Skip tests');
  },

  execute: async (options, args) => {
    const env = args[0];
    if (!options.skipTests) await runTests();
    await deploy(env);
  }
};
```

### With Spinner
```typescript
import ora from 'ora';

export const build: ForgeCommand = {
  description: 'Build project',

  execute: async () => {
    const spinner = ora('Building...').start();
    try {
      await doBuild();
      spinner.succeed('Built!');
    } catch (err) {
      spinner.fail('Failed');
      throw err;
    }
  }
};
```

See [examples/website/.forge2/website.ts](../examples/website/.forge2/website.ts) for complete real-world examples.

---

## Module Configuration

```yaml
# .forge2/config.yml
modules:
  - ./website
  - ./examples
```

Commands are auto-discovered from module exports. See [features/auto-discovery.md](features/auto-discovery.md).

---

## Learn More

### How Features Work
- **[Auto-Discovery](features/auto-discovery.md)** - How commands are discovered from exports
- **[Commander Integration](features/commander-integration.md)** - How options/arguments work
- **[Module Metadata](features/module-metadata.md)** - Customize groups with `__module__`
- **[Subcommand Groups](features/subcommand-groups.md)** - Organize commands

### Using Libraries
- **[chalk](libraries/chalk.md)** - Terminal colors
- **[ora](libraries/ora.md)** - Spinners
- **[listr2](libraries/listr2.md)** - Multi-step tasks
- **[boxen](libraries/boxen.md)** - Success boxes
- **[More...](libraries/README.md)** - Full library reference

### Examples
- **[examples/website/](../examples/website/)** - Complete working project (tested!)
