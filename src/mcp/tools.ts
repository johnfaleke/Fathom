import path from "node:path";
import { builtinChecks } from "../checks/index.js";
import { gitChangedFiles, gitDiffStat, gitIsRepo } from "../core/git.js";
import { buildProjectModel } from "../core/model.js";
import { createProjectContext } from "../core/project.js";
import { runChecks } from "../core/runner.js";
import {
  applyFindings,
  isInitialized,
  loadConfig,
  loadProjectModel,
  loadState,
  saveProjectModel,
  saveState,
  appendEvent,
} from "../core/storage.js";
import type { WorkItem } from "../types.js";

export interface MCPToolDefinition {
  name: string;
  description: string;
  inputSchema: {
    type: "object";
    properties?: Record<string, unknown>;
    required?: string[];
  };
}

export const MCP_TOOLS: MCPToolDefinition[] = [
  {
    name: "fathom_status",
    description:
      "Get current project Work State, active tasks, completed/remaining items, deterministic findings with evidence, and git change impact.",
    inputSchema: {
      type: "object",
      properties: {},
    },
  },
  {
    name: "fathom_scan",
    description:
      "Scan repository files and manifests to build an evidence-backed Project Model with stack detection and confidence-scored claims in .fathom/model.json.",
    inputSchema: {
      type: "object",
      properties: {},
    },
  },
  {
    name: "fathom_check",
    description:
      "Run deterministic cross-artifact checks (e.g. missing environment variables in .env.example, undeclared dependencies in package.json).",
    inputSchema: {
      type: "object",
      properties: {},
    },
  },
  {
    name: "fathom_set_work",
    description:
      "Update project Work State with active task intent, completed items, and remaining items.",
    inputSchema: {
      type: "object",
      properties: {
        currentWork: {
          type: "string",
          description: "Description of the active work or goal currently in progress",
        },
        completed: {
          type: "array",
          items: { type: "string" },
          description: "List of completed tasks or milestones to add",
        },
        incomplete: {
          type: "array",
          items: { type: "string" },
          description: "List of remaining or follow-up tasks to add",
        },
      },
    },
  },
  {
    name: "fathom_diff",
    description:
      "Get semantic project-level diff grouped by area (Source, Tests, Docs, Config) and git stat summary.",
    inputSchema: {
      type: "object",
      properties: {},
    },
  },
  {
    name: "fathom_get_model",
    description:
      "Retrieve the durable Project Model (.fathom/model.json) containing indexed files, observations, and claims.",
    inputSchema: {
      type: "object",
      properties: {},
    },
  },
];

export async function executeMCPTool(
  root: string,
  toolName: string,
  args: Record<string, unknown> = {},
): Promise<{ content: Array<{ type: "text"; text: string }>; isError?: boolean }> {
  const absRoot = path.resolve(root);

  if (!(await isInitialized(absRoot))) {
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify({
            error: "Fathom is not initialized in this workspace. Run fathom init first.",
          }),
        },
      ],
      isError: true,
    };
  }

  try {
    const config = await loadConfig(absRoot);

    switch (toolName) {
      case "fathom_status": {
        const ctx = await createProjectContext(absRoot, config);
        const findings = await runChecks(ctx, builtinChecks);
        const changed = await gitChangedFiles(absRoot);
        let state = await loadState(absRoot);
        state = applyFindings(state, findings);
        state.changes = {
          filesChanged: changed.length,
          summary: changed.slice(0, 20).map((f) => `~ ${f}`),
        };
        await saveState(absRoot, state);
        return {
          content: [{ type: "text", text: JSON.stringify(state, null, 2) }],
        };
      }

      case "fathom_scan": {
        const ctx = await createProjectContext(absRoot, config);
        const model = await buildProjectModel(ctx);
        await saveProjectModel(absRoot, model);
        await appendEvent(absRoot, {
          type: "scan",
          at: new Date().toISOString(),
          files: model.project.files,
          claims: model.claims.length,
        });
        return {
          content: [{ type: "text", text: JSON.stringify(model, null, 2) }],
        };
      }

      case "fathom_check": {
        const ctx = await createProjectContext(absRoot, config);
        const findings = await runChecks(ctx, builtinChecks);
        let state = await loadState(absRoot);
        state = applyFindings(state, findings);
        await saveState(absRoot, state);
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(
                {
                  findings,
                  attention: state.attention,
                  findingsCount: findings.length,
                },
                null,
                2,
              ),
            },
          ],
        };
      }

      case "fathom_set_work": {
        let state = await loadState(absRoot);
        if (typeof args.currentWork === "string") {
          state.currentWork = args.currentWork;
        }
        if (Array.isArray(args.completed)) {
          const titles = args.completed.filter((t): t is string => typeof t === "string");
          state.completed = mergeWorkItems(state.completed, titles, "completed");
        }
        if (Array.isArray(args.incomplete)) {
          const titles = args.incomplete.filter((t): t is string => typeof t === "string");
          state.incomplete = mergeWorkItems(state.incomplete, titles, "incomplete");
        }
        await saveState(absRoot, state);
        await appendEvent(absRoot, {
          type: "set_work",
          at: new Date().toISOString(),
          currentWork: state.currentWork,
          completedCount: state.completed.length,
          incompleteCount: state.incomplete.length,
        });
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(
                {
                  success: true,
                  currentWork: state.currentWork,
                  completed: state.completed,
                  incomplete: state.incomplete,
                },
                null,
                2,
              ),
            },
          ],
        };
      }

      case "fathom_diff": {
        if (!(await gitIsRepo(absRoot))) {
          return {
            content: [{ type: "text", text: JSON.stringify({ error: "Not a git repository." }) }],
            isError: true,
          };
        }
        const files = await gitChangedFiles(absRoot);
        const summary = await gitDiffStat(absRoot);
        return {
          content: [{ type: "text", text: JSON.stringify({ files, summary }, null, 2) }],
        };
      }

      case "fathom_get_model": {
        try {
          const model = await loadProjectModel(absRoot);
          return {
            content: [{ type: "text", text: JSON.stringify(model, null, 2) }],
          };
        } catch {
          return {
            content: [
              {
                type: "text",
                text: JSON.stringify({
                  error: "Project Model not found. Run fathom_scan first to build model.json.",
                }),
              },
            ],
            isError: true,
          };
        }
      }

      default:
        return {
          content: [{ type: "text", text: JSON.stringify({ error: `Unknown tool: ${toolName}` }) }],
          isError: true,
        };
    }
  } catch (error) {
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify({ error: error instanceof Error ? error.message : String(error) }),
        },
      ],
      isError: true,
    };
  }
}

function mergeWorkItems(
  current: WorkItem[],
  nextTitles: string[],
  status: "completed" | "incomplete",
): WorkItem[] {
  const clean = nextTitles.map((t) => t.trim()).filter(Boolean);
  const seen = new Set<string>();
  const merged: WorkItem[] = [];

  for (const item of current) {
    const key = item.title.trim().toLowerCase();
    if (!seen.has(key) && item.status === status) {
      seen.add(key);
      merged.push(item);
    }
  }

  for (const title of clean) {
    const key = title.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    merged.push({
      id: `${status}-${title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`,
      title,
      status,
    });
  }

  return merged;
}
