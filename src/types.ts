/** Work State schema v0.1 — format first, CLI second. */

export const WORK_STATE_VERSION = 1 as const;
export const PROJECT_MODEL_VERSION = 1 as const;

export type Severity = "info" | "warning" | "potential";

export interface Evidence {
  kind: string;
  path?: string;
  detail: string;
}

export interface Observation {
  id: string;
  kind: "file" | "manifest" | "dependency" | "configuration";
  subject: string;
  detail: string;
  evidence: Evidence[];
}

export interface Claim {
  id: string;
  subject: string;
  predicate: string;
  object: string;
  confidence: number;
  evidence: Evidence[];
}

export interface ProjectModel {
  version: typeof PROJECT_MODEL_VERSION;
  generatedAt: string;
  root: string;
  project: {
    name: string | null;
    files: number;
    stack: string[];
    dependencies: string[];
  };
  observations: Observation[];
  claims: Claim[];
}

export interface Finding {
  id: string;
  category: string;
  severity: Severity;
  message: string;
  evidence: Evidence[];
}

export interface Check {
  id: string;
  run(ctx: ProjectContext): Promise<Finding[]>;
}

export interface ProjectContext {
  root: string;
  fathomDir: string;
  files: string[];
  readText(relPath: string): Promise<string | null>;
  exists(relPath: string): Promise<boolean>;
}

export interface WorkItem {
  id: string;
  title: string;
  status: "completed" | "incomplete" | "unknown";
}

export interface WorkState {
  version: typeof WORK_STATE_VERSION;
  updatedAt: string;
  root: string;
  currentWork: string | null;
  completed: WorkItem[];
  incomplete: WorkItem[];
  findings: Finding[];
  changes: {
    filesChanged: number;
    summary: string[];
  };
  attention: number;
}

export interface WorkStateSnapshot extends WorkState {
  schema: "fathom.work-state";
  generatedBy: "fathom";
}

export interface FathomConfig {
  version: 1;
  ignore: string[];
  ai?: {
    enabled?: boolean;
    profile?: string;
    includePaths?: string[];
    maxFileBytes?: number;
    profiles?: Record<string, {
      provider: "openai" | "custom";
      model: string;
      baseUrl?: string;
      apiKeyEnv?: string;
      includePaths?: string[];
      maxFileBytes?: number;
    }>;
  };
}

export interface WorkStateSummary {
  currentWork: string | null;
  completed: WorkItem[];
  incomplete: WorkItem[];
  attention: number;
  findingsCount: number;
}

export type OutputFormat = "terminal" | "json" | "github" | "markdown";

export interface CheckOptions {
  json?: boolean;
  ai?: boolean;
  prompt?: string;
  format?: OutputFormat;
  maxAttention?: number;
  failOn?: Severity;
}

export type SemanticDomain =
  | "api"
  | "database"
  | "logic"
  | "config"
  | "tests"
  | "docs"
  | "tooling";

export interface SemanticFileEntry {
  path: string;
  domain: SemanticDomain;
  role?: string;
  status?: "added" | "modified" | "deleted" | "untracked" | "tracked";
}

export interface SemanticDomainGroup {
  domain: SemanticDomain;
  label: string;
  files: SemanticFileEntry[];
  count: number;
}

export interface InferredObjective {
  title: string;
  confidence: number;
  evidence: string[];
  domain?: string;
  source: "git" | "branch" | "files" | "manual";
}

export interface CompletionItem {
  title: string;
  confidence: number;
  evidence: string[];
  domain?: string;
}

export interface FindingWithCode extends Finding {
  code: string;
}

export interface ProjectSounding {
  generatedAt: string;
  objective: InferredObjective;
  semanticMap: SemanticDomainGroup[];
  likelyComplete: CompletionItem[];
  needsAttention: FindingWithCode[];
  projectDrift: {
    inconsistenciesCount: number;
    filesChangedCount: number;
    commitCount: number;
  };
}

export interface FindingExplanation {
  code: string;
  id: string;
  title: string;
  category: string;
  severity: Severity;
  claim: string;
  evidence: Evidence[];
  riskLevel: "high" | "medium" | "low";
  riskDescription: string;
  provenance: string;
}

// ────────────────────────────────────────────────────────────
// v0.5 — Deep Project Understanding Types
// ────────────────────────────────────────────────────────────

export interface SourceImport {
  specifier: string;
  symbols: string[];
  isDefault: boolean;
  isNamespace: boolean;
  isDynamic: boolean;
  line: number;
}

export interface SourceExport {
  name: string;
  kind: "function" | "class" | "interface" | "type" | "const" | "default" | "unknown";
  line: number;
}

export interface SourceRoute {
  method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE" | "ALL" | "USE";
  path: string;
  line: number;
}

export interface SourceSymbolSummary {
  filePath: string;
  imports: SourceImport[];
  exports: SourceExport[];
  routes: SourceRoute[];
  envVars: string[];
}

export type GraphNodeType = "file" | "package" | "route" | "config" | "test";
export type GraphEdgeType = "imports" | "exports_to" | "tested_by" | "documented_in";

export interface GraphNode {
  id: string; // relative path or package name
  label: string;
  type: GraphNodeType;
  domain?: SemanticDomain;
  exportsCount: number;
  importsCount: number;
}

export interface GraphEdge {
  from: string;
  to: string;
  type: GraphEdgeType;
  symbols?: string[];
}

export interface CycleFinding {
  cycle: string[];
  length: number;
}

export interface OrphanFinding {
  filePath: string;
  domain: SemanticDomain;
}

export interface ArchitectureGraph {
  generatedAt: string;
  root: string;
  nodes: GraphNode[];
  edges: GraphEdge[];
  metrics: {
    totalModules: number;
    totalEdges: number;
    cycles: CycleFinding[];
    orphans: OrphanFinding[];
  };
}

export interface TestCoverageMapping {
  sourceFile: string;
  testFiles: string[];
  isCovered: boolean;
}

export interface DocDriftFinding {
  symbolOrPath: string;
  sourceFile: string;
  missingInDocs: string[];
  detail: string;
}

