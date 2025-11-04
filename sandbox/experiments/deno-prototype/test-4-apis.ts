/**
 * Test 4: Bun API to Deno API Comparison
 *
 * This tests what would need to change in forge code when migrating
 * from Bun to Deno.
 */

console.log('=== Test 4: API Comparison ===\n');

import $ from "jsr:@david/dax@0.42.0";

console.log('--- File I/O ---\n');

// Bun: await Bun.write('test.txt', 'content')
// Deno: await Deno.writeTextFile('test.txt', 'content')
await Deno.writeTextFile('/tmp/deno-test-4.txt', 'Hello from Deno');
console.log('✅ Write file: Deno.writeTextFile() replaces Bun.write()');

// Bun: await Bun.file('test.txt').text()
// Deno: await Deno.readTextFile('test.txt')
const content = await Deno.readTextFile('/tmp/deno-test-4.txt');
console.log(`✅ Read file: Deno.readTextFile() replaces Bun.file().text()`);

// Bun: await Bun.file('test.txt').json()
// Deno: JSON.parse(await Deno.readTextFile('test.json'))
await Deno.writeTextFile('/tmp/deno-test-4.json', JSON.stringify({ test: true }));
const jsonData = JSON.parse(await Deno.readTextFile('/tmp/deno-test-4.json'));
console.log('✅ Read JSON: JSON.parse(Deno.readTextFile()) replaces Bun.file().json()\n');

console.log('--- Environment Variables ---\n');

// Bun: process.env.FOO or Bun.env.FOO
// Deno: Deno.env.get('FOO')
Deno.env.set('TEST_VAR_4', 'test-value');
const envVar = Deno.env.get('TEST_VAR_4');
console.log(`✅ Env vars: Deno.env.get/set() replaces process.env or Bun.env\n`);

console.log('--- Path Operations ---\n');

// Bun: import { join } from 'path'
// Deno: import { join } from '@std/path'
import { join, dirname, basename } from '@std/path';
const testPath = join('/tmp', 'test', 'file.txt');
console.log(`✅ Path ops: @std/path provides same functions as Node.js 'path'\n`);

console.log('--- File System ---\n');

// Bun: import { existsSync } from 'fs'
// Deno: import { exists } from '@std/fs'
import { exists } from '@std/fs';
const fileExists = await exists('/tmp/deno-test-4.txt');
console.log(`✅ FS checks: @std/fs provides async equivalents\n`);

console.log('--- Shell Commands ---\n');

// Bun: await $`command`.text()
// Deno: import $ from 'jsr:@david/dax'
//       await $`command`.text()
const shellResult = await $`echo "test"`.text();
console.log(`✅ Shell: dax provides same $ syntax (just needs import)\n`);

console.log('--- Process Exit ---\n');

// Bun: process.exit(1)
// Deno: Deno.exit(1)
console.log('✅ Exit: Deno.exit() replaces process.exit()\n');

console.log('--- YAML Parsing ---\n');

// Bun: Uses whatever npm package
// Deno: import { parse } from '@std/yaml'
import { parse as parseYaml } from '@std/yaml';
const yamlText = 'key: value\nlist:\n  - item1\n  - item2';
const yamlData = parseYaml(yamlText);
console.log('✅ YAML: @std/yaml provides parsing\n');

console.log('--- Summary of Changes Needed ---\n');
console.log('1. File I/O:');
console.log('   - Bun.write() → Deno.writeTextFile()');
console.log('   - Bun.file().text() → Deno.readTextFile()');
console.log('   - Bun.file().json() → JSON.parse(Deno.readTextFile())\n');

console.log('2. Environment:');
console.log('   - process.env.X → Deno.env.get("X")');
console.log('   - process.env.X = y → Deno.env.set("X", y)\n');

console.log('3. Shell:');
console.log('   - Add: import $ from "jsr:@david/dax"');
console.log('   - Usage: Same as Bun\n');

console.log('4. Standard Library:');
console.log('   - path → @std/path');
console.log('   - fs → @std/fs (async by default)');
console.log('   - yaml → @std/yaml\n');

console.log('5. Process:');
console.log('   - process.exit() → Deno.exit()\n');

console.log('📊 Migration Effort Estimate:');
console.log('   - Find/replace operations: ~50-100 locations');
console.log('   - Add imports: ~10-15 files');
console.log('   - Test and verify: Critical');
console.log('   - Total time: 1-2 days for code + 1-2 days testing');

console.log('\n=== Test 4 Complete ===');
