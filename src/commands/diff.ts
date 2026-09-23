import path from "node:path";
import { gitChangedFiles, gitDiffStat, gitIsRepo } from "../core/git.js";
import { appendEvent, isInitialized } from "../core/storage.js";
import { renderDiff } from "../render/terminal.js";

export async function cmdDiff(
  cwd: string,
  opts: { json?: boolean } = {},
): Promise<number> {
  const root = path.resolve(cwd);


  if (!(await gitIsRepo(root))) {
    console.error("Not a git repository — semantic diff needs git for v0.1.");
    return 1;
  }

  const files = await gitChangedFiles(root);
  const summary = await gitDiffStat(root);

  await appendEvent(root, {
    type: "diff",
    at: new Date().toISOString(),
    filesChanged: files.length,
  });

  if (opts.json) {
    console.log(JSON.stringify({ files, summary }, null, 2));
  } else {
    process.stdout.write(renderDiff(summary, files));
  }

  return 0;
}
