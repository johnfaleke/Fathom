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
  InferredObjective,
  SemanticDomain,
  SemanticFileEntry,
  SemanticDomainGroup,
  CompletionItem,
  FindingWithCode,
  ProjectSounding,
  FindingExplanation,
  SourceSymbolSummary,
  SourceImport,
  SourceExport,
  SourceRoute,
  ArchitectureGraph,
  GraphNode,
  GraphEdge,
  CycleFinding,
  OrphanFinding,
  TestCoverageMapping,
  DocDriftFinding,
} from "./types.js";
export { WORK_STATE_VERSION, PROJECT_MODEL_VERSION } from "./types.js";
export { builtinChecks } from "./checks/index.js";
export { runChecks } from "./core/runner.js";
export { createProjectContext } from "./core/project.js";
export { buildProjectModel } from "./core/model.js";
export { takeProjectSounding } from "./core/sounding.js";
export { classifyFile, buildSemanticMap } from "./core/semantic-map.js";
export { inferObjective, readGitSignals } from "./core/intent.js";
export { inferCompletions, tagFindings, buildExplanation } from "./core/completion.js";
export { extractSourceSymbols } from "./core/ast.js";
export { buildArchitectureGraph, detectCyclicDependencies, detectOrphanedModules, findDependents } from "./core/graph.js";
export { checkDocumentationDrift, checkTestCoverageRelationships, checkDependencyRelationships } from "./core/cross-artifacts.js";
export { FathomMCPServer } from "./mcp/server.js";
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
