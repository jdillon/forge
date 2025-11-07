// Simulated forge package that uses commander and yaml
import { Command } from "commander";
import * as YAML from "yaml";

export function createForgeCommand() {
  const program = new Command();
  program
    .name("forge-mock")
    .description("Mock forge command")
    .version("1.0.0");

  return program;
}

export function parseYaml(content: string) {
  return YAML.parse(content);
}

export const forgeVersion = "1.0.0";

console.log("✅ Forge mock loaded (uses commander and yaml internally)");
