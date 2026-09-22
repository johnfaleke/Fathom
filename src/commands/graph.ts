import { buildArchitectureGraph } from "../core/graph.js";
import { getWorkspaceFiles } from "../core/project.js";
import { renderArchitectureGraph } from "../render/terminal.js";

export interface GraphCommandOptions {
  json?: boolean;
  format?: "text" | "json" | "mermaid";
  filter?: string;
}

export async function runGraphCommand(workspaceRoot: string, options: GraphCommandOptions = {}): Promise<number> {
  const files = await getWorkspaceFiles(workspaceRoot);
  const graph = await buildArchitectureGraph(workspaceRoot, files);

  if (options.json || options.format === "json") {
    console.log(JSON.stringify(graph, null, 2));
    return 0;
  }

  if (options.format === "mermaid") {
    console.log(renderMermaidGraph(graph, options.filter));
    return 0;
  }

  // Default terminal text tree
  console.log(renderArchitectureGraph(graph, options.filter));
  return 0;
}

/**
 * Generates Mermaid diagram syntax from the architecture graph.
 */
export function renderMermaidGraph(graph: any, filterDomain?: string): string {
  const lines: string[] = ["graph TD"];

  const filteredNodes = filterDomain
    ? graph.nodes.filter((n: any) => n.domain === filterDomain || n.type === "package")
    : graph.nodes;

  const validIds = new Set(filteredNodes.map((n: any) => n.id));

  for (const node of filteredNodes) {
    const safeId = node.id.replace(/[^a-zA-Z0-9_]/g, "_");
    const label = node.label || node.id;
    if (node.type === "package") {
      lines.push(`  ${safeId}["📦 ${label}"]`);
    } else if (node.type === "test") {
      lines.push(`  ${safeId}["🧪 ${label}"]`);
    } else {
      lines.push(`  ${safeId}["📄 ${label}"]`);
    }
  }

  for (const edge of graph.edges) {
    if (validIds.has(edge.from) && validIds.has(edge.to)) {
      const fromSafe = edge.from.replace(/[^a-zA-Z0-9_]/g, "_");
      const toSafe = edge.to.replace(/[^a-zA-Z0-9_]/g, "_");
      if (edge.type === "tested_by") {
        lines.push(`  ${fromSafe} -.->|tests| ${toSafe}`);
      } else {
        lines.push(`  ${fromSafe} --> ${toSafe}`);
      }
    }
  }

  return lines.join("\n");
}
