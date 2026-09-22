import * as fs from "node:fs/promises";
import * as path from "node:path";
import {
  ArchitectureGraph,
  GraphNode,
  GraphEdge,
  CycleFinding,
  OrphanFinding,
  SemanticDomain,
} from "../types.js";
import { extractSourceSymbols } from "./ast.js";
import { classifyFile } from "./semantic-map.js";

const ENTRY_POINTS = new Set([
  "src/index.ts",
  "src/cli.ts",
  "src/main.ts",
  "index.ts",
  "cli.ts",
  "main.ts",
  "index.js",
  "cli.js",
  "main.js",
]);

/**
 * Normalizes file path to forward slashes.
 */
function normalizePath(p: string): string {
  return p.replace(/\\/g, "/");
}

/**
 * Resolves a module specifier relative to the importing file.
 */
export function resolveImportPath(importingFile: string, specifier: string, availableFiles: Set<string>): string | null {
  if (!specifier.startsWith(".")) {
    // External package
    return specifier;
  }

  const dir = path.dirname(importingFile);
  const resolved = normalizePath(path.normalize(path.join(dir, specifier)));

  // Try direct match
  if (availableFiles.has(resolved)) {
    return resolved;
  }

  // Try standard extension substitutions
  // If importing .js, might be .ts in source
  const baseWithoutExt = resolved.replace(/\.(js|jsx|ts|tsx)$/, "");
  const extensions = [".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs", "/index.ts", "/index.js"];

  for (const ext of extensions) {
    const candidate = baseWithoutExt + ext;
    if (availableFiles.has(candidate)) {
      return candidate;
    }
  }

  return resolved;
}

/**
 * Detects circular dependencies in the graph using DFS with a recursion stack.
 */
export function detectCyclicDependencies(edges: GraphEdge[]): CycleFinding[] {
  const adj = new Map<string, string[]>();
  for (const edge of edges) {
    if (edge.type === "imports" && !edge.to.startsWith("@") && !edge.to.includes("node_modules")) {
      const list = adj.get(edge.from) || [];
      list.push(edge.to);
      adj.set(edge.from, list);
    }
  }

  const visited = new Set<string>();
  const recStack = new Set<string>();
  const pathTrack: string[] = [];
  const cycles: CycleFinding[] = [];
  const seenCycleSignatures = new Set<string>();

  function dfs(node: string) {
    visited.add(node);
    recStack.add(node);
    pathTrack.push(node);

    const neighbors = adj.get(node) || [];
    for (const neighbor of neighbors) {
      if (!visited.has(neighbor)) {
        dfs(neighbor);
      } else if (recStack.has(neighbor)) {
        // Cycle detected
        const cycleStartIndex = pathTrack.indexOf(neighbor);
        if (cycleStartIndex !== -1) {
          const cyclePath = pathTrack.slice(cycleStartIndex);
          cyclePath.push(neighbor);

          // Canonical signature (sorted nodes) to prevent duplicate cycles
          const signature = [...cyclePath].sort().join("->");
          if (!seenCycleSignatures.has(signature)) {
            seenCycleSignatures.add(signature);
            cycles.push({
              cycle: cyclePath,
              length: cyclePath.length - 1,
            });
          }
        }
      }
    }

    pathTrack.pop();
    recStack.delete(node);
  }

  for (const node of adj.keys()) {
    if (!visited.has(node)) {
      dfs(node);
    }
  }

  return cycles;
}

/**
 * Detects orphaned modules (source files never imported and not entry points).
 */
export function detectOrphanedModules(nodes: GraphNode[], edges: GraphEdge[]): OrphanFinding[] {
  const importedFiles = new Set<string>();
  for (const edge of edges) {
    if (edge.type === "imports") {
      importedFiles.add(edge.to);
    }
  }

  const orphans: OrphanFinding[] = [];
  for (const node of nodes) {
    if (node.type !== "file") continue;
    if (node.domain === "tests" || node.domain === "docs" || node.domain === "tooling" || node.domain === "config") {
      continue;
    }
    if (ENTRY_POINTS.has(node.id)) {
      continue;
    }

    if (!importedFiles.has(node.id)) {
      orphans.push({
        filePath: node.id,
        domain: node.domain || "logic",
      });
    }
  }

  return orphans;
}

/**
 * Finds all direct and indirect dependents of a given target file.
 */
export function findDependents(graph: ArchitectureGraph, targetFile: string): string[] {
  const reverseAdj = new Map<string, string[]>();
  for (const edge of graph.edges) {
    if (edge.type === "imports") {
      const list = reverseAdj.get(edge.to) || [];
      list.push(edge.from);
      reverseAdj.set(edge.to, list);
    }
  }

  const dependents = new Set<string>();
  const queue = [targetFile];

  while (queue.length > 0) {
    const curr = queue.shift()!;
    const callers = reverseAdj.get(curr) || [];
    for (const caller of callers) {
      if (!dependents.has(caller)) {
        dependents.add(caller);
        queue.push(caller);
      }
    }
  }

  return Array.from(dependents).sort();
}

/**
 * Builds the complete Architecture Graph for the project.
 */
export async function buildArchitectureGraph(
  workspaceRoot: string,
  files: string[],
  fileContents?: Map<string, string>
): Promise<ArchitectureGraph> {
  const normalizedFiles = files.map(normalizePath);
  const fileSet = new Set(normalizedFiles);

  const nodesMap = new Map<string, GraphNode>();
  const edges: GraphEdge[] = [];

  for (const relPath of normalizedFiles) {
    // Only analyze code and script files
    if (!relPath.match(/\.(ts|tsx|js|jsx|mjs|cjs)$/i) || relPath.startsWith(".fathom/") || relPath.startsWith("dist/") || relPath.startsWith("site/")) {
      continue;
    }

    let content = fileContents?.get(relPath);
    if (content === undefined) {
      try {
        const fullPath = path.join(workspaceRoot, relPath);
        content = await fs.readFile(fullPath, "utf-8");
      } catch {
        continue;
      }
    }

    const { domain } = classifyFile(relPath);
    const symbols = extractSourceSymbols(relPath, content);

    const isTest = domain === "tests";
    const nodeType = isTest ? "test" : domain === "config" ? "config" : "file";

    const node: GraphNode = {
      id: relPath,
      label: path.basename(relPath),
      type: nodeType,
      domain,
      exportsCount: symbols.exports.length,
      importsCount: symbols.imports.length,
    };
    nodesMap.set(relPath, node);

    // Process imports to create edges
    for (const imp of symbols.imports) {
      const resolvedTarget = resolveImportPath(relPath, imp.specifier, fileSet);
      if (!resolvedTarget) continue;

      const isExternal = !resolvedTarget.startsWith(".") && !fileSet.has(resolvedTarget);

      if (isExternal && !nodesMap.has(resolvedTarget)) {
        nodesMap.set(resolvedTarget, {
          id: resolvedTarget,
          label: resolvedTarget,
          type: "package",
          exportsCount: 0,
          importsCount: 0,
        });
      }

      edges.push({
        from: relPath,
        to: resolvedTarget,
        type: isTest ? "tested_by" : "imports",
        symbols: imp.symbols,
      });
    }
  }

  const nodes = Array.from(nodesMap.values());
  const cycles = detectCyclicDependencies(edges);
  const orphans = detectOrphanedModules(nodes, edges);

  return {
    generatedAt: new Date().toISOString(),
    root: workspaceRoot,
    nodes,
    edges,
    metrics: {
      totalModules: nodes.length,
      totalEdges: edges.length,
      cycles,
      orphans,
    },
  };
}
