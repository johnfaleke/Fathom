import type { Check, Finding, ProjectContext } from "../types.js";

/** Detects env reads: dot form and bracket form on process env. */
const ENV_ACCESS =
  /process\.env(?:\.([A-Z][A-Z0-9_]*)|\[["']([A-Z][A-Z0-9_]*)["']\])/g;

const CODE_EXT = /\.(?:[cm]?[jt]sx?|mjs|cjs)$/;

export const envVarCheck: Check = {
  id: "config.env-var-missing",
  async run(ctx: ProjectContext): Promise<Finding[]> {
    const used = new Map<string, Set<string>>();

    for (const file of ctx.files) {
      if (!CODE_EXT.test(file)) continue;
      if (file.includes(".test.") || file.includes(".spec.")) continue;

      const text = await ctx.readText(file);
      if (!text) continue;

      for (const match of text.matchAll(ENV_ACCESS)) {
        const name = match[1] ?? match[2];
        if (!name) continue;
        if (!used.has(name)) used.set(name, new Set());
        used.get(name)!.add(file);
      }
    }

    if (used.size === 0) return [];

    const example = await ctx.readText(".env.example");
    const documented = parseEnvKeys(example ?? "");

    const findings: Finding[] = [];

    for (const [name, files] of used) {
      if (documented.has(name)) continue;

      const fileList = [...files].sort();
      findings.push({
        id: "config.env-var-missing",
        category: "configuration",
        severity: "warning",
        message: `${name} is used in code but missing from .env.example`,
        evidence: [
          {
            kind: "env-usage",
            detail: `Referenced in ${fileList.length} file(s)`,
            path: fileList[0],
          },
          ...fileList.slice(0, 5).map((path) => ({
            kind: "source",
            path,
            detail: `process.env.${name}`,
          })),
          {
            kind: "missing-doc",
            path: ".env.example",
            detail: example === null
              ? ".env.example does not exist"
              : `${name} is not listed in .env.example`,
          },
        ],
      });
    }

    return findings;
  },
};

function parseEnvKeys(contents: string): Set<string> {
  const keys = new Set<string>();
  for (const line of contents.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    const key = (eq === -1 ? trimmed : trimmed.slice(0, eq)).trim();
    if (/^[A-Za-z_][A-Za-z0-9_]*$/.test(key)) keys.add(key);
  }
  return keys;
}
