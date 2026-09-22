import path from "node:path";
import type { SemanticDomain, SemanticDomainGroup, SemanticFileEntry } from "../types.js";

const DOMAIN_LABELS: Record<SemanticDomain, string> = {
  api: "API & Webhooks",
  database: "Database & Storage",
  logic: "Business Logic & Core",
  config: "Configuration & Environment",
  tests: "Tests & Verification",
  docs: "Documentation",
  tooling: "Tooling & CI/CD",
};

export function classifyFile(relPath: string, status?: SemanticFileEntry["status"]): SemanticFileEntry {
  const norm = relPath.split(path.sep).join("/").toLowerCase();
  const base = path.basename(norm);

  // Tests
  if (
    norm.includes("/tests/") ||
    norm.startsWith("tests/") ||
    norm.includes("/__tests__/") ||
    norm.includes("/spec/") ||
    norm.includes(".test.") ||
    norm.includes(".spec.")
  ) {
    let role = "Test suite";
    if (base.includes("e2e")) role = "End-to-end test";
    else if (base.includes("integration")) role = "Integration test";
    else if (base.includes("unit")) role = "Unit test";
    return { path: relPath, domain: "tests", role, status };
  }

  // Documentation
  if (
    norm.endsWith(".md") ||
    norm.startsWith("docs/") ||
    norm.includes("/docs/") ||
    base === "llms.txt" ||
    base === "license" ||
    base === "changelog"
  ) {
    let role = "Documentation";
    if (base === "readme.md") role = "Project README";
    else if (base === "llms.txt") role = "AI context manifest";
    return { path: relPath, domain: "docs", role, status };
  }

  // Database & Storage
  if (
    norm.includes("migration") ||
    norm.includes("prisma") ||
    norm.includes("drizzle") ||
    norm.includes("schema") ||
    norm.includes("/models/") ||
    norm.includes("/entities/") ||
    norm.includes("/db/") ||
    norm.includes("/database/") ||
    norm.endsWith(".sql")
  ) {
    let role = "Database artifact";
    if (norm.includes("migration") || norm.endsWith(".sql")) role = "Database migration";
    else if (norm.includes("schema")) role = "Schema definition";
    else if (norm.includes("model") || norm.includes("entity")) role = "Data model";
    return { path: relPath, domain: "database", role, status };
  }

  // API & Webhooks
  if (
    norm.includes("webhook") ||
    norm.includes("/api/") ||
    norm.startsWith("api/") ||
    norm.includes("/routes/") ||
    norm.includes("/controllers/") ||
    norm.includes("/handlers/") ||
    norm.includes("/endpoints/") ||
    norm.includes("trpc") ||
    norm.includes("graphql")
  ) {
    let role = "API route";
    if (norm.includes("webhook")) role = "Webhook receiver";
    else if (norm.includes("controller")) role = "Request controller";
    else if (norm.includes("handler")) role = "Route handler";
    return { path: relPath, domain: "api", role, status };
  }

  // Configuration
  if (
    base.startsWith(".env") ||
    base.includes("config") ||
    base.includes("settings") ||
    base === "package.json" ||
    base === "tsconfig.json" ||
    norm.startsWith(".fathom/")
  ) {
    let role = "Configuration";
    if (base.startsWith(".env")) role = "Environment variables";
    else if (base === "package.json") role = "Package manifest";
    else if (base === "tsconfig.json") role = "TypeScript config";
    return { path: relPath, domain: "config", role, status };
  }

  // Tooling & CI/CD
  if (
    norm.startsWith(".github/") ||
    norm.startsWith("scripts/") ||
    base.includes("docker") ||
    base.includes("rollup") ||
    base.includes("vite") ||
    base.includes("webpack")
  ) {
    let role = "Tooling & CI/CD";
    if (norm.includes("workflow")) role = "GitHub Actions workflow";
    else if (norm.startsWith("scripts/")) role = "Utility script";
    return { path: relPath, domain: "tooling", role, status };
  }

  // Business Logic & Core Default
  let role = "Application logic";
  if (norm.includes("/services/")) role = "Service layer";
  else if (norm.includes("/components/")) role = "UI component";
  else if (norm.includes("/utils/") || norm.includes("/lib/")) role = "Utility module";
  else if (norm.includes("/mcp/")) role = "MCP server module";

  return { path: relPath, domain: "logic", role, status };
}

export function buildSemanticMap(files: Array<{ path: string; status?: SemanticFileEntry["status"] }>): SemanticDomainGroup[] {
  const domainOrder: SemanticDomain[] = ["api", "database", "logic", "config", "tests", "docs", "tooling"];
  const grouped = new Map<SemanticDomain, SemanticFileEntry[]>();

  for (const domain of domainOrder) {
    grouped.set(domain, []);
  }

  for (const file of files) {
    const entry = classifyFile(file.path, file.status);
    const list = grouped.get(entry.domain) ?? [];
    list.push(entry);
    grouped.set(entry.domain, list);
  }

  const result: SemanticDomainGroup[] = [];
  for (const domain of domainOrder) {
    const list = grouped.get(domain) ?? [];
    if (list.length > 0) {
      result.push({
        domain,
        label: DOMAIN_LABELS[domain],
        files: list,
        count: list.length,
      });
    }
  }

  return result;
}
