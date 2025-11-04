import { plugin, type BunPlugin } from "bun";

console.log('[TRANSPILER] Loading transpiler plugin');

// Try using the transpiler plugin API instead of runtime
const transpilerPlugin: BunPlugin = {
  name: "forge-transpiler-test",
  setup(build) {
    console.log('[TRANSPILER] Setup called');

    // Try onLoad hook (runs during file loading/transpilation)
    build.onLoad({ filter: /.*\.ts$/ }, async (args) => {
      console.log(`[TRANSPILER onLoad] Loading: ${args.path}`);

      // Read the file and return it unchanged
      const contents = await Bun.file(args.path).text();
      return {
        contents,
        loader: "ts",
      };
    });

    // Also try onResolve - try to redirect scoped packages
    build.onResolve({ filter: /@planet57\/forge/ }, (args) => {
      console.log(`[TRANSPILER onResolve @planet57] Resolving: ${args.path} from ${args.importer}`);

      // Try to redirect to helper.ts as a test
      const redirectPath = '/Users/jason/ws/jdillon/forge/tmp/experiments/test-plugin/helper.ts';
      console.log(`[TRANSPILER onResolve @planet57] Redirecting to: ${redirectPath}`);

      return {
        path: redirectPath,
        namespace: 'file',
      };
    });

    // Catch-all for other resolves
    build.onResolve({ filter: /.*/ }, (args) => {
      console.log(`[TRANSPILER onResolve catch-all] Resolving: ${args.path} from ${args.importer}`);
      return undefined;
    });
  },
};

plugin(transpilerPlugin);

console.log('[TRANSPILER] Plugin registered');
