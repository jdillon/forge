/**
 * Test 3: Git HTTPS + Token Workflow
 *
 * This tests the key limitation discovered in research:
 * Deno does NOT support git+ssh://, only HTTPS with tokens.
 *
 * We need to verify:
 * 1. How to set up tokens for private repos
 * 2. What the DX feels like compared to SSH keys
 * 3. Whether this is manageable for typical forge usage
 */

console.log('=== Test 3: Git HTTPS + Token Workflow ===\n');

import $ from "jsr:@david/dax@0.42.0";

console.log('--- SSH vs HTTPS Comparison ---\n');

console.log('Current (Bun + SSH):');
console.log('  1. User has SSH keys configured once');
console.log('  2. git+ssh://git@github.com/user/repo.git just works');
console.log('  3. Zero additional configuration per repo\n');

console.log('Required (Deno + HTTPS):');
console.log('  1. User needs GitHub personal access token (PAT)');
console.log('  2. URLs change to https://github.com/user/repo.git');
console.log('  3. Token in URL OR DENO_AUTH_TOKENS env var\n');

console.log('--- Token Management Options ---\n');

console.log('Option A: Token in URL (NOT RECOMMENDED)');
console.log('  https://USERNAME:TOKEN@github.com/user/repo.git');
console.log('  ❌ Token visible in URLs, logs, configs');
console.log('  ❌ Security risk if config files are shared\n');

console.log('Option B: DENO_AUTH_TOKENS environment variable (RECOMMENDED)');
console.log('  export DENO_AUTH_TOKENS=github.com=TOKEN');
console.log('  https://github.com/user/repo.git');
console.log('  ✅ Token not in URLs');
console.log('  ✅ Can be in ~/.bashrc or ~/.zshrc');
console.log('  ⚠️  Still a credential to manage\n');

console.log('--- Testing Git Clone (Public Repo) ---');
try {
  // Test with a public repo first (no token needed)
  const testDir = '/tmp/deno-git-test';
  await $`rm -rf ${testDir}`.noThrow();
  await $`git clone --depth 1 https://github.com/denoland/deno.git ${testDir}`.quiet();
  console.log('✅ Public repo clone works\n');
  await $`rm -rf ${testDir}`;
} catch (error) {
  console.error('❌ Git clone failed:', error.message);
}

console.log('--- Private Repo Workflow (Simulated) ---\n');
console.log('For private repos, user would need to:');
console.log('  1. Create GitHub PAT at https://github.com/settings/tokens');
console.log('  2. Grant "repo" scope for private repos');
console.log('  3. Set DENO_AUTH_TOKENS=github.com=ghp_XXX...');
console.log('  4. Use https:// URLs instead of git+ssh://\n');

console.log('--- Assesment ---\n');
console.log('✅ Technically viable - Git works fine with HTTPS');
console.log('⚠️  Extra setup burden:');
console.log('   - Generate and manage PAT (doesn\'t expire like SSH keys can)');
console.log('   - Convert all git+ssh:// URLs to https://');
console.log('   - Set environment variable');
console.log('\n❓ Key question: How often do forge users need private git repos?');
console.log('   - Frequently → SSH keys are much better DX');
console.log('   - Rarely/Never → HTTPS tokens are acceptable');

console.log('\n=== Test 3 Complete ===');
