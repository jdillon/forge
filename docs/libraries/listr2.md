# listr2

**Multi-step task lists with progress**

- npm: https://www.npmjs.com/package/listr2
- GitHub: https://github.com/listr2/listr2
- Downloads: 24M+ weekly
- TypeScript-first

---

## Installation

```bash
bun add listr2
```

**Current version in forge2**: `^8.0.0`

---

## Basic Usage

```typescript
import { Listr } from 'listr2';

const tasks = new Listr([
  {
    title: 'Building website',
    task: async () => {
      await $`npm run build`;
    }
  },
  {
    title: 'Deploying',
    task: async () => {
      await $`aws s3 sync dist/ s3://bucket/`;
    }
  }
]);

await tasks.run();
```

**Output:**
```
✔ Building website
✔ Deploying
```

---

## Task Context

Share data between tasks:

```typescript
const tasks = new Listr([
  {
    title: 'Build',
    task: async (ctx) => {
      const start = Date.now();
      await build();
      ctx.buildTime = Date.now() - start;
    }
  },
  {
    title: 'Report',
    task: (ctx) => {
      console.log(`Build took ${ctx.buildTime}ms`);
    }
  }
]);

const ctx = await tasks.run();
console.log('Context:', ctx);
```

---

## Task Output

Update task output during execution:

```typescript
{
  title: 'Uploading files',
  task: async (ctx, task) => {
    task.output = 'Preparing upload...';
    await prepare();

    task.output = 'Uploading...';
    await upload();

    task.output = 'Finalizing...';
    await finalize();
  }
}
```

---

## Skip Tasks

```typescript
{
  title: 'Running tests',
  skip: (ctx) => ctx.skipTests && 'Tests skipped',
  task: async () => {
    await $`npm test`;
  }
}

// Or:
{
  title: 'Upload',
  enabled: (ctx) => !ctx.dryRun,
  task: async () => await upload()
}
```

---

## Subtasks

```typescript
{
  title: 'Deploy',
  task: (ctx, task) => {
    return task.newListr([
      {
        title: 'Build',
        task: async () => await build()
      },
      {
        title: 'Upload',
        task: async () => await upload()
      }
    ]);
  }
}
```

---

## Error Handling

```typescript
const tasks = new Listr([
  {
    title: 'Task 1',
    task: async () => {
      throw new Error('Failed!');
    }
  },
  {
    title: 'Task 2',
    task: async () => {
      // Won't run if Task 1 fails
    }
  }
], {
  exitOnError: false  // Continue on errors
});

try {
  await tasks.run();
} catch (error) {
  console.error('Tasks failed:', error);
}
```

---

## Concurrent Tasks

```typescript
const tasks = new Listr([
  { title: 'Task 1', task: async () => await work1() },
  { title: 'Task 2', task: async () => await work2() },
  { title: 'Task 3', task: async () => await work3() }
], {
  concurrent: true,
  rendererOptions: {
    collapse: false
  }
});
```

---

## Common Pattern in Forge

```typescript
import { Listr } from 'listr2';
import chalk from 'chalk';

export const publish: ForgeCommand = {
  description: 'Publish website',

  execute: async (options, args, context) => {
    const tasks = new Listr([
      {
        title: 'Building website',
        task: async (ctx) => {
          const start = Date.now();
          await $`npm run build`;
          ctx.buildTime = Date.now() - start;
        }
      },
      {
        title: 'Syncing to S3',
        task: async (ctx, task) => {
          task.output = 'Uploading files...';
          const result = await $`aws s3 sync dist/ s3://bucket/ --quiet`;
          ctx.fileCount = 42;  // Parse from result
        }
      },
      {
        title: 'Invalidating CloudFront',
        skip: (ctx) => options.skipInvalidate && 'Skipped',
        task: async () => {
          await $`aws cloudfront create-invalidation ...`;
        }
      }
    ]);

    const ctx = await tasks.run();

    // Success summary
    console.log(boxen(
      chalk.green.bold('✓ Published!') + '\n\n' +
      chalk.gray('Files: ') + chalk.yellow(ctx.fileCount) + '\n' +
      chalk.gray('Build: ') + chalk.yellow(`${ctx.buildTime}ms`),
      { padding: 1, borderColor: 'green' }
    ));
  }
};
```

---

## Renderer Options

```typescript
const tasks = new Listr([...], {
  concurrent: false,
  rendererOptions: {
    collapse: false,         // Don't collapse completed tasks
    collapseErrors: false,   // Show error details
    showSubtasks: true,
    clearOutput: false
  }
});
```

---

## Silent Mode

```typescript
const tasks = new Listr([...], {
  renderer: process.env.CI ? 'silent' : 'default'
});
```

---

## References

- Documentation: https://listr2.kilic.dev/
- Examples: https://github.com/listr2/listr2/tree/master/examples
