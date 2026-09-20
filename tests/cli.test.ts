import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
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

test("CLI set updates current work and task state", async () => {
  const tempDir = mkdtempSync(path.join(tmpdir(), "fathom-set-"));

  await execFileAsync(process.execPath, [cliPath, "init"], {
    cwd: tempDir,
    env: process.env,
  });

  await execFileAsync(
    process.execPath,
    [
      cliPath,
      "set",
      "--current",
      "Ship OAuth integration",
      "--complete",
      "Login API, API docs",
      "--incomplete",
      "Webhook retry handling, Missing README",
    ],
    { cwd: tempDir, env: process.env },
  );

  const statePath = path.join(tempDir, ".fathom", "state.json");
  const state = JSON.parse(readFileSync(statePath, "utf8"));

  assert.equal(state.currentWork, "Ship OAuth integration");
  assert.deepEqual(
    state.completed.map((item: { title: string }) => item.title),
    ["Login API", "API docs"],
  );
  assert.deepEqual(
    state.incomplete.map((item: { title: string }) => item.title),
    ["Webhook retry handling", "Missing README"],
  );
});

test("CLI diff summarizes file changes by project area", async () => {
  const tempDir = mkdtempSync(path.join(tmpdir(), "fathom-diff-"));

  const repoRoot = tempDir;
  await execFileAsync("git", ["init"], { cwd: repoRoot, env: process.env });
  await execFileAsync("git", ["config", "user.email", "test@example.com"], {
    cwd: repoRoot,
    env: process.env,
  });
  await execFileAsync("git", ["config", "user.name", "Test User"], {
    cwd: repoRoot,
    env: process.env,
  });

  writeFileSync(path.join(repoRoot, "package.json"), JSON.stringify({ name: "fixture-app" }, null, 2));
  writeFileSync(path.join(repoRoot, "README.md"), "# Fixture\n");
  mkdirSync(path.join(repoRoot, "src"), { recursive: true });
  writeFileSync(path.join(repoRoot, "src", "app.ts"), "export const x = 1;\n");
  await execFileAsync("git", ["add", "."], { cwd: repoRoot, env: process.env });
  await execFileAsync("git", ["commit", "-m", "initial"], { cwd: repoRoot, env: process.env });

  writeFileSync(path.join(repoRoot, "src", "app.ts"), "export const x = 2;\n");
  writeFileSync(path.join(repoRoot, "README.md"), "# Fixture\nUpdated\n");

  await execFileAsync(process.execPath, [cliPath, "init"], { cwd: repoRoot, env: process.env });
  const { stdout } = await execFileAsync(process.execPath, [cliPath, "diff"], {
    cwd: repoRoot,
    env: process.env,
  });

  assert.match(stdout, /Source:/);
  assert.match(stdout, /Docs:\s*README\.md/i);
  assert.match(stdout, /src\/app\.ts/);
});

test("CLI status prints a readable project summary", async () => {
  const tempDir = mkdtempSync(path.join(tmpdir(), "fathom-status-summary-"));

  await execFileAsync(process.execPath, [cliPath, "init"], {
    cwd: tempDir,
    env: process.env,
  });

  await execFileAsync(
    process.execPath,
    [
      cliPath,
      "set",
      "--current",
      "Ship OAuth integration",
      "--complete",
      "Login API",
      "--incomplete",
      "Webhook retry handling",
    ],
    { cwd: tempDir, env: process.env },
  );

  const { stdout } = await execFileAsync(process.execPath, [cliPath, "status"], {
    cwd: tempDir,
    env: process.env,
  });

  assert.match(stdout, /Current work: Ship OAuth integration/);
  assert.match(stdout, /Progress: 1 complete, 1 remaining/);
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
