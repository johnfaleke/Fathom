# Fathom

> Measure reality. Understand the change.

Fathom is a local-first **Project Model CLI, State Ledger, and MCP Server**. It gives developers and AI coding agents an automatic, evidence-backed view of project reality: what is being worked on, what changed, what is likely complete, and what may be silently broken—without forcing humans to maintain project state manually.

**Current release:** `v0.4.0` — Automatic Project Understanding, Semantic Area Mapping, and `fathom explain`.

---

## The Core Loop

You are already coding. Fathom reconstructs project reality and tells you what you need to know:

```text
Code in workspace
       │
       ▼
  fathom status      ──► Reconstructs objective, domain map, completions & drift
       │
       ▼
  fathom explain FND-01 ──► Inspects exact deterministic evidence coordinates
       │
       ▼
  fathom check       ──► Gates CI on wiring integrity (env vars, dependencies)
```

---

## Quick Start

### 1. Install globally
```bash
npm install --global @johnfaleke/fathom
```

Or pin per-project:
```bash
npm install --save-dev @johnfaleke/fathom
```

### 2. Take a project sounding
Run from any Git repository:

```bash
cd /path/to/your-project
fathom init
fathom status
```

Example output:
```text
FATHOM / SOUNDING
────────────────────────────────────────────────────────────

OBJECTIVE
Implement Stripe Subscriptions & Billing
Confidence: 92%
Evidence:
  • Active branch: feat/stripe-subscriptions
  • 6 recent commit(s) (latest: "add webhook verification")
  • Modifications in API & Webhooks, Database & Storage

SEMANTIC MAP
API & Webhooks (2 files)
  + src/webhooks/stripe.ts (Webhook receiver)
  + src/billing/checkout.ts (API route)
Database & Storage (2 files)
  + prisma/migrations/20260922_subscriptions.sql (Database migration)
  + src/models/subscription.ts (Data model)
Configuration & Environment (1 file)
  + .env.example (Environment variables)
Tests & Verification (2 files)
  + tests/billing.test.ts (Test suite)

LIKELY COMPLETE
✓ Database schema definition & migration artifacts
✓ API & Webhook endpoints (2 route handlers)
✓ Test suite coverage (2 test files)

NEEDS ATTENTION
⚠ [FND-01] STRIPE_WEBHOOK_SECRET is used in code but missing from .env.example
      src/webhooks/stripe.ts: process.env.STRIPE_WEBHOOK_SECRET
      .env.example: STRIPE_WEBHOOK_SECRET is missing

Run `fathom explain <id>` to inspect deterministic evidence.

PROJECT DRIFT
  1 finding(s) · 7 file(s) tracked/changed · 6 commit(s)
```

---

## Inspect Deterministic Evidence: `fathom explain`

Every finding points back to observable repository coordinates:

```bash
fathom explain FND-01
```

```text
EVIDENCE REPORT: [FND-01]
────────────────────────────────────────────────────────────

Finding:
  STRIPE_WEBHOOK_SECRET is used in code but missing from .env.example

Category:
  Configuration · Severity: WARNING

Claim:
  STRIPE_WEBHOOK_SECRET is used in code but missing from .env.example

Evidence Coordinates:
  • src/webhooks/stripe.ts: process.env.STRIPE_WEBHOOK_SECRET
  • .env.example: STRIPE_WEBHOOK_SECRET is missing

Risk Assessment:
  HIGH — Missing environment variables cause runtime exceptions in deployment environments.

Provenance:
  Deterministic repository observation. No external LLM inference.
```

---

## AI Coding Agent Integration (MCP Server)

Connect Cursor, Claude Desktop, or Antigravity to live project state:

```bash
fathom mcp
```

### Supported MCP Tools & Resources
- **`fathom_status`**: Live sounding with objective, semantic map, completions, and findings.
- **`fathom_explain`**: Inspects coordinates and risk for any finding (`findingId: "FND-01"`).
- **`fathom_check`**: Runs deterministic wiring checks and returns structured attention items.
- **`fathom_scan`**: Rebuilds the `.fathom/model.json` claim graph.
- **`fathom_diff`**: Semantic diff grouped by software domain.
- **Resources**: `fathom://sounding`, `fathom://model`, `fathom://state`, `fathom://config`, `fathom://events`.

---

## CI/CD Gating & Automation

Run Fathom in GitHub Actions to catch missing environment variables, undeclared packages, and broken wiring:

```yaml
# .github/workflows/ci.yml
name: CI

on: [push, pull_request]

jobs:
  verify:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
      - run: npm ci
      - run: npx fathom init
      - name: Verify Project Wiring
        run: npx fathom check --format github --max-attention 0
```

### Automation Flags
- `--json`: Universal JSON output for scripting.
- `--format github`: Native GitHub Actions annotations (`::warning`, `::error`).
- `--format markdown`: Markdown summary tables for pull request comments.
- `--max-attention <N>`: Fail build if unresolved attention items exceed threshold.
- `--fail-on <severity>`: Fail build based on severity (`info`, `potential`, `warning`).

---

## CLI Command Reference

| Command | Description |
| :--- | :--- |
| `fathom status` | Automatic project sounding: objective, semantic map, completions, and drift |
| `fathom explain <id>` | Inspect deterministic evidence coordinates and risk report for a finding |
| `fathom graph` | Visual architecture graph, dependency tree, and circular import analysis |
| `fathom check` | Deep cross-artifact checks (env vars, dependencies, doc drift, test relationships) |
| `fathom diff` | Semantic change summary grouped by software domain |
| `fathom scan` | Rebuild the local Project Model (`.fathom/model.json`) |
| `fathom init` | Initialize Fathom in the current workspace |
| `fathom mcp` | Start Model Context Protocol (MCP) stdio server for AI coding assistants |
| `fathom setup` | Configure named AI provider profiles (OpenAI, Ollama, vLLM, LocalAI) |
| `fathom check --ai` | Opt-in AI interpretation with automatic secret redaction and consent |

---

## License

MIT © [John Faleke](https://github.com/johnfaleke)
