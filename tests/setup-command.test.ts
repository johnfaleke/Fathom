import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { cmdSetup } from "../src/commands/setup.js";

test("setup creates an AI profile without storing the secret", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "fathom-setup-"));

  assert.equal(
    await cmdSetup(root, {
      nonInteractive: true,
      profile: "work",
      provider: "openai",
      model: "gpt-test",
      baseUrl: "https://example.test/v1",
      apiKeyEnv: "WORK_AI_KEY",
    }),
    0,
  );

  const config = JSON.parse(await readFile(path.join(root, ".fathom", "config.json"), "utf8"));
  assert.equal(config.ai.enabled, true);
  assert.equal(config.ai.profile, "work");
  assert.deepEqual(config.ai.profiles.work, {
    provider: "openai",
    model: "gpt-test",
    baseUrl: "https://example.test/v1",
    apiKeyEnv: "WORK_AI_KEY",
  });
  assert.equal("apiKey" in config.ai.profiles.work, false);
});
