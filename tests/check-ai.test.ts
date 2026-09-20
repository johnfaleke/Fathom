import test from "node:test";
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { initFathom } from "../src/core/storage.js";
import { cmdCheck } from "../src/commands/check.js";

test("check --ai uses the active custom profile", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "fathom-check-ai-"));
  await initFathom(root);
  await writeFile(
    path.join(root, ".fathom", "config.json"),
    JSON.stringify({
      version: 1,
      ignore: ["node_modules", "dist", ".git", ".fathom"],
      ai: {
        enabled: true,
        profile: "local",
        profiles: {
          local: {
            provider: "custom",
            model: "local-model",
            baseUrl: "PLACEHOLDER",
            apiKeyEnv: "FATHOM_TEST_KEY",
          },
        },
      },
    }, null, 2) + "\n",
    "utf8",
  );

  const server = createServer(async (_request, response) => {
    response.setHeader("content-type", "application/json");
    response.end(JSON.stringify({
      choices: [{ message: { content: JSON.stringify({ summary: "Local interpretation", confidence: 0.9, notes: [] }) } }],
    }));
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  assert.ok(address && typeof address === "object");

  const previousKey = process.env.FATHOM_TEST_KEY;
  process.env.FATHOM_TEST_KEY = "test-key";
  try {
    const configPath = path.join(root, ".fathom", "config.json");
    const config = JSON.parse(await readFile(configPath, "utf8"));
    config.ai.profiles.local.baseUrl = `http://127.0.0.1:${address.port}/v1`;
    await writeFile(configPath, JSON.stringify(config, null, 2) + "\n", "utf8");

    assert.equal(await cmdCheck(root, { ai: true, json: true }), 0);
    const events = await readFile(path.join(root, ".fathom", "events.jsonl"), "utf8");
    assert.match(events, /"type":"interpret"/);
    assert.match(events, /"provider":"custom"/);
  } finally {
    if (previousKey === undefined) delete process.env.FATHOM_TEST_KEY;
    else process.env.FATHOM_TEST_KEY = previousKey;
    await new Promise<void>((resolve, reject) => server.close((error) => (error ? reject(error) : resolve())));
  }
});
