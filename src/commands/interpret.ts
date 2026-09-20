import path from "node:path";
import { OpenAIProvider } from "../ai/openai.js";
import { collectSafeAIContext } from "../ai/context.js";
import { createProjectContext } from "../core/project.js";
import { appendEvent, isInitialized, loadConfig, loadState } from "../core/storage.js";
import { renderInterpretation } from "../render/terminal.js";

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
  if (opts.provider && opts.provider !== "openai") {
    console.error(`Unsupported provider: ${opts.provider}. v0.2 supports openai.`);
    return 1;
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    console.error("OPENAI_API_KEY is required for the OpenAI provider.");
    return 1;
  }

  const config = await loadConfig(root);
  const state = await loadState(root);
  const projectContext = await createProjectContext(root, config);
  const context = await collectSafeAIContext(projectContext, {
    includePaths: config.ai?.includePaths,
    maxFileBytes: config.ai?.maxFileBytes,
  });
  const provider = new OpenAIProvider({
    apiKey,
    model: process.env.FATHOM_AI_MODEL ?? "gpt-4o-mini",
    baseUrl: process.env.FATHOM_AI_BASE_URL,
  });
  const result = await provider.interpret({
    projectRoot: root,
    workState: state,
    prompt: opts.prompt ?? "Summarize likely follow-up work and risks.",
    consent: true,
    evidence: state.findings.flatMap((finding) => finding.evidence),
    context,
  });

  await appendEvent(root, {
    type: "interpret",
    at: new Date().toISOString(),
    provider: result.provider,
    filesIncluded: Object.keys(context.files).length,
    filesExcluded: context.excluded.length,
  });

  if (opts.json) {
    console.log(JSON.stringify({ ...result, context: { filesIncluded: Object.keys(context.files), excluded: context.excluded } }, null, 2));
  } else {
    process.stdout.write(renderInterpretation(result, context));
  }
  return 0;
}
