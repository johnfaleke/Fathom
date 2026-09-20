import type { Claim, Evidence, Observation, ProjectContext, ProjectModel } from "../types.js";
import { PROJECT_MODEL_VERSION } from "../types.js";

export async function buildProjectModel(ctx: ProjectContext): Promise<ProjectModel> {
  const observations: Observation[] = [];
  const evidence: Evidence[] = [];
  const packageJson = await readPackageManifest(ctx);
  const dependencies = packageJson ? dependencyNames(packageJson) : [];
  const stack = detectStack(ctx.files, dependencies);

  observations.push({
    id: "project.files",
    kind: "file",
    subject: "project",
    detail: `${ctx.files.length} files are visible to Fathom`,
    evidence: [{ kind: "filesystem", detail: `${ctx.files.length} files found` }],
  });

  if (packageJson) {
    const packageEvidence = [{ kind: "manifest", path: "package.json", detail: "package manifest was read" }];
    observations.push({
      id: "project.package-manifest",
      kind: "manifest",
      subject: "project",
      detail: `package manifest declares ${dependencies.length} dependencies`,
      evidence: packageEvidence,
    });
    evidence.push(...packageEvidence);
  }

  const claims: Claim[] = [
    {
      id: "project.stack",
      subject: "project",
      predicate: "uses",
      object: stack.length ? stack.join(", ") : "an unidentified stack",
      confidence: stack.length ? 0.95 : 0.35,
      evidence: observations.flatMap((observation) => observation.evidence),
    },
  ];

  return {
    version: PROJECT_MODEL_VERSION,
    generatedAt: new Date().toISOString(),
    root: ctx.root,
    project: {
      name: packageJson && typeof packageJson.name === "string" ? packageJson.name : null,
      files: ctx.files.length,
      stack,
      dependencies,
    },
    observations,
    claims,
  };
}

async function readPackageManifest(ctx: ProjectContext): Promise<Record<string, unknown> | null> {
  const raw = await ctx.readText("package.json");
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as unknown;
    return parsed && typeof parsed === "object" ? parsed as Record<string, unknown> : null;
  } catch {
    return null;
  }
}

function dependencyNames(manifest: Record<string, unknown>): string[] {
  const names = new Set<string>();
  for (const field of ["dependencies", "devDependencies", "peerDependencies"]) {
    const value = manifest[field];
    if (!value || typeof value !== "object") continue;
    for (const name of Object.keys(value)) names.add(name);
  }
  return [...names].sort();
}

function detectStack(files: string[], dependencies: string[]): string[] {
  const stack = new Set<string>();
  if (files.some((file) => file.endsWith(".ts") || file.endsWith(".tsx"))) stack.add("TypeScript");
  if (files.some((file) => file.endsWith(".js") || file.endsWith(".jsx"))) stack.add("JavaScript");
  if (dependencies.includes("react")) stack.add("React");
  if (dependencies.includes("next")) stack.add("Next.js");
  if (dependencies.includes("express")) stack.add("Express");
  return [...stack];
}
