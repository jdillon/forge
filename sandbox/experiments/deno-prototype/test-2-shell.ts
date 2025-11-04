/**
 * Test 2: Shell Scripting with dax
 *
 * This tests if dax is a viable replacement for Bun's built-in $ syntax.
 * We need shell scripting for:
 * - Running git commands
 * - Executing user commands
 * - File operations
 */

console.log('=== Test 2: Shell Scripting with dax ===\n');

// Import dax - this is the one extra import needed vs Bun
// Using JSR (JavaScript Registry) - the modern Deno package registry
import $ from "jsr:@david/dax@0.42.0";

console.log('--- Test 2.1: Basic Command Execution ---');
const result = await $`echo "Hello from dax"`.text();
console.log(`Output: ${result}`);
console.log('✅ Basic command works\n');

console.log('--- Test 2.2: Command Chaining ---');
const files = await $`ls -la`.lines();
console.log(`Found ${files.length} lines of output`);
console.log('✅ Command chaining works\n');

console.log('--- Test 2.3: Environment Variables ---');
const envResult = await $`echo $TEST_VAR`.env({ TEST_VAR: 'test-value' }).text();
console.log(`Env var output: ${envResult}`);
console.log('✅ Environment variables work\n');

console.log('--- Test 2.4: Working Directory ---');
const cwd = await $`pwd`.text();
console.log(`Current directory: ${cwd}`);
console.log('✅ Working directory access works\n');

console.log('--- Test 2.5: Error Handling ---');
try {
  await $`false`; // Command that exits with error
  console.error('❌ FAIL: Should have thrown error');
  Deno.exit(1);
} catch (error) {
  console.log('✅ Error handling works - caught failed command\n');
}

console.log('--- Test 2.6: Conditional Execution ---');
const gitInstalled = await $`which git`.noThrow().text();
if (gitInstalled) {
  console.log('✅ Conditional execution works - git found\n');
} else {
  console.log('⚠️  Git not found (that\'s okay for this test)\n');
}

console.log('--- Developer Experience Comparison ---');
console.log('Bun:  const output = await $`echo hello`.text()');
console.log('Deno: import $ from "https://dax.land/mod.ts"');
console.log('      const output = await $`echo hello`.text()');
console.log('\nDifference: ONE import line at the top of the file');
console.log('Usage: IDENTICAL after import');

console.log('\n=== Test 2 Complete ===');
console.log('\n📝 Assessment: dax provides the same DX as Bun\'s $');
console.log('   Trade-off: One import line vs built-in');
console.log('   Benefit: More explicit, works anywhere');
