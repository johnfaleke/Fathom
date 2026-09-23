# Contributing to Fathom

Welcome to the Fathom community! We believe in keeping Fathom **local-first, transparent, deterministic, and evidence-backed.**

---

## 1. Quick Development Setup

Fathom requires Node.js 18+ and has **zero runtime dependencies**.

```bash
git clone https://github.com/johnfaleke/Fathom.git
cd Fathom
npm install
npm run build
npm test
```

---

## 2. Adding a New Check in 20 Lines

Checks in Fathom are pure functions implementing the `Check` interface from `src/types.ts`:

```ts
import type { Check, Finding } from "../types.js";

export const myCustomCheck: Check = {
  id: "custom.my-rule",
  async run(ctx): Promise<Finding[]> {
    const findings: Finding[] = [];

    // Inspect files or ASTs in ctx
    for (const file of ctx.files) {
      if (file.endsWith(".config.ts")) {
        // Evaluate condition with deterministic evidence
        findings.push({
          id: "custom.my-rule.finding",
          category: "configuration",
          severity: "warning",
          message: "Config file requires review",
          evidence: [{ kind: "filesystem", path: file, detail: "Observed config file" }],
        });
      }
    }

    return findings;
  },
};
```

Register your check in `src/checks/index.ts` and add a unit test in `tests/checks.test.ts`.

---

## 3. Running Self-Checks & Tests

Fathom dogfoods itself before any pull request is merged:

```bash
# Run unit tests
npm test

# Run build & Fathom self-check against Fathom's own codebase
npm run build
node dist/cli.js check --format github
```

---

## 4. Code Guidelines

1. **Zero Runtime Dependencies**: The CLI and core engine must not add external npm runtime dependencies.
2. **Deterministic Evidence**: Never emit an opinion or LLM conjecture as an observed fact. Attach code coordinates and evidence to every finding.
3. **Cross-Platform**: Ensure all path handling uses `node:path` normalization and tests pass across Windows, macOS, and Linux.
