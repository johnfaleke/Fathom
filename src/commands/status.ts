import path from "node:path";
import { builtinChecks } from "../checks/index.js";
import { gitChangedFiles } from "../core/git.js";
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
import { renderStatus } from "../render/terminal.js";

export async function cmdStatus(
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
  const changed = await gitChangedFiles(root);

  let state = await loadState(root);
  state = applyFindings(state, findings);
  state.changes = {
    filesChanged: changed.length,
    summary: changed.slice(0, 20).map((f) => `~ ${f}`),
  };
  await saveState(root, state);
  await appendEvent(root, {
    type: "status",
    at: new Date().toISOString(),
    findingCount: findings.length,
    filesChanged: changed.length,
  });

  if (opts.json) {
    console.log(JSON.stringify(state, null, 2));
  } else {
    process.stdout.write(renderStatus(state));
  }

  return 0;
}
