import path from "node:path";
import {
  initFathom,
  isInitialized,
  fathomPaths,
} from "../core/storage.js";

export async function cmdInit(cwd: string): Promise<number> {
  const root = path.resolve(cwd);

  if (await isInitialized(root)) {
    console.log(`Fathom already initialized at ${fathomPaths(root).dir}`);
    return 0;
  }

  await initFathom(root);
  console.log(`Initialized Fathom in ${fathomPaths(root).dir}`);
  console.log(`  state.json   — current Work State`);
  console.log(`  events.jsonl — append-only observations`);
  console.log(`  config.json  — local configuration`);
  return 0;
}
