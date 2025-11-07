// Test: Can user module import forge without listing forge's dependencies?
// This simulates a user's forge module importing from forge
// User's deno.json does NOT list commander or yaml

import { createForgeCommand, parseYaml, forgeVersion } from "@forge/mock";

console.log("User module starting...");
console.log(`Forge version: ${forgeVersion}`);

// Use forge's command functionality (which uses commander internally)
const program = createForgeCommand();
console.log("✅ Created forge command (uses commander internally)");

// Use forge's yaml functionality (which uses yaml internally)
const config = parseYaml("test: value\nfoo: bar");
console.log("✅ Parsed YAML (uses yaml internally):", config);

console.log("\n✅ Test 3 PASSED: User module works without listing forge's dependencies!");
console.log("User's deno.json only listed @forge/mock");
console.log("Did NOT need to list: commander, yaml");
console.log("Transitive dependencies resolved automatically through forge");
