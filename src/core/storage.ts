import { mkdir, readFile, writeFile, appendFile, access } from "node:fs/promises";
import path from "node:path";
import type { FathomConfig, Finding, ProjectModel, WorkState } from "../types.js";
import { WORK_STATE_VERSION } from "../types.js";

export const FATHOM_DIR = ".fathom";

export function fathomPaths(root: string) {
  const dir = path.join(root, FATHOM_DIR);
  return {
    dir,
    state: path.join(dir, "state.json"),
    events: path.join(dir, "events.jsonl"),
    config: path.join(dir, "config.json"),
    model: path.join(dir, "model.json"),
  };
}

export async function isInitialized(root: string): Promise<boolean> {
  try {
    await access(fathomPaths(root).dir);
    return true;
  } catch {
    return false;
  }
}

export async function initFathom(root: string): Promise<void> {
  const paths = fathomPaths(root);
  await mkdir(paths.dir, { recursive: true });

  const config: FathomConfig = {
    version: 1,
    ignore: ["node_modules", "dist", ".git", ".fathom", "coverage", ".next"],
  };

  const state = emptyWorkState(root);
  const envExamplePath = path.join(root, ".env.example");

  await writeFile(paths.config, JSON.stringify(config, null, 2) + "\n", "utf8");
  await writeFile(paths.state, JSON.stringify(state, null, 2) + "\n", "utf8");
  await writeFile(paths.events, "", "utf8");

  try {
    await access(envExamplePath);
  } catch {
    await writeFile(
      envExamplePath,
      [
        "# Copy this file to .env and replace placeholders with real values.",
        "# Fathom uses this file as the canonical environment reference.",
        "",
        "# Example variables",
        "PORT=3000",
        "NODE_ENV=development",
        "FATHOM_AI_MODEL=",
        "FATHOM_AI_BASE_URL=",
        "",
      ].join("\n") + "\n",
      "utf8",
    );
  }
  await appendEvent(root, {
    type: "init",
    at: new Date().toISOString(),
  });
}

export function emptyWorkState(root: string): WorkState {
  return {
    version: WORK_STATE_VERSION,
    updatedAt: new Date().toISOString(),
    root,
    currentWork: null,
    completed: [],
    incomplete: [],
    findings: [],
    changes: { filesChanged: 0, summary: [] },
    attention: 0,
  };
}

export const DEFAULT_CONFIG: FathomConfig = {
  version: 1,
  ignore: ["node_modules", "dist", ".git", ".fathom", "coverage", ".next"],
};

export async function loadConfig(root: string): Promise<FathomConfig> {
  try {
    const raw = await readFile(fathomPaths(root).config, "utf8");
    return JSON.parse(raw) as FathomConfig;
  } catch {
    return { ...DEFAULT_CONFIG };
  }
}

export async function loadState(root: string): Promise<WorkState> {
  try {
    const raw = await readFile(fathomPaths(root).state, "utf8");
    return JSON.parse(raw) as WorkState;
  } catch {
    return emptyWorkState(root);
  }
}

export async function saveProjectModel(root: string, model: ProjectModel): Promise<void> {
  const paths = fathomPaths(root);
  await mkdir(paths.dir, { recursive: true });
  await writeFile(paths.model, JSON.stringify(model, null, 2) + "\n", "utf8");
}

export async function loadProjectModel(root: string): Promise<ProjectModel> {
  const raw = await readFile(fathomPaths(root).model, "utf8");
  return JSON.parse(raw) as ProjectModel;
}

export async function saveState(root: string, state: WorkState): Promise<void> {
  state.updatedAt = new Date().toISOString();
  const paths = fathomPaths(root);
  await mkdir(paths.dir, { recursive: true });
  await writeFile(
    paths.state,
    JSON.stringify(state, null, 2) + "\n",
    "utf8",
  );
}

export async function appendEvent(
  root: string,
  event: Record<string, unknown>,
): Promise<void> {
  try {
    const paths = fathomPaths(root);
    await mkdir(paths.dir, { recursive: true });
    await appendFile(
      paths.events,
      JSON.stringify(event) + "\n",
      "utf8",
    );
  } catch {}
}


export function applyFindings(state: WorkState, findings: Finding[]): WorkState {
  return {
    ...state,
    findings,
    attention: findings.filter((f) => f.severity !== "info").length,
  };
}
