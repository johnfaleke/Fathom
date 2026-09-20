import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { initFathom } from "../src/core/storage.js";
import { cmdCheck } from "../src/commands/check.js";

test("check --ai requires an explicitly enabled workspace profile", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "fathom-ai-security-"));
  await initFathom(root);

  assert.equal(await cmdCheck(root, { ai: true }), 1);
});
