export type {
  Check,
  Evidence,
  Finding,
  FathomConfig,
  ProjectContext,
  Severity,
  WorkItem,
  WorkState,
  WorkStateSnapshot,
  WorkStateSummary,
  Claim,
  Observation,
  ProjectModel,
} from "./types.js";
export { WORK_STATE_VERSION } from "./types.js";
export { PROJECT_MODEL_VERSION } from "./types.js";
export { builtinChecks } from "./checks/index.js";
export { runChecks } from "./core/runner.js";
export { createProjectContext } from "./core/project.js";
export { buildProjectModel } from "./core/model.js";
export { collectSafeAIContext } from "./ai/context.js";
export { OpenAIProvider } from "./ai/openai.js";
export type { OpenAIProviderOptions } from "./ai/openai.js";
export type { AIContextPolicy, SafeAIContext } from "./ai/context.js";
export type {
  AIInterpretationRequest,
  AIInterpretationResult,
  AIProvider,
  ProviderType,
} from "./ai/provider.js";
