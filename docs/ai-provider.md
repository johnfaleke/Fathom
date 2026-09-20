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
  context?: Record<string, unknown>;
}

export interface AIInterpretationResult {
  summary: string;
  confidence: number;
  notes: string[];
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

## Safety and privacy

- Never send secrets, private keys, or `.env` values to a provider.
- Ensure the project is local-first and transparent.
- Treat the AI layer as an optional enhancement, not the core product.
