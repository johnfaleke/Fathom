import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { initFathom } from "../src/core/storage.js";
import { cmdInterpret } from "../src/commands/interpret.js";

test("interpret requires explicit consent before using a provider", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "fathom-interpret-"));
  await initFathom(root);

  const exitCode = await cmdInterpret(root, { provider: "openai" });

  assert.equal(exitCode, 1);
});
