import path from "node:path";
import { isInitialized, loadConfig, fathomPaths } from "../core/storage.js";
import type { FathomConfig } from "../types.js";
import { readFile, writeFile } from "node:fs/promises";

export async function cmdConfig(cwd: string, args: string[]): Promise<number> {
  const root = path.resolve(cwd);
  const isJson = args.includes("--json");
  const filteredArgs = args.filter((a) => a !== "--json");

  if (!(await isInitialized(root))) {
    if (isJson) {
      console.error(JSON.stringify({ error: "Fathom is not initialized. Run `fathom init` first." }));
    } else {
      console.error("Fathom is not initialized. Run `fathom init` first.");
    }
    return 1;
  }
  if (filteredArgs[0] === "show") {
    console.log(JSON.stringify(await loadConfig(root), null, 2));
    return 0;
  }
  if (filteredArgs[0] !== "set" || !filteredArgs[1] || filteredArgs[2] === undefined) {
    if (isJson) {
      console.error(JSON.stringify({ error: "Usage: fathom config show | fathom config set <key> <value>" }));
    } else {
      console.error("Usage: fathom config show | fathom config set <key> <value>");
    }
    return 1;
  }

  const key = filteredArgs[1];
  const rawValue = filteredArgs.slice(2).join(" ");
  const parsedValue = parseValue(rawValue);

  const config = await loadConfig(root);
  setConfigValue(config, key, parsedValue);
  await writeFile(fathomPaths(root).config, JSON.stringify(config, null, 2) + "\n", "utf8");

  if (isJson) {
    console.log(JSON.stringify({ success: true, key, value: parsedValue }, null, 2));
  } else {
    console.log(`Updated ${key}.`);
  }
  return 0;
}

function setConfigValue(config: FathomConfig, key: string, value: unknown): void {
  const parts = key.split(".").filter(Boolean);
  if (parts[0] !== "ai" || parts.length < 2) {
    throw new Error("Only ai.* configuration keys can be changed");
  }
  if (parts[1] === "profile" || parts[1] === "enabled" || parts[1] === "includePaths" || parts[1] === "maxFileBytes") {
    (config.ai ??= {})[parts[1]] = value as never;
    return;
  }
  if (parts[1] !== "profiles" || !parts[2] || !parts[3]) {
    throw new Error("Use ai.profile, ai.enabled, or ai.profiles.<name>.<field>");
  }
  const profiles = (config.ai ??= {}).profiles ??= {};
  const profile = profiles[parts[2]] ??= { provider: "openai", model: "gpt-4o-mini" };
  if (!["provider", "model", "baseUrl", "apiKeyEnv", "includePaths", "maxFileBytes"].includes(parts[3])) {
    throw new Error(`Unknown AI profile field: ${parts[3]}`);
  }
  (profile as Record<string, unknown>)[parts[3]] = value;
}

function parseValue(value: string): unknown {
  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
}
