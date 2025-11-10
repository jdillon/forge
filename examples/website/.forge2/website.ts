/**
 * Website deployment commands
 *
 * Separate file for command implementations (like forge v1 pattern)
 */

import {
  $,
  Command,
  chalk,
  ora,
  boxen,
  Listr,
  createLogger,
  type ForgeCommand,
  type ForgeContext
} from '@forge/command';

// Configuration
const CONFIG = {
  s3Bucket: 'my-website-bucket',
  cloudfrontDistId: 'E1234567890ABC',
  buildDir: 'dist',
};

// Logger
const log = createLogger('website');

// ============================================================================
// Build Command
// ============================================================================

export const build: ForgeCommand = {
  description: 'Build website',

  defineCommand: (cmd) => {
    cmd
      .option('-c, --clean', 'Clean build directory first')
      .option('--no-optimize', 'Skip optimization');

  },

  execute: async (options, args, context) => {
    log.info({ options }, 'Starting build');

    const spinner = ora('Building website...').start();

    try {
      if (options.clean) {
        spinner.text = 'Cleaning build directory...';
        await $`rm -rf ${CONFIG.buildDir}`;
        log.debug('Cleaned build directory');
      }

      spinner.text = 'Creating build directory...';
      await $`mkdir -p ${CONFIG.buildDir}`;

      spinner.text = 'Building assets...';
      await Bun.sleep(500);

      // In real project: await $`npm run build`;
      await $`echo "<h1>Hello from Forge</h1>" > ${CONFIG.buildDir}/index.html`;

      if (options.optimize) {
        spinner.text = 'Optimizing...';
        await Bun.sleep(300);
        log.debug('Assets optimized');
      }

      spinner.succeed(chalk.green('Build complete!'));
      log.info({ buildDir: CONFIG.buildDir, optimized: options.optimize }, 'Build succeeded');

    } catch (error) {
      spinner.fail(chalk.red('Build failed'));
      log.error({ err: error }, 'Build failed');
      throw error;
    }
  }
};

// ============================================================================
// Sync Command
// ============================================================================

export const sync: ForgeCommand = {
  description: 'Sync website to S3',

  // Define Commander options
  defineCommand: (cmd) => {
    cmd
      .option('-d, --dry-run', 'Preview changes without uploading')
      .option('-b, --bucket <name>', 'S3 bucket name', CONFIG.s3Bucket)
      .option('--no-delete', 'Do not delete removed files');

  },

  // Execute with parsed options
  execute: async (options, args, context) => {
    const { dryRun, bucket, delete: shouldDelete } = options;

    log.info({ bucket, dryRun, delete: shouldDelete }, 'Starting sync');

    const spinner = ora(`Syncing to s3://${bucket}/...`).start();

    try {
      const syncArgs = [
        'aws', 's3', 'sync',
        CONFIG.buildDir + '/',
        `s3://${bucket}/`
      ];

      if (shouldDelete) syncArgs.push('--delete');
      if (dryRun) syncArgs.push('--dryrun');

      await $`${syncArgs}`;

      if (dryRun) {
        spinner.info(chalk.yellow('Dry run complete (no changes made)'));
      } else {
        spinner.succeed(chalk.green('Sync complete!'));
      }

      log.info({ bucket, filesUploaded: 42 }, 'Sync succeeded');

    } catch (error) {
      spinner.fail(chalk.red('Sync failed'));
      log.error({ err: error, bucket }, 'Sync failed');
      throw error;
    }
  }
};

// ============================================================================
// Invalidate Command
// ============================================================================

export const invalidate: ForgeCommand = {
  description: 'Invalidate CloudFront cache',

  defineCommand: (cmd) => {
    cmd
      .option('-p, --paths <paths>', 'Paths to invalidate', '/*')
      .option('-d, --distribution <id>', 'Distribution ID', CONFIG.cloudfrontDistId);

  },

  execute: async (options, args, context) => {
    const { paths, distribution } = options;

    log.info({ distribution, paths }, 'Starting invalidation');

    const spinner = ora(`Invalidating CloudFront distribution...`).start();

    try {
      const result = await $`aws cloudfront create-invalidation \
        --distribution-id ${distribution} \
        --paths ${paths}`.text();

      spinner.succeed(chalk.green('Invalidation created!'));

      try {
        const json = JSON.parse(result);
        if (json.Invalidation?.Id) {
          console.log(chalk.gray(`  Invalidation ID: ${json.Invalidation.Id}`));
          log.info({ invalidationId: json.Invalidation.Id }, 'Invalidation created');
        }
      } catch (e) {
        log.debug({ output: result }, 'Raw invalidation output');
      }

    } catch (error) {
      spinner.fail(chalk.red('Invalidation failed'));
      log.error({ err: error, distribution }, 'Invalidation failed');
      throw error;
    }
  }
};

// ============================================================================
// Publish Command (orchestrates other commands)
// ============================================================================

export const publish: ForgeCommand = {
  description: 'Full publish (build + sync + invalidate)',

  defineCommand: (cmd) => {
    cmd
      .option('-d, --dry-run', 'Preview without making changes')
      .option('-s, --skip-build', 'Skip build step')
      .option('-b, --bucket <name>', 'S3 bucket', CONFIG.s3Bucket);

  },

  execute: async (options, args, context) => {
    log.info({ options }, 'Starting publish');

    console.log(chalk.bold('\n🚀 Publishing Website\n'));

    // Use listr2 for beautiful multi-step task display
    const tasks = new Listr([
      {
        title: 'Building website',
        skip: () => options.skipBuild && 'Build skipped',
        task: async (ctx, task) => {
          await $`mkdir -p ${CONFIG.buildDir}`;
          await $`echo "<h1>Hello from Forge</h1>" > ${CONFIG.buildDir}/index.html`;
          await Bun.sleep(800);
          ctx.buildTime = 850;
        }
      },
      {
        title: 'Syncing to S3',
        task: async (ctx, task) => {
          const syncArgs = ['aws', 's3', 'sync', CONFIG.buildDir + '/', `s3://${options.bucket}/`];
          if (!options.dryRun) syncArgs.push('--delete');
          if (options.dryRun) syncArgs.push('--dryrun');

          task.output = `Uploading to s3://${options.bucket}/...`;
          await Bun.sleep(600);
          ctx.filesUploaded = 42;
        },
        options: { persistentOutput: false }
      },
      {
        title: 'Invalidating CloudFront',
        skip: () => options.dryRun && 'Skipped in dry-run mode',
        task: async (ctx, task) => {
          task.output = `Distribution: ${CONFIG.cloudfrontDistId}`;
          await Bun.sleep(400);
          ctx.invalidationId = 'I1234567890ABC';
        }
      }
    ], {
      concurrent: false,
      rendererOptions: {
        collapseSubtasks: false
      }
    });

    try {
      const ctx = await tasks.run();

      // Success summary box
      console.log('\n' + boxen(
        chalk.green.bold('✓ Website Published Successfully!') + '\n\n' +
        chalk.gray('Environment: ') + chalk.cyan('staging') + '\n' +
        chalk.gray('Bucket: ') + chalk.cyan(options.bucket) + '\n' +
        chalk.gray('Files: ') + chalk.yellow(ctx.filesUploaded || 0) + '\n' +
        (ctx.buildTime ? chalk.gray('Build time: ') + chalk.yellow(ctx.buildTime + 'ms') + '\n' : '') +
        (ctx.invalidationId ? chalk.gray('Invalidation: ') + chalk.yellow(ctx.invalidationId) : ''),
        {
          padding: 1,
          margin: 1,
          borderStyle: 'round',
          borderColor: 'green'
        }
      ));

      log.info({
        bucket: options.bucket,
        filesUploaded: ctx.filesUploaded,
        buildTime: ctx.buildTime,
        invalidationId: ctx.invalidationId
      }, 'Publish succeeded');

    } catch (error) {
      console.log('\n' + boxen(
        chalk.red.bold('✗ Publish Failed') + '\n\n' +
        chalk.gray(error.message),
        {
          padding: 1,
          margin: 1,
          borderStyle: 'round',
          borderColor: 'red'
        }
      ));

      log.error({ err: error }, 'Publish failed');
      throw error;
    }
  }
};

// ============================================================================
// Info Command
// ============================================================================

export const info: ForgeCommand = {
  description: 'Show configuration',
  execute: async () => {
    console.log(chalk.bold('\n📋 Configuration:\n'));
    console.log('  ' + chalk.gray('S3 Bucket:       ') + chalk.cyan(CONFIG.s3Bucket));
    console.log('  ' + chalk.gray('CloudFront Dist: ') + chalk.cyan(CONFIG.cloudfrontDistId));
    console.log('  ' + chalk.gray('Build Directory: ') + chalk.cyan(CONFIG.buildDir));
    console.log();

    log.debug({ config: CONFIG }, 'Configuration displayed');
  }
};
