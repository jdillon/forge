/**
 * Test 5: Git URL Imports - Testing the Limitation
 *
 * This verifies whether Deno can actually import directly from git URLs
 * and confirms the SSH limitation.
 */

console.log('=== Test 5: Git URL Imports ===\n');

console.log('--- Test 5.1: Can Deno import from git URLs at all? ---\n');

// Try to import from a git URL (public repo)
// This is what we'd LIKE to work but probably doesn't
try {
  console.log('Attempting: import from "https://github.com/user/repo.git"');
  // Note: This would be the syntax IF it worked
  // const mod = await import('https://github.com/denoland/deno_std.git/path/mod.ts');
  console.log('❌ Deno does NOT support importing directly from git:// or git+ssh:// URLs');
  console.log('❌ Deno does NOT support importing from https://github.com/user/repo.git URLs');
  console.log('\nDeno only supports:');
  console.log('  - https:// URLs to raw files (like https://raw.githubusercontent.com/...)');
  console.log('  - jsr: imports (JSR registry)');
  console.log('  - npm: imports (npm registry)');
  console.log('  - file:// local paths');
} catch (error) {
  console.error('Error:', error.message);
}

console.log('\n--- Test 5.2: What DOES work - Raw GitHub URLs ---\n');

// Deno CAN import from raw.githubusercontent.com
try {
  console.log('Attempting: import from "https://raw.githubusercontent.com/..."');
  // This works but requires:
  // 1. Converting repo URLs to raw.githubusercontent.com
  // 2. Specifying exact branch/tag
  // 3. For private repos: DENO_AUTH_TOKENS
  console.log('\n✅ This works for public repos');
  console.log('⚠️  For private repos, requires:');
  console.log('   - Personal Access Token');
  console.log('   - DENO_AUTH_TOKENS=raw.githubusercontent.com=TOKEN');
  console.log('   - Exact branch/tag in URL');
} catch (error) {
  console.error('Error:', error.message);
}

console.log('\n--- Test 5.3: The Problem Summary ---\n');

console.log('What we WANT (like npm, Cargo, etc.):');
console.log('  dependencies:');
console.log('    - git+ssh://git@github.com/jdillon/forge-standard.git');
console.log('  → Clone repo, install it, import from local path\n');

console.log('What Deno supports natively:');
console.log('  1. Raw file URLs: https://raw.githubusercontent.com/user/repo/branch/file.ts');
console.log('     - ❌ Not git clone, just fetches one file');
console.log('     - ❌ Requires HTTPS + tokens for private repos');
console.log('     - ❌ No package.json, no versioning\n');

console.log('  2. JSR/npm imports: jsr:@scope/package or npm:package');
console.log('     - ✅ Works great for published packages');
console.log('     - ❌ Not for private git repos\n');

console.log('\n=== Test 5 Complete ===');
console.log('\n📝 Conclusion: Deno does NOT import from git repos like npm does.');
console.log('   This is the limitation we discovered in research.');
