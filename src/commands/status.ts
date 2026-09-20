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
import type { WorkItem } from "../types.js";
import { renderStatus } from "../render/terminal.js";

export async function cmdStatus(
  cwd: string,
  opts: {
    json?: boolean;
    current?: string | null;
    completed?: string[];
    incomplete?: string[];
  } = {},
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

  if (opts.current !== undefined) {
    state.currentWork = opts.current || null;
  }
  if (opts.completed) {
    state.completed = mergeWorkItems(state.completed, opts.completed, "completed");
  }
  if (opts.incomplete) {
    state.incomplete = mergeWorkItems(state.incomplete, opts.incomplete, "incomplete");
  }

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

function mergeWorkItems(
  current: WorkItem[],
  nextTitles: string[],
  status: "completed" | "incomplete",
): WorkItem[] {
  const clean = nextTitles
    .map((title) => title.trim())
    .filter(Boolean);

  const seen = new Set<string>();
  const merged: WorkItem[] = [];

  for (const item of current) {
    const key = item.title.trim().toLowerCase();
    if (!seen.has(key) && item.status === status) {
      seen.add(key);
      merged.push(item);
    }
  }

  for (const title of clean) {
    const key = title.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    merged.push({
      id: `${status}-${title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`,
      title,
      status,
    });
  }

  return merged;
}
