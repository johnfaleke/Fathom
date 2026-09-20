import { builtinModules } from "node:module";
import type { Check, Finding, ProjectContext } from "../types.js";

const NODE_BUILTINS = new Set(
  builtinModules.flatMap((m) => (m.startsWith("node:") ? [m.slice(5)] : [m])),
);

const IMPORT_FROM =
  /(?:import|export)\s+(?:[\s\S]*?\s+from\s+)?["']([^"']+)["']/g;
const REQUIRE_CALL = /require\s*\(\s*["']([^"']+)["']\s*\)/g;
const DYNAMIC_IMPORT = /import\s*\(\s*["']([^"']+)["']\s*\)/g;

const CODE_EXT = /\.(?:[cm]?[jt]sx?|mjs|cjs)$/;

export const dependencyCheck: Check = {
  id: "deps.undeclared-import",
  async run(ctx: ProjectContext): Promise<Finding[]> {
    const pkgRaw = await ctx.readText("package.json");
    if (!pkgRaw) return [];

    let pkg: {
      dependencies?: Record<string, string>;
      devDependencies?: Record<string, string>;
      peerDependencies?: Record<string, string>;
      optionalDependencies?: Record<string, string>;
    };
    try {
      pkg = JSON.parse(pkgRaw);
    } catch {
      return [];
    }

    const declared = new Set([
      ...Object.keys(pkg.dependencies ?? {}),
      ...Object.keys(pkg.devDependencies ?? {}),
      ...Object.keys(pkg.peerDependencies ?? {}),
      ...Object.keys(pkg.optionalDependencies ?? {}),
    ]);

    const used = new Map<string, Set<string>>();

    for (const file of ctx.files) {
      if (!CODE_EXT.test(file)) continue;
      const text = await ctx.readText(file);
      if (!text) continue;

      const specs = [
        ...matchAll(text, IMPORT_FROM),
        ...matchAll(text, REQUIRE_CALL),
        ...matchAll(text, DYNAMIC_IMPORT),
      ];

      for (const spec of specs) {
        const name = packageName(spec);
        if (!name) continue;
        if (!used.has(name)) used.set(name, new Set());
        used.get(name)!.add(file);
      }
    }

    const findings: Finding[] = [];

    for (const [name, files] of used) {
      if (declared.has(name)) continue;

      const fileList = [...files].sort();
      findings.push({
        id: "deps.undeclared-import",
        category: "dependencies",
        severity: "warning",
        message: `${name} is imported but not declared in package.json`,
        evidence: [
          {
            kind: "import",
            detail: `Imported in ${fileList.length} file(s)`,
            path: fileList[0],
          },
          ...fileList.slice(0, 5).map((path) => ({
            kind: "source",
            path,
            detail: `import of "${name}"`,
          })),
          {
            kind: "manifest",
            path: "package.json",
            detail: `${name} is not in dependencies / devDependencies`,
          },
        ],
      });
    }

    return findings;
  },
};

function matchAll(text: string, re: RegExp): string[] {
  const out: string[] = [];
  const copy = new RegExp(re.source, re.flags.includes("g") ? re.flags : re.flags + "g");
  for (const m of text.matchAll(copy)) {
    if (m[1]) out.push(m[1]);
  }
  return out;
}

function packageName(spec: string): string | null {
  if (
    spec.startsWith(".") ||
    spec.startsWith("/") ||
    spec.startsWith("node:") ||
    spec.startsWith("#")
  ) {
    return null;
  }
  if (spec.startsWith("@")) {
    const parts = spec.split("/");
    if (parts.length < 2) return null;
    return `${parts[0]}/${parts[1]}`;
  }
  const name = spec.split("/")[0] ?? null;
  if (!name || NODE_BUILTINS.has(name)) return null;
  return name;
}
