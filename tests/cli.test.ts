import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync } from "node:fs";
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
