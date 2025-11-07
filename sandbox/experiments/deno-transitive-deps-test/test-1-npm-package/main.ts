// Test: Can we use express without listing its ~30 transitive dependencies?
// Express depends on: body-parser, cookie, debug, etag, fresh, merge-descriptors,
// methods, parseurl, path-to-regexp, proxy-addr, qs, range-parser, safe-buffer,
// send, serve-static, setprototypeof, statuses, type-is, utils-merge, vary

import express from "express";

const app = express();
const port = 3000;

app.get("/", (_req, res) => {
  res.send("Hello from Express!");
});

console.log("✅ Express imported successfully");
console.log("✅ Express app created");
console.log(`Express version: ${express.version || 'unknown'}`);
console.log("\nIf you're seeing this, transitive dependencies worked!");
console.log("Express has ~30 dependencies that were NOT listed in deno.json");

// Don't actually start the server, just verify it works
console.log("\n✅ Test 1 PASSED: npm transitive dependencies work");
