import path from "node:path";
import { builtinChecks } from "../checks/index.js";
import { createProjectContext } from "../core/project.js";
import { runChecks } from "../core/runner.js";
import {
  appendEvent,
  applyFindings,
  isInitialized,
  loadConfig,
  loadState,
  saveState,
} from "../core/storage.js";
import { renderFindings, renderInterpretation } from "../render/terminal.js";
import { interpretProject } from "./interpret.js";

export async function cmdCheck(
  cwd: string,
  opts: { json?: boolean; ai?: boolean; prompt?: string } = {},
): Promise<number> {
  const root = path.resolve(cwd);

  if (!(await isInitialized(root))) {
    console.error("Fathom is not initialized. Run `fathom init` first.");
    return 1;
  }

  const config = await loadConfig(root);
  const ctx = await createProjectContext(root, config);
  const findings = await runChecks(ctx, builtinChecks);

  let state = await loadState(root);
  state = applyFindings(state, findings);
  await saveState(root, state);
  await appendEvent(root, {
    type: "check",
    at: new Date().toISOString(),
    findingCount: findings.length,
  });

  let interpretation;
  if (opts.ai) {
    if (config.ai?.enabled !== true) {
      console.error("AI interpretation is not configured for this workspace.");
      console.error("Run `fathom setup` first, then review the profile before using `fathom check --ai`.");
      return 1;
    }
    try {
      interpretation = await interpretProject(root, config, opts.prompt);
    } catch (error) {
      console.error(error instanceof Error ? error.message : String(error));
      return 1;
    }
  }

  if (opts.json) {
    console.log(JSON.stringify({ findings, attention: state.attention, interpretation: interpretation ? { ...interpretation.result, context: { filesIncluded: Object.keys(interpretation.context.files), excluded: interpretation.context.excluded } } : undefined }, null, 2));
  } else {
    process.stdout.write(renderFindings(findings));
    if (interpretation) process.stdout.write(renderInterpretation(interpretation.result, interpretation.context));
  }

  return findings.some((f) => f.severity === "warning") ? 2 : 0;
}
