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
