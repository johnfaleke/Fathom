import path from "node:path";
import {
  initFathom,
  isInitialized,
  fathomPaths,
} from "../core/storage.js";

export async function cmdInit(cwd: string, opts: { json?: boolean } = {}): Promise<number> {
  const root = path.resolve(cwd);
  const paths = fathomPaths(root);

  if (await isInitialized(root)) {
    if (opts.json) {
      console.log(JSON.stringify({ initialized: true, alreadyExisted: true, root, paths }, null, 2));
    } else {
      console.log(`Fathom already initialized at ${paths.dir}`);
    }
    return 0;
  }

  await initFathom(root);
  if (opts.json) {
    console.log(JSON.stringify({ initialized: true, alreadyExisted: false, root, paths }, null, 2));
  } else {
    console.log(`Initialized Fathom in ${paths.dir}`);
    console.log(`  state.json   — current Work State`);
    console.log(`  events.jsonl — append-only observations`);
    console.log(`  config.json  — local configuration`);
  }
  return 0;
}
