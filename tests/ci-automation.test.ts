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

test("init --json outputs structured initialization state", async () => {
  const tempDir = mkdtempSync(path.join(tmpdir(), "fathom-init-json-"));

  const { stdout } = await execFileAsync(process.execPath, [cliPath, "init", "--json"], {
    cwd: tempDir,
    env: process.env,
  });

  const parsed = JSON.parse(stdout);
  assert.equal(parsed.initialized, true);
  assert.equal(parsed.alreadyExisted, false);
  assert.ok(parsed.paths.config.endsWith("config.json"));
  assert.ok(parsed.paths.state.endsWith("state.json"));
});

test("config set with --json outputs updated key-value pair", async () => {
  const tempDir = mkdtempSync(path.join(tmpdir(), "fathom-config-json-"));

  await execFileAsync(process.execPath, [cliPath, "init"], {
    cwd: tempDir,
    env: process.env,
  });

  const { stdout } = await execFileAsync(
    process.execPath,
    [cliPath, "config", "set", "ai.profile", "staging", "--json"],
    {
      cwd: tempDir,
      env: process.env,
    },
  );

  const parsed = JSON.parse(stdout);
  assert.equal(parsed.success, true);
  assert.equal(parsed.key, "ai.profile");
  assert.equal(parsed.value, "staging");
});

test("setup --non-interactive --json outputs structured profile config", async () => {
  const tempDir = mkdtempSync(path.join(tmpdir(), "fathom-setup-json-"));

  const { stdout } = await execFileAsync(
    process.execPath,
    [
      cliPath,
      "setup",
      "--non-interactive",
      "--profile",
      "ci-runner",
      "--provider",
      "custom",
      "--model",
      "local-fast",
      "--api-key-env",
      "CUSTOM_AI_KEY",
      "--json",
    ],
    {
      cwd: tempDir,
      env: process.env,
    },
  );

  const parsed = JSON.parse(stdout);
  assert.equal(parsed.success, true);
  assert.equal(parsed.profile, "ci-runner");
  assert.equal(parsed.provider, "custom");
  assert.equal(parsed.model, "local-fast");
  assert.equal(parsed.apiKeyEnv, "CUSTOM_AI_KEY");
});

test("check --format github outputs GitHub Actions workflow commands", async () => {
  const tempDir = mkdtempSync(path.join(tmpdir(), "fathom-gh-annot-"));
  mkdirSync(path.join(tempDir, "src"), { recursive: true });

  writeFileSync(
    path.join(tempDir, "package.json"),
    JSON.stringify({ name: "fixture-gh-annotations", version: "1.0.0" }, null, 2),
  );

  writeFileSync(
    path.join(tempDir, "src", "index.ts"),
    "import unregistered from 'unregistered-package';\nconsole.log(process.env.SECRET_KEY, unregistered);\n",
  );

  await execFileAsync(process.execPath, [cliPath, "init"], {
    cwd: tempDir,
    env: process.env,
  });

  let stdout = "";
  try {
    const res = await execFileAsync(process.execPath, [cliPath, "check", "--format", "github"], {
      cwd: tempDir,
      env: process.env,
    });
    stdout = res.stdout;
    assert.fail("Expected check with warnings to exit with code 2");
  } catch (err: any) {
    assert.equal(err.code, 2);
    stdout = err.stdout;
  }

  assert.match(stdout, /::warning/);
  assert.match(stdout, /title=Dependencies/);
  assert.match(stdout, /title=Configuration/);
});

test("check --format markdown outputs formatted report table", async () => {
  const tempDir = mkdtempSync(path.join(tmpdir(), "fathom-md-summary-"));
  mkdirSync(path.join(tempDir, "src"), { recursive: true });

  writeFileSync(
    path.join(tempDir, "package.json"),
    JSON.stringify({ name: "fixture-md-summary", version: "1.0.0" }, null, 2),
  );

  writeFileSync(
    path.join(tempDir, "src", "index.ts"),
    "const k = process.env.API_ENDPOINT;\nconsole.log(k);\n",
  );

  await execFileAsync(process.execPath, [cliPath, "init"], {
    cwd: tempDir,
    env: process.env,
  });

  let stdout = "";
  try {
    const res = await execFileAsync(process.execPath, [cliPath, "check", "--format", "markdown"], {
      cwd: tempDir,
      env: process.env,
    });
    stdout = res.stdout;
  } catch (err: any) {
    stdout = err.stdout;
  }

  assert.match(stdout, /# Fathom Report/);
  assert.match(stdout, /\| Severity \| Check ID \| Message \| Evidence \|/);
  assert.match(stdout, /config\.env-var-missing/i);
});

test("check CI gating with --max-attention and --fail-on", async () => {
  const tempDir = mkdtempSync(path.join(tmpdir(), "fathom-gating-"));
  mkdirSync(path.join(tempDir, "src"), { recursive: true });

  writeFileSync(
    path.join(tempDir, "package.json"),
    JSON.stringify({ name: "fixture-gating", version: "1.0.0" }, null, 2),
  );

  writeFileSync(
    path.join(tempDir, "src", "app.ts"),
    "const x = process.env.DATABASE_URL;\nconsole.log(x);\n",
  );

  await execFileAsync(process.execPath, [cliPath, "init"], {
    cwd: tempDir,
    env: process.env,
  });

  // 1 finding exists. With max-attention 5, it should pass with exit code 0.
  const passRes = await execFileAsync(
    process.execPath,
    [cliPath, "check", "--max-attention", "5"],
    {
      cwd: tempDir,
      env: process.env,
    },
  );
  assert.ok(passRes.stdout.includes("finding"));

  // With max-attention 0, it should fail with exit code 2.
  try {
    await execFileAsync(
      process.execPath,
      [cliPath, "check", "--max-attention", "0"],
      {
        cwd: tempDir,
        env: process.env,
      },
    );
    assert.fail("Expected check to fail when attention exceeds max-attention");
  } catch (err: any) {
    assert.equal(err.code, 2);
  }
});
