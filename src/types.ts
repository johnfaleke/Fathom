/** Work State schema v0.1 — format first, CLI second. */

export const WORK_STATE_VERSION = 1 as const;

export type Severity = "info" | "warning" | "potential";

export interface Evidence {
  kind: string;
  path?: string;
  detail: string;
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
