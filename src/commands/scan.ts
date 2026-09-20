import path from "node:path";
import { buildProjectModel } from "../core/model.js";
import { createProjectContext } from "../core/project.js";
import { appendEvent, isInitialized, loadConfig, saveProjectModel } from "../core/storage.js";
import type { ProjectModel } from "../types.js";

export async function cmdScan(cwd: string, opts: { json?: boolean } = {}): Promise<number> {
  const root = path.resolve(cwd);
  if (!(await isInitialized(root))) {
    console.error("Fathom is not initialized. Run `fathom init` first.");
    return 1;
  }

  const config = await loadConfig(root);
  const context = await createProjectContext(root, config);
  const model = await buildProjectModel(context);
  await saveProjectModel(root, model);
  await appendEvent(root, {
    type: "scan",
    at: new Date().toISOString(),
    files: model.project.files,
    claims: model.claims.length,
  });

  if (opts.json) {
    console.log(JSON.stringify(model, null, 2));
  } else {
    process.stdout.write(renderScan(model));
  }
  return 0;
}

function renderScan(model: ProjectModel): string {
  const lines = [
    "FATHOM SCAN",
    "",
    `Project: ${model.project.name ?? "(unnamed)"}`,
    `Files: ${model.project.files}`,
    `Stack: ${model.project.stack.length ? model.project.stack.join(", ") : "(not detected)"}`,
    `Dependencies: ${model.project.dependencies.length}`,
    "",
    "Claims:",
  ];
  for (const claim of model.claims) {
    lines.push(`  ${claim.subject} ${claim.predicate} ${claim.object} (${Math.round(claim.confidence * 100)}% confidence)`);
  }
  lines.push("", "Saved to .fathom/model.json");
  return lines.join("\n") + "\n";
}
