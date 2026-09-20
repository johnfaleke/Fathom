import test from "node:test";
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { OpenAIProvider } from "../src/ai/openai.js";
import type { AIInterpretationRequest } from "../src/ai/provider.js";

function requestFixture(consent: true): AIInterpretationRequest {
  return {
    projectRoot: "/fixture",
    workState: { currentWork: "Ship the release" },
    prompt: "Summarize the next risk.",
    consent,
    evidence: [{ kind: "file", path: "src/app.ts", detail: "changed" }],
    context: {
      files: { "src/app.ts": "export const ready = true;" },
      excluded: [{ path: ".env", reason: "sensitive" }],
    },
  };
}

test("OpenAI provider sends filtered context and preserves evidence", async () => {
  let receivedBody: Record<string, unknown> | undefined;
  let receivedAuthorization = "";
  const server = createServer(async (request, response) => {
    receivedAuthorization = request.headers.authorization ?? "";
    receivedBody = JSON.parse(await readRequest(request)) as Record<string, unknown>;
    response.setHeader("content-type", "application/json");
    response.end(JSON.stringify({
      choices: [{ message: { content: JSON.stringify({ summary: "Review the changed file.", confidence: 0.8, notes: ["One follow-up remains."] }) } }],
    }));
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  assert.ok(address && typeof address === "object");

  try {
    const provider = new OpenAIProvider({
      apiKey: "test-key",
      model: "test-model",
      baseUrl: `http://127.0.0.1:${address.port}/v1`,
    });
    const result = await provider.interpret(requestFixture(true));
    const messages = receivedBody?.messages as Array<{ role: string; content: string }>;

    assert.equal(receivedAuthorization, "Bearer test-key");
    assert.equal(receivedBody?.model, "test-model");
    assert.match(messages[1].content, /src\/app\.ts/);
    assert.doesNotMatch(messages[1].content, /secret|API_KEY/);
    assert.equal(result.interpretation, true);
    assert.equal(result.summary, "Review the changed file.");
    assert.equal(result.confidence, 0.8);
    assert.deepEqual(result.evidence, requestFixture(true).evidence);
  } finally {
    await new Promise<void>((resolve, reject) => server.close((error) => (error ? reject(error) : resolve())));
  }
});

test("OpenAI provider requires explicit consent before network access", async () => {
  const provider = new OpenAIProvider({ apiKey: "test-key", model: "test-model" });
  await assert.rejects(
    provider.interpret({ ...requestFixture(true), consent: false as true }),
    /Explicit consent is required/,
  );
});

async function readRequest(request: import("node:http").IncomingMessage): Promise<string> {
  const chunks: Buffer[] = [];
  for await (const chunk of request) chunks.push(Buffer.from(chunk));
  return Buffer.concat(chunks).toString("utf8");
}