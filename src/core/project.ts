import { readdir, readFile, access } from "node:fs/promises";
import path from "node:path";
import type { FathomConfig, ProjectContext } from "../types.js";
import { FATHOM_DIR } from "./storage.js";

const DEFAULT_IGNORE = [
  "node_modules",
  "dist",
  ".git",
  FATHOM_DIR,
  "coverage",
  ".next",
  "build",
  ".turbo",
  ".cache",
  "tests",
];

export async function createProjectContext(
  root: string,
  config?: FathomConfig,
): Promise<ProjectContext> {
  const ignore = new Set([...(config?.ignore ?? DEFAULT_IGNORE)]);
  const files = await walkFiles(root, root, ignore);

  return {
    root,
    fathomDir: path.join(root, FATHOM_DIR),
    files,
    async readText(relPath: string) {
      try {
        return await readFile(path.join(root, relPath), "utf8");
      } catch {
        return null;
      }
    },
    async exists(relPath: string) {
      try {
        await access(path.join(root, relPath));
        return true;
      } catch {
        return false;
      }
    },
  };
}

async function walkFiles(
  root: string,
  dir: string,
  ignore: Set<string>,
): Promise<string[]> {
  const entries = await readdir(dir, { withFileTypes: true });
  const out: string[] = [];

  for (const entry of entries) {
    if (ignore.has(entry.name)) continue;
    if (entry.name.startsWith(".") && entry.name !== ".env.example") continue;

    const abs = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      out.push(...(await walkFiles(root, abs, ignore)));
    } else if (entry.isFile()) {
      out.push(path.relative(root, abs).split(path.sep).join("/"));
    }
  }

  return out;
}
