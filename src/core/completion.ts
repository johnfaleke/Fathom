import type {
  CompletionItem,
  Finding,
  FindingExplanation,
  FindingWithCode,
  ProjectSounding,
  SemanticDomainGroup,
  WorkItem,
} from "../types.js";

export function tagFindings(findings: Finding[]): FindingWithCode[] {
  return findings.map((f, index) => {
    const num = String(index + 1).padStart(2, "0");
    const code = `FND-${num}`;
    return {
      ...f,
      code,
    };
  });
}

export function inferCompletions(
  semanticMap: SemanticDomainGroup[],
  findings: FindingWithCode[],
  manualCompleted: WorkItem[] = [],
): CompletionItem[] {
  const items: CompletionItem[] = [];

  // Add manual completed items first if any
  for (const item of manualCompleted) {
    items.push({
      title: item.title,
      confidence: 0.98,
      evidence: ["Marked complete in workspace ledger"],
    });
  }

  const findingsByDomain = new Set(findings.map((f) => f.category.toLowerCase()));

  for (const group of semanticMap) {
    if (group.domain === "database") {
      const hasMigration = group.files.some((f) => f.role?.includes("migration") || f.path.endsWith(".sql"));
      const hasSchema = group.files.some((f) => f.role?.includes("Schema") || f.role?.includes("model"));
      if (hasMigration && hasSchema) {
        items.push({
          title: "Database schema definition & migration artifacts",
          confidence: 0.9,
          evidence: group.files.slice(0, 2).map((f) => f.path),
          domain: "database",
        });
      } else if (hasSchema) {
        items.push({
          title: "Database schema model",
          confidence: 0.85,
          evidence: group.files.slice(0, 2).map((f) => f.path),
          domain: "database",
        });
      }
    } else if (group.domain === "api") {
      const apiFindings = findings.filter((f) => f.category === "dependencies" || f.category === "configuration");
      const hasCleanWiring = apiFindings.length === 0;
      if (hasCleanWiring && group.files.length > 0) {
        items.push({
          title: `API & Webhook endpoints (${group.files.length} route handler${group.files.length > 1 ? "s" : ""})`,
          confidence: 0.88,
          evidence: group.files.slice(0, 3).map((f) => f.path),
          domain: "api",
        });
      }
    } else if (group.domain === "tests") {
      if (group.files.length > 0) {
        items.push({
          title: `Test suite coverage (${group.files.length} test file${group.files.length > 1 ? "s" : ""})`,
          confidence: 0.95,
          evidence: group.files.slice(0, 3).map((f) => f.path),
          domain: "tests",
        });
      }
    } else if (group.domain === "config") {
      const hasMissingEnv = findings.some((f) => f.id.includes("env-var"));
      if (!hasMissingEnv && group.files.some((f) => f.path.includes(".env.example"))) {
        items.push({
          title: "Configuration baseline & environment variable examples",
          confidence: 0.92,
          evidence: [".env.example documented and aligned"],
          domain: "config",
        });
      }
    }
  }

  // Deduplicate items by title
  const seen = new Set<string>();
  return items.filter((item) => {
    if (seen.has(item.title)) return false;
    seen.add(item.title);
    return true;
  });
}

export function buildExplanation(
  target: string,
  sounding: ProjectSounding,
): FindingExplanation | null {
  const norm = target.trim().toUpperCase();

  // Look up by exact code (e.g. FND-01) or finding ID (e.g. config.env-var-missing)
  const finding = sounding.needsAttention.find(
    (f) => f.code.toUpperCase() === norm || f.id.toUpperCase() === norm || f.category.toUpperCase() === norm,
  );

  if (!finding) return null;

  let riskLevel: FindingExplanation["riskLevel"] = "medium";
  let riskDescription = "May cause unexpected behavior or drift.";

  if (finding.category === "configuration") {
    riskLevel = "high";
    riskDescription = "Missing environment variables cause runtime exceptions in deployment environments.";
  } else if (finding.category === "dependencies") {
    riskLevel = "high";
    riskDescription = "Undeclared dependencies cause module not found errors when installed on fresh machines.";
  } else if (finding.category === "architecture") {
    riskLevel = "high";
    riskDescription = "Circular dependencies or module coupling degrade maintainability and break module initialization.";
  } else if (finding.category === "testing") {
    riskLevel = "medium";
    riskDescription = "Untested business logic changes introduce risk of silent regression.";
  } else if (finding.category === "documentation") {
    riskLevel = "medium";
    riskDescription = "Stale or missing documentation creates confusion for collaborators and AI agents.";
  } else if (finding.severity === "warning") {
    riskLevel = "medium";
    riskDescription = "Requires developer attention before merge.";
  } else {
    riskLevel = "low";
    riskDescription = "Informational notice about repository conventions.";
  }

  return {
    code: finding.code,
    id: finding.id,
    title: finding.message,
    category: finding.category,
    severity: finding.severity,
    claim: finding.message,
    evidence: finding.evidence,
    riskLevel,
    riskDescription,
    provenance: "Deterministic repository observation. No external LLM inference.",
  };
}
