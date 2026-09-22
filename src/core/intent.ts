import { execFile } from "node:child_process";
import { promisify } from "node:util";
import type { InferredObjective, SemanticDomainGroup } from "../types.js";

const execFileAsync = promisify(execFile);

interface GitSignals {
  branch: string | null;
  recentCommits: string[];
  changedFiles: string[];
  isClean: boolean;
}

export async function readGitSignals(cwd: string): Promise<GitSignals> {
  let branch: string | null = null;
  const recentCommits: string[] = [];
  const changedFiles: string[] = [];
  let isClean = true;

  try {
    const { stdout: branchOut } = await execFileAsync("git", ["rev-parse", "--abbrev-ref", "HEAD"], {
      cwd,
      timeout: 3000,
    });
    branch = branchOut.trim() || null;
  } catch {}

  try {
    const { stdout: logOut } = await execFileAsync("git", ["log", "-n", "8", "--pretty=format:%s"], {
      cwd,
      timeout: 3000,
    });
    const lines = logOut.split("\n").map((l) => l.trim()).filter(Boolean);
    recentCommits.push(...lines);
  } catch {}

  try {
    const { stdout: statusOut } = await execFileAsync("git", ["status", "--porcelain"], {
      cwd,
      timeout: 3000,
    });
    const lines = statusOut.split(/\r?\n/).filter(Boolean);
    if (lines.length > 0) {
      isClean = false;
      for (const line of lines) {
        const file = line.replace(/^..\s+/, "").trim();
        if (file) changedFiles.push(file);
      }
    }
  } catch {}

  return { branch, recentCommits, changedFiles, isClean };
}

export function inferObjective(
  signals: GitSignals,
  semanticMap: SemanticDomainGroup[],
  manualWork?: string | null,
): InferredObjective {
  const evidence: string[] = [];

  // If user set a manual objective explicitly, honor it with high confidence
  if (manualWork && manualWork.trim().length > 0) {
    if (signals.branch && signals.branch !== "HEAD") {
      evidence.push(`Branch: ${signals.branch}`);
    }
    if (signals.recentCommits.length > 0) {
      evidence.push(`${signals.recentCommits.length} recent commit(s) on branch`);
    }
    evidence.push(`Explicitly set in local work state`);

    return {
      title: manualWork.trim(),
      confidence: 0.98,
      evidence,
      source: "manual",
    };
  }

  // Deduce from branch name if it is a meaningful feature / fix branch
  const branch = signals.branch;
  if (branch && branch !== "main" && branch !== "master" && branch !== "HEAD" && branch !== "develop") {
    const parsed = parseBranchName(branch);
    if (parsed) {
      evidence.push(`Active branch: ${branch}`);
      if (signals.recentCommits.length > 0) {
        evidence.push(
          `${signals.recentCommits.length} recent commit(s) (latest: "${signals.recentCommits[0]}")`,
        );
      }
      const topDomains = semanticMap.map((g) => g.label).slice(0, 3);
      if (topDomains.length > 0) {
        evidence.push(`Changes across ${topDomains.join(", ")}`);
      }

      return {
        title: parsed.title,
        confidence: 0.92,
        evidence,
        domain: parsed.domain,
        source: "branch",
      };
    }
  }

  // Deduce from recent commits if available
  if (signals.recentCommits.length > 0) {
    const latest = signals.recentCommits[0];
    const cleaned = cleanCommitMessage(latest);
    evidence.push(`Recent commit: "${latest}"`);
    if (signals.recentCommits.length > 1) {
      evidence.push(`Commit history across ${signals.recentCommits.length} commits`);
    }
    const topDomains = semanticMap.map((g) => g.label).slice(0, 3);
    if (topDomains.length > 0) {
      evidence.push(`Modifications in ${topDomains.join(", ")}`);
    }

    return {
      title: cleaned,
      confidence: 0.82,
      evidence,
      source: "git",
    };
  }

  // Deduce from semantic map changed areas
  if (semanticMap.length > 0) {
    const mainGroup = semanticMap[0];
    const sampleFiles = mainGroup.files.slice(0, 2).map((f) => f.path).join(", ");
    evidence.push(`Observed activity in ${mainGroup.label}`);
    evidence.push(`Files: ${sampleFiles}`);

    return {
      title: `Workspace refinement in ${mainGroup.label}`,
      confidence: 0.65,
      evidence,
      domain: mainGroup.domain,
      source: "files",
    };
  }

  return {
    title: "General workspace maintenance",
    confidence: 0.5,
    evidence: ["No uncommitted changes or active feature branches detected"],
    source: "files",
  };
}

function parseBranchName(branch: string): { title: string; domain?: string } | null {
  // e.g. feat/stripe-billing, feature/user-auth, fix/webhook-retry, refactor/mcp-server, issue-12-payments
  const clean = branch.replace(/^(feat|feature|fix|bug|refactor|chore|perf|test|docs)\//i, "");
  const words = clean
    .replace(/^issue-\d+-?/i, "")
    .replace(/^gh-\d+-?/i, "")
    .split(/[-_/]/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase());

  if (words.length === 0) return null;

  let prefix = "";
  if (branch.startsWith("feat/") || branch.startsWith("feature/")) prefix = "Implement ";
  else if (branch.startsWith("fix/") || branch.startsWith("bug/")) prefix = "Fix ";
  else if (branch.startsWith("refactor/")) prefix = "Refactor ";

  return {
    title: `${prefix}${words.join(" ")}`,
  };
}

function cleanCommitMessage(msg: string): string {
  // e.g. "feat(billing): add stripe webhook handler" -> "Add stripe webhook handler"
  const stripped = msg.replace(/^[a-z]+(\([a-z0-9_-]+\))?:\s*/i, "");
  if (!stripped) return msg;
  return stripped.charAt(0).toUpperCase() + stripped.slice(1);
}
