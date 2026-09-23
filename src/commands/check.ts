import path from "node:path";
import { builtinChecks } from "../checks/index.js";
import { createProjectContext } from "../core/project.js";
import { runChecks } from "../core/runner.js";
import {
  appendEvent,
  applyFindings,
  isInitialized,
  loadConfig,
  loadState,
  saveState,
} from "../core/storage.js";
import {
  renderFindings,
  renderGitHubAnnotations,
  renderInterpretation,
  renderMarkdownSummary,
} from "../render/terminal.js";
import type { CheckOptions, Severity } from "../types.js";
import { interpretProject } from "./interpret.js";

export async function cmdCheck(
  cwd: string,
  opts: CheckOptions = {},
): Promise<number> {
  const root = path.resolve(cwd);


  const config = await loadConfig(root);
  const ctx = await createProjectContext(root, config);
  const findings = await runChecks(ctx, builtinChecks);

  let state = await loadState(root);
  state = applyFindings(state, findings);
  await saveState(root, state);
  await appendEvent(root, {
    type: "check",
    at: new Date().toISOString(),
    findingCount: findings.length,
  });

  let interpretation;
  if (opts.ai) {
    if (config.ai?.enabled !== true) {
      const msg = "AI interpretation is not configured for this workspace.\nRun `fathom setup` first, then review the profile before using `fathom check --ai`.";
      if (opts.format === "json" || opts.json) {
        console.error(JSON.stringify({ error: msg }));
      } else {
        console.error(msg);
      }
      return 1;
    }
    try {
      interpretation = await interpretProject(root, config, opts.prompt);
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : String(error);
      if (opts.format === "json" || opts.json) {
        console.error(JSON.stringify({ error: errMsg }));
      } else {
        console.error(errMsg);
      }
      return 1;
    }
  }

  const format = opts.format ?? (opts.json ? "json" : "terminal");

  switch (format) {
    case "json":
      console.log(
        JSON.stringify(
          {
            findings,
            attention: state.attention,
            interpretation: interpretation
              ? {
                  ...interpretation.result,
                  context: {
                    filesIncluded: Object.keys(interpretation.context.files),
                    excluded: interpretation.context.excluded,
                  },
                }
              : undefined,
          },
          null,
          2,
        ),
      );
      break;
    case "github":
      process.stdout.write(renderGitHubAnnotations(findings));
      process.stdout.write(renderFindings(findings));
      if (interpretation) {
        process.stdout.write(renderInterpretation(interpretation.result, interpretation.context));
      }
      break;
    case "markdown":
      process.stdout.write(renderMarkdownSummary(state, findings, interpretation?.result));
      break;
    case "terminal":
    default:
      process.stdout.write(renderFindings(findings));
      if (interpretation) {
        process.stdout.write(renderInterpretation(interpretation.result, interpretation.context));
      }
      break;
  }

  return evaluateGating(state.attention, findings, opts);
}

function evaluateGating(attention: number, findings: Array<{ severity: Severity }>, opts: CheckOptions): number {
  if (opts.maxAttention !== undefined) {
    if (attention > opts.maxAttention) return 2;
    return 0;
  }

  if (opts.failOn) {
    const severities: Severity[] = opts.failOn === "info"
      ? ["info", "potential", "warning"]
      : opts.failOn === "potential"
      ? ["potential", "warning"]
      : ["warning"];
    return findings.some((f) => severities.includes(f.severity)) ? 2 : 0;
  }

  return findings.some((f) => f.severity === "warning") ? 2 : 0;
}
