import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

export async function gitChangedFiles(root: string): Promise<string[]> {
  try {
    const { stdout } = await execFileAsync(
      "git",
      ["status", "--porcelain"],
      { cwd: root },
    );
    return stdout
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => line.replace(/^[MADRCU?!\s]{1,2}\s+/, "").replace(/^.* -> /, ""));
  } catch {
    return [];
  }
}

export async function gitDiffStat(root: string): Promise<string[]> {
  try {
    const { stdout } = await execFileAsync(
      "git",
      ["diff", "--stat", "HEAD"],
      { cwd: root },
    );
    return stdout
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter(Boolean);
  } catch {
    return [];
  }
}

export async function gitIsRepo(root: string): Promise<boolean> {
  try {
    await execFileAsync("git", ["rev-parse", "--is-inside-work-tree"], {
      cwd: root,
    });
    return true;
  } catch {
    return false;
  }
}
