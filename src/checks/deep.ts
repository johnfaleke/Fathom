import { Check, Finding } from "../types.js";
import { buildArchitectureGraph } from "../core/graph.js";
import { checkDocumentationDrift, checkTestCoverageRelationships, checkDependencyRelationships } from "../core/cross-artifacts.js";
import { gitChangedFiles } from "../core/git.js";

/**
 * Built-in check for circular dependencies and orphaned modules.
 */
export const deepArchitectureCheck: Check = {
  id: "architecture.dependency-topology",
  async run(ctx): Promise<Finding[]> {
    const graph = await buildArchitectureGraph(ctx.root, ctx.files);
    const findings = checkDependencyRelationships(graph);
    return findings;
  },
};

/**
 * Built-in check for documentation drift across environment variables and configs.
 */
export const docDriftCheck: Check = {
  id: "documentation.drift",
  async run(ctx): Promise<Finding[]> {
    const changed = await gitChangedFiles(ctx.root);
    const changedFiles = changed.length > 0 ? changed : ctx.files;
    const findings = await checkDocumentationDrift(ctx.root, ctx.files, changedFiles);
    return findings;
  },
};

/**
 * Built-in check for source logic modified without corresponding test updates.
 */
export const testCoverageCheck: Check = {
  id: "testing.coverage-relationship",
  async run(ctx): Promise<Finding[]> {
    const changed = await gitChangedFiles(ctx.root);
    if (changed.length === 0) return [];

    const graph = await buildArchitectureGraph(ctx.root, ctx.files);
    const { findings } = await checkTestCoverageRelationships(ctx.root, ctx.files, changed, graph);
    return findings;
  },
};
