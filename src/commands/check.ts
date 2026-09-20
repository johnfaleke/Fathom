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
import { renderFindings } from "../render/terminal.js";

export async function cmdCheck(
  cwd: string,
  opts: { json?: boolean } = {},
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

  if (opts.json) {
    console.log(JSON.stringify({ findings, attention: state.attention }, null, 2));
  } else {
    process.stdout.write(renderFindings(findings));
  }

  return findings.some((f) => f.severity === "warning") ? 2 : 0;
}
