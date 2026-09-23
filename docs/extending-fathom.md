# Extending Fathom

Fathom is designed to be composable and hackable. You can add new observations, claims, or deterministic checks without modifying core engines.

---

## 1. Authoring a Custom Check

Create a check that inspects workspace files and emits findings with attached evidence:

```ts
import type { Check, Finding } from "@johnfaleke/fathom";

export const prismaSchemaCheck: Check = {
  id: "database.prisma-sync",
  async run(ctx): Promise<Finding[]> {
    const findings: Finding[] = [];
    const hasPrisma = ctx.files.some((f) => f.endsWith("schema.prisma"));

    if (hasPrisma && !ctx.files.some((f) => f.includes("migrations"))) {
      findings.push({
        id: "database.prisma-unmigrated",
        category: "database",
        severity: "potential",
        message: "Prisma schema found but no migrations folder exists.",
        evidence: [
          {
            kind: "filesystem",
            path: "prisma/schema.prisma",
            detail: "Schema detected without corresponding migrations directory",
          },
        ],
      });
    }

    return findings;
  },
};
```

---

## 2. Best Practices

- **Never conjecture**: Attach concrete file paths and details to `evidence`.
- **Use appropriate severity**:
  - `info`: Useful structural notices (e.g. unreferenced internal module).
  - `potential`: Possible inconsistencies where context may vary.
  - `warning`: Definitive inconsistencies that break builds or runtime (e.g. missing required env var).
