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

test("CLI help prints usage", async () => {
  const { stdout, stderr } = await execFileAsync(process.execPath, [cliPath, "--help"], {
    cwd: projectRoot,
    env: process.env,
  });

  assert.match(stdout, /fathom/);
  assert.match(stdout, /Usage:/);
  assert.equal(stderr, "");
});

test("CLI init creates Fathom state directory", async () => {
  const tempDir = mkdtempSync(path.join(tmpdir(), "fathom-cli-"));

  const { stdout } = await execFileAsync(process.execPath, [cliPath, "init"], {
    cwd: tempDir,
    env: process.env,
  });

  assert.match(stdout, /Initialized Fathom/);
});

test("CLI init creates a default .env.example scaffold", async () => {
  const tempDir = mkdtempSync(path.join(tmpdir(), "fathom-env-"));

  await execFileAsync(process.execPath, [cliPath, "init"], {
    cwd: tempDir,
    env: process.env,
  });

  const envExample = path.join(tempDir, ".env.example");
  const exists = await import("node:fs/promises").then((fs) => fs.access(envExample).then(() => true).catch(() => false));

  assert.equal(exists, true);
});

test("CLI check reports missing env vars and undeclared imports", async () => {
  const tempDir = mkdtempSync(path.join(tmpdir(), "fathom-check-"));
  mkdirSync(path.join(tempDir, "src"), { recursive: true });

  writeFileSync(
    path.join(tempDir, "package.json"),
    JSON.stringify({ name: "fixture-app", version: "1.0.0" }, null, 2),
  );

  writeFileSync(
    path.join(tempDir, "src", "app.ts"),
    "import leftPad from 'left-pad';\nconst token = process.env.API_TOKEN;\nconsole.log(leftPad(token ?? 'x', 4));\n",
  );

  await execFileAsync(process.execPath, [cliPath, "init"], {
    cwd: tempDir,
    env: process.env,
  });

  let result;
  try {
    result = await execFileAsync(process.execPath, [cliPath, "check", "--json"], {
      cwd: tempDir,
      env: process.env,
    });
    assert.fail("Expected CLI check to exit nonzero after reporting findings");
  } catch (error: any) {
    assert.equal(error.code, 2);
    assert.ok(typeof error.stdout === "string");
    result = { stdout: error.stdout };
  }

  const parsed = JSON.parse(result.stdout);
  const ids = parsed.findings.map((finding: { id: string }) => finding.id);

  assert.ok(ids.includes("config.env-var-missing"));
  assert.ok(ids.includes("deps.undeclared-import"));
  assert.ok(parsed.attention >= 2);
});
