import path from "node:path";
import { createInterface } from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";
import { initFathom, isInitialized, loadConfig, fathomPaths } from "../core/storage.js";
import type { FathomConfig } from "../types.js";
import { writeFile } from "node:fs/promises";

export interface SetupOptions {
  profile?: string;
  provider?: "openai" | "custom";
  model?: string;
  baseUrl?: string;
  apiKeyEnv?: string;
  nonInteractive?: boolean;
}

export async function cmdSetup(cwd: string, options: SetupOptions = {}): Promise<number> {
  const root = path.resolve(cwd);
  if (!(await isInitialized(root))) {
    await initFathom(root);
    console.log("Initialized Fathom for this workspace.");
  }

  const rl = options.nonInteractive ? null : createInterface({ input, output });
  try {
    const profile = options.profile ?? (await ask(rl, "Profile name", "default"));
    const provider = options.provider ?? (await askChoice(rl, "Provider", ["openai", "custom"], "openai")) as "openai" | "custom";
    const model = options.model ?? (await ask(rl, "Model", provider === "openai" ? "gpt-4o-mini" : "local-model"));
    const defaultBaseUrl = provider === "openai" ? "https://api.openai.com/v1" : "http://localhost:9000/v1";
    const baseUrl = options.baseUrl ?? (await ask(rl, "OpenAI-compatible base URL", defaultBaseUrl));
    const apiKeyEnv = options.apiKeyEnv ?? (await ask(rl, "Environment variable name for the API key", provider === "openai" ? "OPENAI_API_KEY" : "LOCAL_AI_KEY"));

    const config = await loadConfig(root);
    config.ai ??= {};
    config.ai.enabled = true;
    config.ai.profile = profile;
    config.ai.profiles ??= {};
    config.ai.profiles[profile] = { provider, model, baseUrl, apiKeyEnv };
    await writeFile(fathomPaths(root).config, JSON.stringify(config, null, 2) + "\n", "utf8");

    console.log(`\nFathom AI is ready with the '${profile}' profile.`);
    console.log(`Set your key:  $env:${apiKeyEnv} = "your-key"`);
    console.log("Run next:     fathom check --ai");
    return 0;
  } finally {
    rl?.close();
  }
}

async function ask(rl: ReturnType<typeof createInterface> | null, label: string, fallback: string): Promise<string> {
  if (!rl) return fallback;
  const answer = (await rl.question(`${label} [${fallback}]: `)).trim();
  return answer || fallback;
}

async function askChoice(rl: ReturnType<typeof createInterface> | null, label: string, choices: string[], fallback: string): Promise<string> {
  if (!rl) return fallback;
  const answer = await ask(rl, `${label} (${choices.join("/")})`, fallback);
  return choices.includes(answer) ? answer : fallback;
}
