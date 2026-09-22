import path from "node:path";
import { isInitialized, loadState, saveState, appendEvent } from "../core/storage.js";
import { takeProjectSounding } from "../core/sounding.js";
import { renderSounding } from "../render/terminal.js";
import type { WorkItem } from "../types.js";

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
    const msg = "Fathom is not initialized. Run `fathom init` first.";
    if (opts.json) {
      console.error(JSON.stringify({ error: msg }));
    } else {
      console.error(msg);
    }
    return 1;
  }

  // If manual updates are provided, store them in state
  if (opts.current !== undefined || opts.completed !== undefined || opts.incomplete !== undefined) {
    let state = await loadState(root);
    if (opts.current !== undefined) {
      state.currentWork = opts.current || null;
    }
    if (opts.completed !== undefined) {
      state.completed = mergeWorkItems(state.completed, opts.completed, "completed");
    }
    if (opts.incomplete !== undefined) {
      state.incomplete = mergeWorkItems(state.incomplete, opts.incomplete, "incomplete");
    }
    await saveState(root, state);
  }

  const sounding = await takeProjectSounding(root);

  await appendEvent(root, {
    type: "status",
    at: new Date().toISOString(),
    findingCount: sounding.needsAttention.length,
    filesChanged: sounding.projectDrift.filesChangedCount,
  });

  if (opts.json) {
    console.log(JSON.stringify(sounding, null, 2));
  } else {
    process.stdout.write(renderSounding(sounding));
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

