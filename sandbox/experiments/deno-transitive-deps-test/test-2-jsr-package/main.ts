// Test: Can we use oak without listing its transitive dependencies?
// Oak depends on several @std packages and other utilities

import { Application } from "oak";

const app = new Application();

app.use((ctx) => {
  ctx.response.body = "Hello from Oak!";
});

console.log("✅ Oak imported successfully");
console.log("✅ Oak Application created");
console.log("\nIf you're seeing this, transitive dependencies worked!");
console.log("Oak has multiple dependencies that were NOT listed in deno.json");

// Don't actually start the server, just verify it works
console.log("\n✅ Test 2 PASSED: JSR transitive dependencies work");
