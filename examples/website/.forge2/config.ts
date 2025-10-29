/**
 * Forge v2 Example: Website Deployment
 *
 * Demonstrates website sync, CloudFront invalidation, and full publish workflow
 */

import type { ForgeConfig } from '@forge/core';
import { $ } from 'bun';

// Configuration
const CONFIG = {
  s3Bucket: 'my-website-bucket',
  cloudfrontDistId: 'E1234567890ABC',
  buildDir: 'dist',
};

export default {
  defaultCommand: 'help',

  commands: {
    // ========================================================================
    // Help
    // ========================================================================

    help: {
      description: 'Show available commands',
      execute: async () => {
        console.log('Website Deployment Commands:\n');
        console.log('  sync        Sync dist/ to S3');
        console.log('  invalidate  Invalidate CloudFront cache');
        console.log('  publish     Full publish (sync + invalidate)');
        console.log('  build       Build website (placeholder)');
        console.log('\nUsage: forge2 <command> [options]');
      }
    },

    // ========================================================================
    // Build (placeholder for demo)
    // ========================================================================

    build: {
      description: 'Build website',
      usage: 'build',
      execute: async () => {
        console.log('Building website...');
        // In real project: await $`npm run build`;
        await $`mkdir -p ${CONFIG.buildDir}`;
        await $`echo "<h1>Hello from Forge v2</h1>" > ${CONFIG.buildDir}/index.html`;
        console.log('✓ Build complete');
      }
    },

    // ========================================================================
    // Website Sync
    // ========================================================================

    sync: {
      description: 'Sync website to S3',
      usage: 'sync [--dry-run]',
      execute: async (args) => {
        const dryRun = args.includes('--dry-run');
        const bucket = CONFIG.s3Bucket;
        const buildDir = CONFIG.buildDir;

        console.log(`Syncing ${buildDir}/ to s3://${bucket}/...`);

        if (dryRun) {
          console.log('(dry-run mode)');
          await $`aws s3 sync ${buildDir}/ s3://${bucket}/ --dryrun --delete`;
        } else {
          await $`aws s3 sync ${buildDir}/ s3://${bucket}/ --delete`;
        }

        console.log('✓ Sync complete');
      }
    },

    // ========================================================================
    // CloudFront Invalidation
    // ========================================================================

    invalidate: {
      description: 'Invalidate CloudFront cache',
      usage: 'invalidate [--paths <paths>]',
      execute: async (args) => {
        const distId = CONFIG.cloudfrontDistId;

        // Parse --paths flag
        const pathsIdx = args.indexOf('--paths');
        const paths = pathsIdx !== -1 && args[pathsIdx + 1]
          ? args[pathsIdx + 1]
          : '/*';

        console.log(`Invalidating CloudFront distribution ${distId}...`);
        console.log(`Paths: ${paths}`);

        const result = await $`aws cloudfront create-invalidation \
          --distribution-id ${distId} \
          --paths ${paths}`.text();

        console.log('✓ Invalidation created');

        // Parse and show invalidation ID
        try {
          const json = JSON.parse(result);
          if (json.Invalidation?.Id) {
            console.log(`Invalidation ID: ${json.Invalidation.Id}`);
          }
        } catch (e) {
          // JSON parse failed, just show raw output
          console.log(result);
        }
      }
    },

    // ========================================================================
    // Full Publish (sync + invalidate)
    // ========================================================================

    publish: {
      description: 'Full publish (sync + invalidate)',
      usage: 'publish [--dry-run]',
      execute: async (args) => {
        console.log('Publishing website...\n');

        // Build first
        console.log('[1/3] Building...');
        const buildCmd = config.commands.build;
        await buildCmd.execute([]);

        // Sync
        console.log('\n[2/3] Syncing to S3...');
        const syncCmd = config.commands.sync;
        await syncCmd.execute(args);

        // Invalidate (skip if dry-run)
        if (!args.includes('--dry-run')) {
          console.log('\n[3/3] Invalidating CloudFront...');
          const invalidateCmd = config.commands.invalidate;
          await invalidateCmd.execute([]);
        } else {
          console.log('\n[3/3] Skipping invalidation (dry-run)');
        }

        console.log('\n✓ Website published successfully!');
      }
    },

    // ========================================================================
    // Info
    // ========================================================================

    info: {
      description: 'Show configuration',
      execute: async () => {
        console.log('Configuration:');
        console.log(`  S3 Bucket:         ${CONFIG.s3Bucket}`);
        console.log(`  CloudFront Dist:   ${CONFIG.cloudfrontDistId}`);
        console.log(`  Build Directory:   ${CONFIG.buildDir}`);
      }
    },
  }
} satisfies ForgeConfig;

// Export for command reuse
const config = {
  commands: {
    build: {} as any,
    sync: {} as any,
    invalidate: {} as any,
  }
};
