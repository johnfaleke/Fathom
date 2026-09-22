import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import path from "node:path";
import { fileURLToPath } from "node:url";

const execFileAsync = promisify(execFile);
const projectRoot = fileURLToPath(new URL("..", import.meta.url));
const cliPath = path.join(projectRoot, "dist", "cli.js");

test("CLI status reconstructs sounding with objective, semantic map, and drift", async () => {
  const tempDir = mkdtempSync(path.join(tmpdir(), "fathom-status-sounding-"));
  mkdirSync(path.join(tempDir, "src", "webhooks"), { recursive: true });

  writeFileSync(
    path.join(tempDir, "package.json"),
    JSON.stringify({ name: "fixture-sounding", version: "1.0.0" }, null, 2),
  );

  writeFileSync(
    path.join(tempDir, "src", "webhooks", "stripe.ts"),
    "export const webhook = () => console.log(process.env.STRIPE_WEBHOOK_SECRET);\n",
  );

  await execFileAsync(process.execPath, [cliPath, "init"], {
    cwd: tempDir,
    env: process.env,
  });

  const { stdout } = await execFileAsync(process.execPath, [cliPath, "status", "--json"], {
    cwd: tempDir,
    env: process.env,
  });

  const sounding = JSON.parse(stdout);
  assert.ok(sounding.objective);
  assert.ok(sounding.objective.title);
  assert.ok(Array.isArray(sounding.semanticMap));
  assert.ok(Array.isArray(sounding.likelyComplete));
  assert.ok(Array.isArray(sounding.needsAttention));
  assert.ok(sounding.projectDrift);
  assert.equal(sounding.needsAttention[0].code, "FND-01");
});

test("CLI status renders readable terminal sounding summary", async () => {
  const tempDir = mkdtempSync(path.join(tmpdir(), "fathom-status-render-"));
  mkdirSync(path.join(tempDir, "src"), { recursive: true });

  writeFileSync(
    path.join(tempDir, "package.json"),
    JSON.stringify({ name: "fixture-sounding-render", version: "1.0.0" }, null, 2),
  );

  await execFileAsync(process.execPath, [cliPath, "init"], {
    cwd: tempDir,
    env: process.env,
  });

  const { stdout } = await execFileAsync(process.execPath, [cliPath, "status"], {
    cwd: tempDir,
    env: process.env,
  });

  assert.match(stdout, /FATHOM \/ SOUNDING/);
  assert.match(stdout, /OBJECTIVE/);
  assert.match(stdout, /SEMANTIC MAP/);
  assert.match(stdout, /PROJECT DRIFT/);
});
