import * as fs from "node:fs/promises";
import * as path from "node:path";
import {
  FindingWithCode,
  ArchitectureGraph,
  TestCoverageMapping,
  DocDriftFinding,
} from "../types.js";
import { extractSourceSymbols } from "./ast.js";
import { classifyFile } from "./semantic-map.js";

/**
 * Checks for documentation drift when source symbols/routes/env vars are modified
 * without corresponding references in documentation files.
 */
export async function checkDocumentationDrift(
  workspaceRoot: string,
  files: string[],
  changedFiles: string[],
  fileContents?: Map<string, string>
): Promise<FindingWithCode[]> {
  const docFiles = files.filter(f => f.endsWith(".md") || f.endsWith(".txt") || f.startsWith("docs/"));
  if (docFiles.length === 0) return [];

  // Read all documentation content
  const docCorpus: { path: string; content: string }[] = [];
  for (const docFile of docFiles) {
    let content = fileContents?.get(docFile);
    if (content === undefined) {
      try {
        content = await fs.readFile(path.join(workspaceRoot, docFile), "utf-8");
      } catch {
        continue;
      }
    }
    docCorpus.push({ path: docFile, content });
  }

  const combinedDocText = docCorpus.map(d => d.content).join("\n");
  const findings: FindingWithCode[] = [];

  // Inspect changed files for undocumented env vars and new CLI flags
  const changedSourceFiles = changedFiles.filter(f => f.match(/\.(ts|js|tsx|jsx)$/) && !f.includes("test") && !f.includes(".spec."));

  for (const srcFile of changedSourceFiles) {
    let content = fileContents?.get(srcFile);
    if (content === undefined) {
      try {
        content = await fs.readFile(path.join(workspaceRoot, srcFile), "utf-8");
      } catch {
        continue;
      }
    }

    const symbols = extractSourceSymbols(srcFile, content);

    // Check environment variables
    for (const envVar of symbols.envVars) {
      if (!combinedDocText.includes(envVar)) {
        findings.push({
          code: "FND-DOC-01",
          id: `doc.env-undocumented.${envVar.toLowerCase()}`,
          category: "documentation",
          severity: "warning",
          message: `Environment variable '${envVar}' is referenced in ${srcFile} but not documented in any markdown files.`,
          evidence: [
            {
              kind: "ast",
              path: srcFile,
              detail: `AST extracted env var '${envVar}'`,
            },
            {
              kind: "documentation",
              detail: `Searched across ${docFiles.length} documentation files (${docFiles.slice(0, 3).join(", ")})`,
            },
          ],
        });
      }
    }
  }

  return findings;
}

/**
 * Maps source files to test files and checks if modified logic/API files lack test coverage updates.
 */
export async function checkTestCoverageRelationships(
  workspaceRoot: string,
  files: string[],
  changedFiles: string[],
  graph: ArchitectureGraph,
  fileContents?: Map<string, string>
): Promise<{ findings: FindingWithCode[]; mappings: TestCoverageMapping[] }> {
  const testFiles = files.filter(f => {
    const norm = f.replace(/\\/g, "/");
    return norm.includes("test") || norm.includes(".spec.") || norm.startsWith("tests/");
  });

  const changedSet = new Set(changedFiles.map(f => f.replace(/\\/g, "/")));
  const changedTests = testFiles.filter(t => changedSet.has(t.replace(/\\/g, "/")));

  const mappings: TestCoverageMapping[] = [];
  const findings: FindingWithCode[] = [];

  // Inspect source files in api, logic, or database domains
  const sourceFiles = files.filter(f => {
    const { domain } = classifyFile(f);
    return (domain === "api" || domain === "logic" || domain === "database") && !testFiles.includes(f);
  });

  for (const srcFile of sourceFiles) {
    const normSrc = srcFile.replace(/\\/g, "/");
    const baseName = path.basename(normSrc).replace(/\.(ts|js|tsx|jsx)$/, "");

    // Find test files that test this source file (via graph edges or naming convention)
    const matchingTests = new Set<string>();

    // 1. Direct edge in architecture graph
    for (const edge of graph.edges) {
      if (edge.type === "tested_by" && edge.to === normSrc) {
        matchingTests.add(edge.from);
      }
      if (edge.from.includes("test") && edge.to === normSrc) {
        matchingTests.add(edge.from);
      }
    }

    // 2. Naming convention match (e.g. tests/ast.test.ts for src/core/ast.ts)
    for (const testFile of testFiles) {
      if (testFile.includes(baseName)) {
        matchingTests.add(testFile);
      }
    }

    const testFileList = Array.from(matchingTests);
    const isCovered = testFileList.length > 0;

    mappings.push({
      sourceFile: normSrc,
      testFiles: testFileList,
      isCovered,
    });

    // Check if this source file is part of the currently changed set but no matching test was modified
    if (changedSet.has(normSrc)) {
      const anyMatchingTestChanged = testFileList.some(t => changedSet.has(t));
      if (!anyMatchingTestChanged && changedTests.length === 0) {
        findings.push({
          code: "FND-TEST-01",
          id: `test.untested-change.${baseName}`,
          category: "testing",
          severity: "potential",
          message: `Source file '${normSrc}' was modified without corresponding updates to tests (${testFileList.length > 0 ? testFileList.join(", ") : "no test file found"}).`,
          evidence: [
            {
              kind: "git",
              path: normSrc,
              detail: `File is modified in current work tree`,
            },
            {
              kind: "test-mapping",
              detail: isCovered
                ? `Mapped to test files: ${testFileList.join(", ")} (none modified)`
                : `No dedicated test file found for ${baseName}`,
            },
          ],
        });
      }
    }
  }

  return { findings, mappings };
}

/**
 * Checks for circular dependencies and orphaned modules in the architecture graph.
 */
export function checkDependencyRelationships(graph: ArchitectureGraph): FindingWithCode[] {
  const findings: FindingWithCode[] = [];

  // 1. Cycles
  for (const cycle of graph.metrics.cycles) {
    findings.push({
      code: "FND-DEP-01",
      id: `dep.cycle.${cycle.cycle[0]}`,
      category: "architecture",
      severity: "warning",
      message: `Circular dependency detected: ${cycle.cycle.join(" -> ")}`,
      evidence: [
        {
          kind: "graph",
          detail: `Cycle chain of length ${cycle.length}: ${cycle.cycle.join(" -> ")}`,
        },
      ],
    });
  }

  // 2. Orphans (excluding top-level files)
  for (const orphan of graph.metrics.orphans) {
    findings.push({
      code: "FND-DEP-02",
      id: `dep.orphan.${orphan.filePath.replace(/[^a-zA-Z0-9]/g, "-")}`,
      category: "architecture",
      severity: "info",
      message: `Module '${orphan.filePath}' is never imported by any other file in the project.`,
      evidence: [
        {
          kind: "graph",
          path: orphan.filePath,
          detail: `Zero incoming import edges found in architecture graph`,
        },
      ],
    });
  }

  return findings;
}
