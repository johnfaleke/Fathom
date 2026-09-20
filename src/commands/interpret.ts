import path from "node:path";
import { OpenAIProvider } from "../ai/openai.js";
import { collectSafeAIContext } from "../ai/context.js";
import type { AIInterpretationResult } from "../ai/provider.js";
import type { FathomConfig } from "../types.js";
import { createProjectContext } from "../core/project.js";
import { appendEvent, isInitialized, loadConfig, loadState } from "../core/storage.js";
import { renderInterpretation } from "../render/terminal.js";

export interface InterpretationRun {
  result: AIInterpretationResult;
  context: Awaited<ReturnType<typeof collectSafeAIContext>>;
}

export async function interpretProject(
  root: string,
  config: FathomConfig,
  prompt = "Summarize likely follow-up work and risks.",
): Promise<InterpretationRun> {
  const state = await loadState(root);
  const profileName = config.ai?.profile ?? "default";
  const profile = config.ai?.profiles?.[profileName] ?? {
    provider: "openai" as const,
    model: process.env.FATHOM_AI_MODEL ?? "gpt-4o-mini",
    baseUrl: process.env.FATHOM_AI_BASE_URL,
    apiKeyEnv: "OPENAI_API_KEY",
    includePaths: config.ai?.includePaths,
    maxFileBytes: config.ai?.maxFileBytes,
  };
  const apiKeyName = profile.apiKeyEnv ?? "OPENAI_API_KEY";
  const apiKey = process.env[apiKeyName];
  if (!apiKey) throw new Error(`${apiKeyName} is required for the ${profileName} AI profile.`);
  const projectContext = await createProjectContext(root, config);
  const context = await collectSafeAIContext(projectContext, {
    includePaths: profile.includePaths ?? config.ai?.includePaths,
    maxFileBytes: profile.maxFileBytes ?? config.ai?.maxFileBytes,
  });
  const provider = new OpenAIProvider({ apiKey, model: profile.model, baseUrl: profile.baseUrl });
  const result = await provider.interpret({
    projectRoot: root,
    workState: state,
    prompt,
    consent: true,
    evidence: state.findings.flatMap((finding) => finding.evidence),
    context,
  });
  await appendEvent(root, {
    type: "interpret",
    at: new Date().toISOString(),
    provider: result.provider,
    profile: profileName,
    filesIncluded: Object.keys(context.files).length,
    filesExcluded: context.excluded.length,
  });
  return { result, context };
}

export async function cmdInterpret(
  cwd: string,
  opts: { json?: boolean; provider?: string; prompt?: string; consent?: boolean } = {},
): Promise<number> {
  const root = path.resolve(cwd);

  if (!(await isInitialized(root))) {
    console.error("Fathom is not initialized. Run `fathom init` first.");
    return 1;
  }
  if (opts.consent !== true) {
    console.error("Interpretation sends filtered project context to a provider.");
    console.error("Repeat with `--consent` after reviewing the provider and ignore rules.");
    return 1;
  }
  if (opts.provider && opts.provider !== "openai" && opts.provider !== "custom") {
    console.error(`Unsupported provider: ${opts.provider}. v0.2 supports openai and custom.`);
    return 1;
  }
  try {
    const config = await loadConfig(root);
    const run = await interpretProject(root, config, opts.prompt);
    if (opts.json) {
      console.log(JSON.stringify({ ...run.result, context: { filesIncluded: Object.keys(run.context.files), excluded: run.context.excluded } }, null, 2));
    } else {
      process.stdout.write(renderInterpretation(run.result, run.context));
    }
    return 0;
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    return 1;
  }
}
