import { test } from "node:test";
import assert from "node:assert/strict";
import {
  buildArchitectureGraph,
  detectCyclicDependencies,
  detectOrphanedModules,
  findDependents,
} from "../src/core/graph.js";

test("detectCyclicDependencies accurately finds cycles in import graph", () => {
  const edges = [
    { from: "src/a.ts", to: "src/b.ts", type: "imports" as const },
    { from: "src/b.ts", to: "src/c.ts", type: "imports" as const },
    { from: "src/c.ts", to: "src/a.ts", type: "imports" as const },
    { from: "src/d.ts", to: "src/c.ts", type: "imports" as const },
  ];

  const cycles = detectCyclicDependencies(edges);
  assert.equal(cycles.length, 1);
  assert.equal(cycles[0].length, 3);
  assert.deepEqual(cycles[0].cycle, ["src/a.ts", "src/b.ts", "src/c.ts", "src/a.ts"]);
});

test("detectOrphanedModules flags unreferenced non-entry files", () => {
  const nodes = [
    { id: "src/index.ts", label: "index.ts", type: "file" as const, domain: "logic" as const, exportsCount: 1, importsCount: 1 },
    { id: "src/used.ts", label: "used.ts", type: "file" as const, domain: "logic" as const, exportsCount: 1, importsCount: 0 },
    { id: "src/orphan.ts", label: "orphan.ts", type: "file" as const, domain: "logic" as const, exportsCount: 1, importsCount: 0 },
  ];
  const edges = [
    { from: "src/index.ts", to: "src/used.ts", type: "imports" as const },
  ];

  const orphans = detectOrphanedModules(nodes, edges);
  assert.equal(orphans.length, 1);
  assert.equal(orphans[0].filePath, "src/orphan.ts");
});

test("buildArchitectureGraph constructs nodes and edges from virtual file map", async () => {
  const fileContents = new Map<string, string>([
    ["src/app.ts", `import { helper } from "./utils.js";`],
    ["src/utils.ts", `export function helper() {}`],
  ]);

  const graph = await buildArchitectureGraph("/virtual/root", ["src/app.ts", "src/utils.ts"], fileContents);

  assert.equal(graph.nodes.length, 2);
  assert.equal(graph.edges.length, 1);
  assert.equal(graph.edges[0].from, "src/app.ts");
  assert.equal(graph.edges[0].to, "src/utils.ts");
  assert.equal(graph.metrics.cycles.length, 0);

  const dependents = findDependents(graph, "src/utils.ts");
  assert.deepEqual(dependents, ["src/app.ts"]);
});
