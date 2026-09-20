import type { Finding, WorkState } from "../types.js";

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

  if (files.length === 0 && summary.length === 0) {
    lines.push("No local changes detected.");
    return lines.join("\n") + "\n";
  }

  lines.push("FILES");
  for (const f of files.slice(0, 30)) lines.push(`~ ${f}`);
  if (files.length > 30) lines.push(`… and ${files.length - 30} more`);
  lines.push("");

  if (summary.length) {
    lines.push("GIT STAT");
    for (const s of summary) lines.push(s);
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
