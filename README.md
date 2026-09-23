# Fathom

[![CI](https://github.com/johnfaleke/Fathom/actions/workflows/ci.yml/badge.svg)](https://github.com/johnfaleke/Fathom/actions/workflows/ci.yml)
[![npm version](https://img.shields.io/npm/v/@johnfaleke/fathom.svg)](https://www.npmjs.com/package/@johnfaleke/fathom)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](https://opensource.org/licenses/MIT)

> **Git tells you what moved. Fathom tells you what it means.**  
> Fathom is the reality layer for software. It reconstructs what is happening inside a codebase and detects where code, tests, configuration, and documentation stop agreeing with each other—with evidence.

Local-first. Zero runtime dependencies. Open source. Built for humans and AI coding agents.

---

## The Problem Fathom Solves

AI coding agents can now modify codebases faster than humans can track. A single session can add new routes, dependencies, and environment variables across dozens of files.

`git diff` tells you which lines changed. It doesn't tell you:
- What environment variables are now undocumented?
- What internal modules were orphaned?
- What core business logic changed without updated tests?
- What is actually complete vs. only looks complete?

Fathom gives you the reality layer before you ship.

---

## 60-Second Quickstart

Run directly on **any** repository (no prior setup required):

```bash
npx @johnfaleke/fathom
```

Or install globally:

```bash
npm install --global @johnfaleke/fathom
fathom status
```

### Real Terminal Output

```text
FATHOM / SOUNDING
────────────────────────────────────────────────────────────
PROJECT       Fathom (branch: feat/stripe-subscriptions)
OBJECTIVE     Implement Stripe Subscriptions & Billing
CHANGED       7 files · 6 commits · 4 areas
              • API & Webhooks ........... 2 files
              • Database & Storage ....... 2 files
              • Configuration ............ 1 file
              • Tests & Verification ..... 2 files

LIKELY COMPLETE
  ✓ Database schema definition & migration artifacts
  ✓ API & Webhook endpoints (2 route handlers)
  ✓ Test suite coverage (2 test files)

NEEDS ATTENTION
  ⚠ FND-01 Documentation drift
    STRIPE_WEBHOOK_SECRET is used in code but missing from .env.example
    src/webhooks/stripe.ts:18

IMPACT
  1 config variable · 2 documentation surfaces · 1 CI gate
────────────────────────────────────────────────────────────
1 finding · Run `fathom explain FND-01`
```

---

## Deterministic Evidence: `fathom explain`

Every finding points back to observable repository coordinates with zero LLM hallucinations:

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

Evidence Coordinates:
  • src/webhooks/stripe.ts: process.env.STRIPE_WEBHOOK_SECRET
  • .env.example: STRIPE_WEBHOOK_SECRET is missing

Risk Assessment:
  HIGH — Missing environment variables cause runtime exceptions in deployment environments.

Provenance:
  Deterministic repository observation. No external LLM inference.
```

---

## The Dogfooding Story: How Fathom Blocked Its Own CI

In our release cycle, GitHub Actions CI broke on all Node versions. Not because of a broken unit test or compiler error.

**Fathom caught that we introduced `FATHOM_AI_MODEL` and `FATHOM_AI_BASE_URL` in our codebase without documenting them in our documentation or `.env.example`.**

```yaml
# .github/workflows/ci.yml
- name: Run Fathom self-check
  run: node dist/cli.js check --format github
```

Fathom blocked the build until documentation was updated. That is deterministic code health in practice.

---

## AI Agent Integration (MCP Server)

Fathom exposes a first-class Model Context Protocol (MCP) server for Claude Desktop, Cursor, Windsurf, and VS Code Copilot:

```json
{
  "mcpServers": {
    "fathom": {
      "command": "npx",
      "args": ["-y", "@johnfaleke/fathom", "mcp"]
    }
  }
}
```

### The Agent Reality Loop

```text
Agent starts task   ───►  fathom_status
Agent edits files   ───►  fathom_diff
Agent finishes work ───►  fathom_check & fathom_explain
```

---

## CLI Command Reference

| Command | Description |
| :--- | :--- |
| `fathom` / `fathom status` | Automatic project sounding: objective, semantic map, completions, and drift |
| `fathom explain <id>` | Inspect deterministic evidence coordinates and risk report for a finding |
| `fathom diff` | Semantic change summary grouped by software domain |
| `fathom check` | Deep cross-artifact checks (env vars, dependencies, doc drift, test relationships) |
| `fathom graph` | Visual architecture graph, dependency tree, and circular import analysis |
| `fathom scan` | Rebuild the local Project Model (`.fathom/model.json`) |
| `fathom init` | Explicitly scaffold local `.fathom/` configuration |
| `fathom mcp` | Start Model Context Protocol (MCP) stdio server |
| `fathom setup` | Configure named AI provider profiles (OpenAI, Ollama, vLLM, LocalAI) |
| `fathom check --ai` | Opt-in AI interpretation with automatic secret redaction and consent |

---

## Documentation & Architecture

- [Architecture & Design Principles](ARCHITECTURE.md)
- [Project Model Schema](docs/project-model.md)
- [Deterministic Checks Catalog](docs/checks.md)
- [Model Context Protocol (MCP)](docs/mcp.md)
- [Extending Fathom](docs/extending-fathom.md)
- [Contributing Guide](CONTRIBUTING.md)

---

## License

MIT © [John Faleke](https://github.com/johnfaleke)
