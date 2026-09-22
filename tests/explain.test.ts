import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { tagFindings, buildExplanation } from "../src/core/completion.js";
import type { Finding, ProjectSounding } from "../src/types.js";

const execFileAsync = promisify(execFile);
const projectRoot = fileURLToPath(new URL("..", import.meta.url));
const cliPath = path.join(projectRoot, "dist", "cli.js");

test("tagFindings assigns FND-01, FND-02 codes", () => {
  const raw: Finding[] = [
    {
      id: "config.env-var-missing",
      category: "configuration",
      severity: "warning",
      message: "API_KEY missing from .env.example",
      evidence: [{ kind: "ast", path: "src/app.ts", detail: "process.env.API_KEY" }],
    },
    {
      id: "deps.undeclared-import",
      category: "dependencies",
      severity: "warning",
      message: "axios not in package.json",
      evidence: [{ kind: "import", path: "src/app.ts", detail: "import axios" }],
    },
  ];

  const tagged = tagFindings(raw);
  assert.equal(tagged[0].code, "FND-01");
  assert.equal(tagged[1].code, "FND-02");
});

test("buildExplanation constructs deterministic evidence report", () => {
  const sounding: ProjectSounding = {
    generatedAt: new Date().toISOString(),
    objective: { title: "Test Objective", confidence: 0.9, evidence: [], source: "git" },
    semanticMap: [],
    likelyComplete: [],
    needsAttention: [
      {
        code: "FND-01",
        id: "config.env-var-missing",
        category: "configuration",
        severity: "warning",
        message: "STRIPE_SECRET missing from .env.example",
        evidence: [{ kind: "ast", path: "src/stripe.ts", detail: "process.env.STRIPE_SECRET" }],
      },
    ],
    projectDrift: { inconsistenciesCount: 1, filesChangedCount: 1, commitCount: 1 },
  };

  const exp = buildExplanation("FND-01", sounding);
  assert.ok(exp);
  assert.equal(exp.code, "FND-01");
  assert.equal(exp.riskLevel, "high");
  assert.ok(exp.provenance.includes("Deterministic repository observation"));
});

test("CLI explain command outputs finding details and coordinates", async () => {
  const tempDir = mkdtempSync(path.join(tmpdir(), "fathom-explain-"));
  mkdirSync(path.join(tempDir, "src"), { recursive: true });

  writeFileSync(
    path.join(tempDir, "package.json"),
    JSON.stringify({ name: "fixture-explain", version: "1.0.0" }, null, 2),
  );

  writeFileSync(
    path.join(tempDir, "src", "index.ts"),
    "const key = process.env.PAYMENT_GATEWAY_KEY;\nconsole.log(key);\n",
  );

  await execFileAsync(process.execPath, [cliPath, "init"], {
    cwd: tempDir,
    env: process.env,
  });

  const { stdout } = await execFileAsync(
    process.execPath,
    [cliPath, "explain", "FND-01", "--json"],
    {
      cwd: tempDir,
      env: process.env,
    },
  );

  const parsed = JSON.parse(stdout);
  assert.equal(parsed.code, "FND-01");
  assert.equal(parsed.category, "configuration");
  assert.equal(parsed.riskLevel, "high");
  assert.ok(parsed.evidence.some((e: any) => e.path === "src/index.ts"));
});
