import type { Evidence } from "../types.js";
import type { SafeAIContext } from "./context.js";

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
