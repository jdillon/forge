import { plugin } from "bun";

console.log('[PLUGIN] Loading resolution plugin');

plugin({
  name: "forge-resolution-test",
  setup(build) {
    // Try multiple filters to see which ones work

    // Filter 1: Catch all
    build.onResolve({ filter: /.*/ }, (args) => {
      console.log(`[PLUGIN Filter .*] path=${args.path} importer=${args.importer}`);
      return undefined;
    });

    // Filter 2: Specific to 'path' module
    build.onResolve({ filter: /^path$/ }, (args) => {
      console.log(`[PLUGIN Filter path] path=${args.path} importer=${args.importer}`);
      return undefined;
    });

    // Filter 3: Any scoped package
    build.onResolve({ filter: /^@/ }, (args) => {
      console.log(`[PLUGIN Filter @] path=${args.path} importer=${args.importer}`);
      return undefined;
    });
  },
});

console.log('[PLUGIN] Plugin registered');
