import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { initFathom } from "../src/core/storage.js";
import { cmdConfig } from "../src/commands/config.js";

test("config command stores named AI profiles without API keys", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "fathom-config-"));
  await initFathom(root);

  assert.equal(await cmdConfig(root, ["set", "ai.profile", "local"]), 0);
  assert.equal(await cmdConfig(root, ["set", "ai.profiles.local.provider", "custom"]), 0);
  assert.equal(await cmdConfig(root, ["set", "ai.profiles.local.model", "local-model"]), 0);
  assert.equal(await cmdConfig(root, ["set", "ai.profiles.local.apiKeyEnv", "LOCAL_AI_KEY"]), 0);
  assert.equal(await cmdConfig(root, ["set", "ai.profiles.local.baseUrl", "http://localhost:9000/v1"]), 0);

  const config = JSON.parse(await readFile(path.join(root, ".fathom", "config.json"), "utf8"));
  assert.equal(config.ai.profile, "local");
  assert.deepEqual(config.ai.profiles.local, {
    provider: "custom",
    model: "local-model",
    apiKeyEnv: "LOCAL_AI_KEY",
    baseUrl: "http://localhost:9000/v1",
  });
  assert.equal("apiKey" in config.ai.profiles.local, false);
});
