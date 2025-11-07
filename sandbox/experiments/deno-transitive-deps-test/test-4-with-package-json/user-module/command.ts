// Test: Does package.json help with local file imports?
// forge-with-pkg has a package.json declaring commander and yaml as dependencies
// User's deno.json does NOT list commander or yaml

import { createForgeCommand, parseYaml, forgeVersion } from "@forge/with-pkg";

console.log("User module starting...");
console.log(`Forge version: ${forgeVersion}`);

// Use forge's command functionality (which uses commander internally)
const program = createForgeCommand();
console.log("✅ Created forge command (uses commander internally)");

// Use forge's yaml functionality (which uses yaml internally)
const config = parseYaml("test: value\nfoo: bar");
console.log("✅ Parsed YAML (uses yaml internally):", config);

console.log("\n✅ Test 4 PASSED: package.json enabled transitive dependencies!");
console.log("User's deno.json only listed @forge/with-pkg");
console.log("Did NOT need to list: commander, yaml");
console.log("Deno used forge's package.json to resolve transitives");
