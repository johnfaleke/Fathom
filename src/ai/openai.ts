import type {
  AIInterpretationRequest,
  AIInterpretationResult,
  AIProvider,
} from "./provider.js";
import type { ProviderType } from "./provider.js";

export interface OpenAIProviderOptions {
  apiKey: string;
  model: string;
  baseUrl?: string;
  providerType?: ProviderType;
}

interface ChatCompletionResponse {
  choices?: Array<{ message?: { content?: string | null } }>;
}

export class OpenAIProvider implements AIProvider {
  readonly id: string;
  readonly name: string;
  readonly type: ProviderType;

  private readonly apiKey: string;
  private readonly model: string;
  private readonly baseUrl: string;

  constructor(options: OpenAIProviderOptions) {
    if (!options.apiKey.trim()) throw new Error("OpenAI API key is required");
    if (!options.model.trim()) throw new Error("OpenAI model is required");
    this.apiKey = options.apiKey;
    this.model = options.model;
    const baseUrl = new URL(options.baseUrl ?? "https://api.openai.com/v1");
    if (!['http:', 'https:'].includes(baseUrl.protocol) || baseUrl.username || baseUrl.password) {
      throw new Error("Provider base URL must be an http(s) URL without embedded credentials");
    }
    this.baseUrl = baseUrl.toString().replace(/\/$/, "");
    this.type = options.providerType ?? "openai";
    this.id = this.type;
    this.name = this.type === "custom" ? "Custom OpenAI-compatible provider" : "OpenAI";
  }

  async interpret(input: AIInterpretationRequest): Promise<AIInterpretationResult> {
    if (input.consent !== true) {
      throw new Error("Explicit consent is required before sending project context");
    }

    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: this.model,
        temperature: 0,
        response_format: { type: "json_object" },
        messages: [
          {
            role: "system",
            content:
              "You interpret project work state. Return JSON with summary (string), confidence (number from 0 to 1), and notes (string array). Do not invent evidence.",
          },
          {
            role: "user",
            content: JSON.stringify({
              prompt: input.prompt,
              workState: input.workState,
              evidence: input.evidence,
              context: input.context ?? { files: {}, excluded: [] },
            }),
          },
        ],
      }),
    });

    if (!response.ok) {
      const detail = (await response.text()).slice(0, 500);
      throw new Error(`OpenAI request failed (${response.status}): ${detail}`);
    }

    const payload = (await response.json()) as ChatCompletionResponse;
    const content = payload.choices?.[0]?.message?.content;
    if (!content) throw new Error("OpenAI response did not contain message content");

    const parsed = parseInterpretation(content);
    return {
      interpretation: true,
      summary: parsed.summary,
      confidence: parsed.confidence,
      notes: parsed.notes,
      evidence: input.evidence,
      provider: this.type,
    };
  }
}

function parseInterpretation(content: string): {
  summary: string;
  confidence: number;
  notes: string[];
} {
  let value: unknown;
  try {
    value = JSON.parse(content);
  } catch {
    return { summary: content.trim(), confidence: 0.5, notes: [] };
  }

  if (!value || typeof value !== "object") throw new Error("OpenAI response JSON must be an object");
  const result = value as Record<string, unknown>;
  if (typeof result.summary !== "string") throw new Error("OpenAI response is missing a string summary");

  const confidence = typeof result.confidence === "number" ? result.confidence : 0.5;
  const notes = Array.isArray(result.notes)
    ? result.notes.filter((note): note is string => typeof note === "string")
    : [];

  return {
    summary: result.summary,
    confidence: Math.max(0, Math.min(1, confidence)),
    notes,
  };
}
