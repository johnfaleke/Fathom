# AI provider interface

Fathom keeps AI interpretation explicitly separate from deterministic checks. This avoids mixing evidence with speculation.

## Goal

Optional AI interpretation should be:

- opt-in
- provider-agnostic
- clearly labelled as interpretation
- never used to replace a deterministic check

## Provider contract

```ts
export type ProviderType = "openai" | "anthropic" | "google" | "custom";

export interface AIInterpretationRequest {
  projectRoot: string;
  workState: unknown;
  prompt: string;
  consent: true;
  evidence: Evidence[];
  context?: SafeAIContext;
}

export interface AIInterpretationResult {
  interpretation: true;
  summary: string;
  confidence: number;
  notes: string[];
  evidence: Evidence[];
  provider: ProviderType;
}

export interface AIProvider {
  id: string;
  name: string;
  type: ProviderType;
  interpret(input: AIInterpretationRequest): Promise<AIInterpretationResult>;
}
```

## Recommended usage

- Use the provider only for higher-level interpretation such as risk summaries or likely incomplete work.
- Keep the model output clearly marked as interpretation.
- Preserve the underlying evidence in the same Work State record.
- Require explicit consent before sending project context to a remote provider.
- Pass only context returned by `collectSafeAIContext`.
- Use `includePaths` when a provider needs a narrow, inspectable file set.
- Keep the `evidence` array attached to the interpretation result.

## Supported adapter

v0.2 includes an opt-in OpenAI-compatible adapter. It uses the user's API key,
Node's built-in `fetch`, and the `/chat/completions` endpoint. The endpoint can be
overridden for compatible gateways or local test fixtures.

```ts
const provider = new OpenAIProvider({
  apiKey: process.env.OPENAI_API_KEY!,
  model: "gpt-4o-mini",
  baseUrl: "https://api.openai.com/v1",
});
```

The adapter is a library surface in v0.2. It is not called automatically by
`fathom check`, `fathom status`, or `fathom diff`; interpretation must be an
explicit application decision.

## CLI usage

Set the provider key, choose a profile, review the project's ignore and AI
context policy, then request interpretation through the normal check flow:

```bash
fathom setup
OPENAI_API_KEY=your-key fathom check --ai --json
```

On PowerShell:

```powershell
$env:OPENAI_API_KEY = "your-key"
fathom setup
fathom check --ai --json
```

The setup wizard asks for configuration but never asks for the API key. For
automation, use `fathom setup --non-interactive` with `--profile`, `--provider`,
`--model`, `--base-url`, and `--api-key-env`.

The command reports interpretation separately from deterministic findings. It
does not write model text into the Work State schema. Plain `fathom check` never
uploads context; `fathom check --ai` is the explicit network boundary.

Profiles support multiple providers and custom OpenAI-compatible gateways:

```bash
fathom config set ai.profile work
fathom config set ai.profiles.work.provider openai
fathom config set ai.profiles.work.model gpt-4o-mini
fathom config set ai.profiles.work.apiKeyEnv OPENAI_API_KEY

fathom config set ai.profile local
fathom config set ai.profiles.local.provider custom
fathom config set ai.profiles.local.model local-model
fathom config set ai.profiles.local.baseUrl http://localhost:9000/v1
fathom config set ai.profiles.local.apiKeyEnv LOCAL_AI_KEY
```

Use `fathom config show` to inspect profile metadata. API keys are resolved from
the configured environment variable and are never stored in project config.

## Safe context filtering

```ts
const context = await collectSafeAIContext(projectContext, {
  includePaths: ["README.md", "src/app.ts"],
  maxFileBytes: 50_000,
});

const result = await provider.interpret({
  projectRoot,
  workState,
  prompt: "Summarize likely follow-up work.",
  consent: true,
  evidence: workState.findings.flatMap((finding) => finding.evidence),
  context,
});
```

The collector excludes `.env` files, credential and secret paths, private keys,
certificates, common binary files, and files larger than the configured limit. Its
`excluded` list is returned alongside the safe files so filtering is inspectable.

## Safety and privacy

- Never send secrets, private keys, or `.env` values to a provider.
- Ensure the project is local-first and transparent.
- Treat the AI layer as an optional enhancement, not the core product.
- Never construct a provider request with raw filesystem contents.
