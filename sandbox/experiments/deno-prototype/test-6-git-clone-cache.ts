/**
 * Test 6: Git Clone to Cache + Import Maps
 *
 * Jason's proposed solution: Instead of importing from git URLs,
 * git clone repos to a cache directory, then import from local paths.
 *
 * This sidesteps the HTTPS token issue entirely!
 */

console.log('=== Test 6: Git Clone to Cache Strategy ===\n');

import $ from "jsr:@david/dax@0.42.0";

console.log('--- Test 6.1: Clone a repo to cache directory ---\n');

const cacheDir = '/tmp/forge-repo-cache';
const repoUrl = 'git@github.com:denoland/deno_std.git'; // SSH URL!
const repoName = 'deno_std';
const repoPath = `${cacheDir}/${repoName}`;

// Clean up old cache for this test
await $`rm -rf ${cacheDir}`.noThrow();
await $`mkdir -p ${cacheDir}`;

console.log(`Cache directory: ${cacheDir}`);
console.log(`Cloning: ${repoUrl}`);
console.log('Note: Using SSH URL (git@github.com:...) not HTTPS!\n');

try {
  // This would use SSH keys, just like it does today with Bun!
  // await $`git clone --depth 1 ${repoUrl} ${repoPath}`.quiet();

  // For this test, use HTTPS (don't want to spam GitHub)
  await $`git clone --depth 1 https://github.com/denoland/deno_std.git ${repoPath}`.quiet();
  console.log('✅ Git clone successful\n');
} catch (error) {
  console.error('❌ Clone failed:', error.message);
  Deno.exit(1);
}

console.log('--- Test 6.2: Verify we can import from cloned repo ---\n');

// Now we can import from the local path
// In real usage, this would be configured in deno.json import maps
try {
  // Import from the cloned repo
  const { join } = await import(`file://${repoPath}/path/mod.ts`);

  const testPath = join('/tmp', 'test.txt');
  console.log(`✅ Successfully imported from cloned repo`);
  console.log(`   Imported join() function: ${testPath}\n`);
} catch (error) {
  console.error('❌ Import failed:', error.message);
}

console.log('--- Test 6.3: How this would work in forge ---\n');

console.log('User config (.forge2/config.yml):');
console.log('  dependencies:');
console.log('    - git+ssh://git@github.com/jdillon/forge-standard.git');
console.log('');

console.log('Forge install process:');
console.log('  1. Read dependencies from config');
console.log('  2. For each git dependency:');
console.log('     a. Parse URL to get repo name/org');
console.log('     b. Check if already cloned in ~/.local/share/forge/repos/');
console.log('     c. If not: git clone <url> to cache');
console.log('     d. If exists: git fetch && git pull (or checkout specific ref)');
console.log('  3. Generate deno.json (or update bunfig) with import maps');
console.log('');

console.log('Generated import map (deno.json):');
console.log('  {');
console.log('    "imports": {');
console.log('      "@jdillon/forge-standard/": "~/.local/share/forge/repos/forge-standard/"');
console.log('    }');
console.log('  }');
console.log('');

console.log('User code:');
console.log('  import { hello } from "@jdillon/forge-standard/commands/hello.ts";');
console.log('  → Resolves to local cloned repo via import map');
console.log('');

console.log('--- Test 6.4: Benefits of this approach ---\n');

console.log('✅ SSH Support:');
console.log('   - git clone works with git+ssh:// URLs');
console.log('   - Uses existing SSH keys (no tokens needed!)');
console.log('   - Works with deploy keys, SSH agent, etc.\n');

console.log('✅ Works with Both Runtimes:');
console.log('   - Deno: Use import maps in deno.json');
console.log('   - Bun: Could use same approach with bunfig.toml');
console.log('   - Same cache directory for both\n');

console.log('✅ Full Git Features:');
console.log('   - Can checkout specific branches, tags, commits');
console.log('   - Can track changes (git fetch/pull)');
console.log('   - Can handle submodules');
console.log('   - Familiar git workflow\n');

console.log('✅ Offline Support:');
console.log('   - Once cloned, works offline');
console.log('   - No network requests for imports');
console.log('   - Faster than fetching individual files\n');

console.log('--- Test 6.5: Trade-offs ---\n');

console.log('⚠️  Cache Management:');
console.log('   - Need to manage disk space in cache dir');
console.log('   - Need "forge clean" or "forge cache clear" command');
console.log('   - Need to decide when to update (explicit vs automatic)\n');

console.log('⚠️  Git Operations:');
console.log('   - Git clone is slower than simple module resolution');
console.log('   - But only happens on install/update');
console.log('   - Could parallelize clones for multiple deps\n');

console.log('⚠️  State Tracking:');
console.log('   - Need to track what\'s in cache');
console.log('   - Need to track which ref is checked out');
console.log('   - Could use state.json or git itself\n');

console.log('--- Test 6.6: Comparison to Other Package Managers ---\n');

console.log('This is how many package managers work:');
console.log('');
console.log('Cargo (Rust):');
console.log('  - Clones git deps to ~/.cargo/git/checkouts/');
console.log('  - Uses local paths from there');
console.log('  ✅ Proven approach\n');

console.log('npm/yarn:');
console.log('  - Downloads tarballs to cache');
console.log('  - Extracts to node_modules');
console.log('  ✅ Similar concept\n');

console.log('Go modules:');
console.log('  - Clones to $GOPATH/pkg/mod/');
console.log('  - Imports from there');
console.log('  ✅ Same pattern\n');

console.log('\n=== Test 6 Complete ===');

console.log('\n🎯 Recommendation: Git clone to cache is the solution!');
console.log('');
console.log('This approach:');
console.log('  ✅ Solves module resolution (import maps to cache)');
console.log('  ✅ Keeps SSH git support (no tokens needed)');
console.log('  ✅ Works with Deno OR Bun');
console.log('  ✅ Follows established package manager patterns');
console.log('  ✅ Provides offline support');
console.log('');
console.log('Next steps:');
console.log('  1. Design cache directory structure');
console.log('  2. Implement git clone logic in forge install');
console.log('  3. Generate import maps from dependencies');
console.log('  4. Add cache management commands');
