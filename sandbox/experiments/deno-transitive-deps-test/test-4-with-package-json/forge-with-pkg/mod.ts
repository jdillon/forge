// Forge package with package.json declaring dependencies
// Does Deno use package.json for transitive dependency resolution?
import { Command } from "commander";
import * as YAML from "yaml";

export function createForgeCommand() {
  const program = new Command();
  program
    .name("forge-with-pkg")
    .description("Forge with package.json")
    .version("1.0.0");

  return program;
}

export function parseYaml(content: string) {
  return YAML.parse(content);
}

export const forgeVersion = "1.0.0";

console.log("✅ Forge-with-pkg loaded (uses commander and yaml internally)");
