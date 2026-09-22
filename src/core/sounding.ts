import path from "node:path";
import { builtinChecks } from "../checks/index.js";
import { createProjectContext } from "./project.js";
import { runChecks } from "./runner.js";
import { loadConfig, loadState, saveState, appendEvent } from "./storage.js";
import { buildSemanticMap } from "./semantic-map.js";
import { inferObjective, readGitSignals } from "./intent.js";
import { inferCompletions, tagFindings } from "./completion.js";
import type { ProjectSounding } from "../types.js";

export async function takeProjectSounding(cwd: string): Promise<ProjectSounding> {
  const root = path.resolve(cwd);
  const config = await loadConfig(root);
  const ctx = await createProjectContext(root, config);

  // 1. Run deterministic checks
  const rawFindings = await runChecks(ctx, builtinChecks);
  const taggedFindings = tagFindings(rawFindings);

  // 2. Update local state
  let state = await loadState(root);
  state.findings = taggedFindings;
  state.attention = taggedFindings.filter((f) => f.severity === "warning").length;
  await saveState(root, state);

  // 3. Git signals and diff files
  const gitSignals = await readGitSignals(root);

  // 4. Semantic domain mapping
  const filesToMap =
    gitSignals.changedFiles.length > 0
      ? gitSignals.changedFiles.map((p) => ({ path: p, status: "modified" as const }))
      : ctx.files.map((p) => ({ path: p, status: "tracked" as const }));

  const semanticMap = buildSemanticMap(filesToMap);

  // 5. Objective inference
  const objective = inferObjective(gitSignals, semanticMap, state.currentWork);

  // 6. Completion inference
  const likelyComplete = inferCompletions(semanticMap, taggedFindings, state.completed);

  return {
    generatedAt: new Date().toISOString(),
    objective,
    semanticMap,
    likelyComplete,
    needsAttention: taggedFindings,
    projectDrift: {
      inconsistenciesCount: taggedFindings.length,
      filesChangedCount: gitSignals.changedFiles.length || ctx.files.length,
      commitCount: gitSignals.recentCommits.length,
    },
  };
}
