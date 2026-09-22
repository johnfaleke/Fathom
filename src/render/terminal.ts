import type { AIInterpretationResult } from "../ai/provider.js";
import type { SafeAIContext } from "../ai/context.js";
import type { Finding, FindingExplanation, ProjectSounding, WorkState } from "../types.js";

export function renderInterpretation(result: AIInterpretationResult, context: SafeAIContext): string {
  const lines = [
    "FATHOM INTERPRETATION",
    "",
    `Provider: ${result.provider}`,
    `Confidence: ${Math.round(result.confidence * 100)}%`,
    "",
    result.summary,
    "",
  ];
  if (result.notes.length) {
    lines.push("Notes:");
    for (const note of result.notes) lines.push(`  • ${note}`);
    lines.push("");
  }
  lines.push(`Context: ${Object.keys(context.files).length} included, ${context.excluded.length} excluded`);
  return lines.join("\n") + "\n";
}

export function renderFindings(findings: Finding[]): string {
  if (findings.length === 0) {
    return "No inconsistencies found.\n";
  }

  const lines: string[] = [
    `FATHOM CHECK`,
    ``,
    `${findings.length} finding(s).`,
    ``,
  ];

  for (const f of findings) {
    const mark = f.severity === "potential" ? "○" : "⚠";
    lines.push(`${mark} ${titleCase(f.category)}`);
    lines.push(wrapMessage(f.message));
    for (const e of f.evidence.slice(0, 3)) {
      const loc = e.path ? `  ${e.path}: ` : "  ";
      lines.push(`${loc}${e.detail}`);
    }
    lines.push("");
  }

  const attention = findings.filter((f) => f.severity !== "info").length;
  lines.push(`${attention} thing(s) may require attention.`);
  return lines.join("\n") + "\n";
}

export function renderStatus(state: WorkState): string {
  const lines: string[] = [
    `FATHOM STATUS`,
    ``,
    `Current work: ${state.currentWork ?? "(not set)"}`,
    `Progress: ${state.completed.length} complete, ${state.incomplete.length} remaining`,
    ``,
  ];

  if (state.completed.length) {
    lines.push("Completed:");
    for (const item of state.completed) lines.push(`  ✓ ${item.title}`);
    lines.push("");
  }

  if (state.incomplete.length) {
    lines.push("Remaining:");
    for (const item of state.incomplete) lines.push(`  • ${item.title}`);
    lines.push("");
  }

  if (state.findings.length) {
    lines.push("Findings:");
    for (const f of state.findings.slice(0, 10)) {
      lines.push(`  ⚠ ${f.message}`);
    }
    lines.push("");
  }

  lines.push("Changes:");
  lines.push(`  ${state.changes.filesChanged} file(s) changed`);
  for (const s of state.changes.summary.slice(0, 8)) {
    lines.push(`  ${s}`);
  }
  lines.push("");
  lines.push("Attention:");
  lines.push(
    state.attention === 0
      ? "  Nothing needs review."
      : `  ${state.attention} thing(s) are worth reviewing.`,
  );

  return lines.join("\n") + "\n";
}

export function renderDiff(summary: string[], files: string[]): string {
  const lines: string[] = [`FATHOM DIFF`, ``];

  const cleanFiles = files.filter((file) => !file.startsWith(".fathom/") && file !== ".env.example");

  if (cleanFiles.length === 0 && summary.length === 0) {
    lines.push("No local changes detected.");
    return lines.join("\n") + "\n";
  }

  const groups = groupFilesByArea(cleanFiles);

  if (groups.length > 0) {
    lines.push("Project impact:");
    for (const group of groups) {
      lines.push(`  ${group.label}: ${group.items.join(", ")}`);
    }
    lines.push("");
  }

  lines.push("Files:");
  for (const f of cleanFiles.slice(0, 30)) lines.push(`  ~ ${f}`);
  if (cleanFiles.length > 30) lines.push(`  … and ${cleanFiles.length - 30} more`);
  lines.push("");

  if (summary.length) {
    lines.push("Git stat:");
    for (const s of summary) lines.push(`  ${s}`);
  }

  return lines.join("\n") + "\n";
}

function groupFilesByArea(files: string[]): Array<{ label: string; items: string[] }> {
  const buckets = new Map<string, string[]>();

  for (const file of files) {
    let label = "Other";
    if (file.startsWith("src/")) label = "Source";
    else if (file.startsWith("test") || file.includes("test")) label = "Tests";
    else if (file.endsWith("README.md") || file.endsWith(".md")) label = "Docs";
    else if (file.includes("config") || file.endsWith(".json") || file.endsWith(".yaml") || file.endsWith(".yml")) label = "Config";

    const list = buckets.get(label) ?? [];
    list.push(file);
    buckets.set(label, list);
  }

  return [...buckets.entries()].map(([label, items]) => ({ label, items: items.slice(0, 3) }));
}

export function renderGitHubAnnotations(findings: Finding[]): string {
  if (findings.length === 0) return "";
  const lines: string[] = [];

  for (const f of findings) {
    const level = f.severity === "potential" ? "notice" : f.severity === "warning" ? "warning" : "notice";
    const primaryEvidence = f.evidence.find((e) => Boolean(e.path));
    const filePath = primaryEvidence?.path;
    const title = titleCase(f.category);

    const fileAttr = filePath ? ` file=${filePath},` : " ";
    lines.push(`::${level}${fileAttr}title=${title}::${f.message.replace(/\r?\n/g, " ")}`);
  }

  return lines.join("\n") + "\n";
}

export function renderMarkdownSummary(
  state: WorkState,
  findings: Finding[],
  interpretation?: AIInterpretationResult,
): string {
  const lines: string[] = [
    `# Fathom Report`,
    ``,
    `| Metric | Status |`,
    `| --- | --- |`,
    `| **Current Work** | ${state.currentWork ?? "*(not set)*"} |`,
    `| **Completed** | ${state.completed.length} |`,
    `| **Remaining** | ${state.incomplete.length} |`,
    `| **Attention Items** | ${state.attention} |`,
    `| **Changed Files** | ${state.changes.filesChanged} |`,
    ``,
  ];

  if (findings.length > 0) {
    lines.push(`## Findings (${findings.length})`, ``, `| Severity | Check ID | Message | Evidence |`, `| --- | --- | --- | --- |`);
    for (const f of findings) {
      const badge = f.severity === "warning" ? "⚠️ Warning" : f.severity === "potential" ? "🔍 Potential" : "ℹ️ Info";
      const ev = f.evidence.map((e) => (e.path ? `\`${e.path}\`: ${e.detail}` : e.detail)).join("<br/>");
      lines.push(`| ${badge} | \`${f.id}\`<br/>*${titleCase(f.category)}* | ${f.message} | ${ev || "—"} |`);
    }
    lines.push(``);
  } else {
    lines.push(`> ✅ **No inconsistencies found across project wiring.**`, ``);
  }

  if (interpretation) {
    lines.push(
      `## AI Interpretation (${interpretation.provider})`,
      ``,
      `> **Confidence:** ${Math.round(interpretation.confidence * 100)}%`,
      ``,
      interpretation.summary,
      ``,
    );
    if (interpretation.notes.length > 0) {
      lines.push(`### Key Notes:`);
      for (const note of interpretation.notes) {
        lines.push(`- ${note}`);
      }
      lines.push(``);
    }
  }

  return lines.join("\n") + "\n";
}

export function renderSounding(sounding: ProjectSounding): string {
  const lines: string[] = [
    "FATHOM / SOUNDING",
    "────────────────────────────────────────────────────────────",
    "",
    "OBJECTIVE",
    sounding.objective.title,
    `Confidence: ${Math.round(sounding.objective.confidence * 100)}%`,
  ];

  if (sounding.objective.evidence.length > 0) {
    lines.push("Evidence:");
    for (const ev of sounding.objective.evidence) {
      lines.push(`  • ${ev}`);
    }
  }
  lines.push("");

  if (sounding.semanticMap.length > 0) {
    lines.push("SEMANTIC MAP");
    for (const group of sounding.semanticMap) {
      lines.push(`${group.label} (${group.count} file${group.count > 1 ? "s" : ""})`);
      for (const f of group.files.slice(0, 4)) {
        const roleStr = f.role ? ` (${f.role})` : "";
        lines.push(`  + ${f.path}${roleStr}`);
      }
      if (group.files.length > 4) {
        lines.push(`  … and ${group.files.length - 4} more`);
      }
    }
    lines.push("");
  }

  if (sounding.likelyComplete.length > 0) {
    lines.push("LIKELY COMPLETE");
    for (const item of sounding.likelyComplete) {
      lines.push(`✓ ${item.title}`);
    }
    lines.push("");
  }

  if (sounding.needsAttention.length > 0) {
    lines.push("NEEDS ATTENTION");
    for (const f of sounding.needsAttention) {
      const mark = f.severity === "potential" ? "○" : "⚠";
      lines.push(`${mark} [${f.code}] ${f.message}`);
      for (const e of f.evidence.slice(0, 2)) {
        const loc = e.path ? `      ${e.path}: ` : "      ";
        lines.push(`${loc}${e.detail}`);
      }
    }
    lines.push("");
    lines.push("Run `fathom explain <id>` to inspect deterministic evidence.");
    lines.push("");
  } else {
    lines.push("NEEDS ATTENTION");
    lines.push("  Nothing requires immediate attention.");
    lines.push("");
  }

  lines.push("PROJECT DRIFT");
  lines.push(
    `  ${sounding.projectDrift.inconsistenciesCount} finding(s) · ${sounding.projectDrift.filesChangedCount} file(s) tracked/changed · ${sounding.projectDrift.commitCount} commit(s)`,
  );

  return lines.join("\n") + "\n";
}

export function renderExplanation(exp: FindingExplanation): string {
  const lines: string[] = [
    `EVIDENCE REPORT: [${exp.code}]`,
    "────────────────────────────────────────────────────────────",
    "",
    "Finding:",
    `  ${exp.title}`,
    "",
    "Category:",
    `  ${titleCase(exp.category)} · Severity: ${exp.severity.toUpperCase()}`,
    "",
    "Claim:",
    `  ${exp.claim}`,
    "",
    "Evidence Coordinates:",
  ];

  for (const e of exp.evidence) {
    const loc = e.path ? `  • ${e.path}: ` : "  • ";
    lines.push(`${loc}${e.detail}`);
  }
  lines.push("");

  lines.push("Risk Assessment:");
  lines.push(`  ${exp.riskLevel.toUpperCase()} — ${exp.riskDescription}`);
  lines.push("");

  lines.push("Provenance:");
  lines.push(`  ${exp.provenance}`);

  return lines.join("\n") + "\n";
}

export function renderArchitectureGraph(graph: any, filterDomain?: string): string {
  const lines: string[] = [
    "FATHOM / ARCHITECTURE GRAPH",
    "────────────────────────────────────────────────────────────",
    "",
    `Modules: ${graph.metrics.totalModules} · Edges: ${graph.metrics.totalEdges}`,
    "",
  ];

  // Group nodes by domain
  const domainBuckets = new Map<string, any[]>();
  for (const node of graph.nodes) {
    if (filterDomain && node.domain !== filterDomain && node.type !== "package") {
      continue;
    }
    const bucketKey = node.domain ? titleCase(node.domain) : node.type === "package" ? "External Packages" : "Other";
    const list = domainBuckets.get(bucketKey) || [];
    list.push(node);
    domainBuckets.set(bucketKey, list);
  }

  for (const [domainLabel, nodes] of domainBuckets.entries()) {
    lines.push(`${domainLabel} (${nodes.length})`);
    for (const node of nodes.slice(0, 8)) {
      const outEdges = graph.edges.filter((e: any) => e.from === node.id);
      const outSummary = outEdges.length > 0 ? ` -> [${outEdges.map((e: any) => e.to.split("/").pop()).slice(0, 3).join(", ")}${outEdges.length > 3 ? "..." : ""}]` : "";
      lines.push(`  • ${node.id}${outSummary}`);
    }
    if (nodes.length > 8) {
      lines.push(`  … and ${nodes.length - 8} more`);
    }
    lines.push("");
  }

  // Cycles
  lines.push("CYCLIC DEPENDENCY CHECK");
  if (graph.metrics.cycles.length === 0) {
    lines.push("  ✓ 0 circular dependencies detected.");
  } else {
    for (const c of graph.metrics.cycles) {
      lines.push(`  ⚠ Cycle: ${c.cycle.join(" -> ")}`);
    }
  }
  lines.push("");

  // Orphans
  if (graph.metrics.orphans.length > 0) {
    lines.push("ORPHANED MODULES");
    for (const o of graph.metrics.orphans.slice(0, 5)) {
      lines.push(`  ○ ${o.filePath} (${o.domain})`);
    }
    if (graph.metrics.orphans.length > 5) {
      lines.push(`  … and ${graph.metrics.orphans.length - 5} more`);
    }
    lines.push("");
  }

  return lines.join("\n") + "\n";
}

function titleCase(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function wrapMessage(message: string): string {
  return message
    .split(/(?<=\.)\s+/)
    .map((part) => part.trim())
    .filter(Boolean)
    .join("\n");
}

