import { test } from "node:test";
import assert from "node:assert/strict";
import {
  checkDocumentationDrift,
  checkTestCoverageRelationships,
  checkDependencyRelationships,
} from "../src/core/cross-artifacts.js";
import { buildArchitectureGraph } from "../src/core/graph.js";

test("checkDocumentationDrift catches undocumented environment variables", async () => {
  const fileContents = new Map<string, string>([
    ["src/auth.ts", `const key = process.env.STRIPE_SECRET_KEY;`],
    ["README.md", `# Project\nThis is a cool project without env docs.`],
  ]);

  const findings = await checkDocumentationDrift(
    "/mock",
    ["src/auth.ts", "README.md"],
    ["src/auth.ts"],
    fileContents
  );

  assert.equal(findings.length, 1);
  assert.equal(findings[0].code, "FND-DOC-01");
  assert.ok(findings[0].message.includes("STRIPE_SECRET_KEY"));
});

test("checkTestCoverageRelationships flags modified logic without test updates", async () => {
  const fileContents = new Map<string, string>([
    ["src/core/billing.ts", `export function calculateTax() { return 0.1; }`],
    ["tests/billing.test.ts", `import { calculateTax } from "../src/core/billing.js";`],
  ]);

  const graph = await buildArchitectureGraph("/mock", ["src/core/billing.ts", "tests/billing.test.ts"], fileContents);
  const { findings, mappings } = await checkTestCoverageRelationships(
    "/mock",
    ["src/core/billing.ts", "tests/billing.test.ts"],
    ["src/core/billing.ts"], // only source modified, not test
    graph,
    fileContents
  );

  assert.equal(mappings.length, 1);
  assert.equal(mappings[0].isCovered, true);
  assert.equal(findings.length, 1);
  assert.equal(findings[0].code, "FND-TEST-01");
  assert.ok(findings[0].message.includes("billing.ts"));
});

test("checkDependencyRelationships emits findings for cycles and orphans", () => {
  const mockGraph = {
    generatedAt: new Date().toISOString(),
    root: "/mock",
    nodes: [],
    edges: [],
    metrics: {
      totalModules: 3,
      totalEdges: 3,
      cycles: [
        { cycle: ["src/a.ts", "src/b.ts", "src/a.ts"], length: 2 },
      ],
      orphans: [
        { filePath: "src/dead.ts", domain: "logic" as const },
      ],
    },
  };

  const findings = checkDependencyRelationships(mockGraph);
  assert.equal(findings.length, 2);
  assert.equal(findings[0].code, "FND-DEP-01");
  assert.equal(findings[1].code, "FND-DEP-02");
});
