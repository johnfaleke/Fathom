# Fathom Architecture & Design Principles

> **"Git tells you what moved. Fathom tells you what it means."**

Fathom is a local-first, evidence-backed software reality layer for human developers and AI coding agents. It reconstructs what changed, what it affects, and what no longer lines up.

---

## 1. Core Pipeline: From Raw Files to Reality

Fathom processes repositories through a strict, deterministic pipeline:

```text
       RAW REPOSITORY ARTIFACTS
 (Source ASTs, Git signals, Manifests, Docs)
                   │
                   ▼
┌──────────────────────────────────────┐
│             OBSERVATIONS             │
│  (Directly witnessed facts in repo)  │
└──────────────────┬───────────────────┘
                   │
                   ▼
┌──────────────────────────────────────┐
│               EVIDENCE               │
│ (Source code coordinates, AST spans) │
└──────────────────┬───────────────────┘
                   │
                   ▼
┌──────────────────────────────────────┐
│                CLAIMS                │
│  (Confidence-scored project beliefs) │
└──────────────────┬───────────────────┘
                   │
                   ▼
┌──────────────────────────────────────┐
│            PROJECT MODEL             │
│ (Semantic domains, topology, graph)  │
└──────────────────┬───────────────────┘
                   │
                   ▼
┌──────────────────────────────────────┐
│          DETERMINISTIC CHECKS        │
│  (Cross-artifact drift verification) │
└──────────────────┬───────────────────┘
                   │
                   ▼
┌──────────────────────────────────────┐
│              INTERFACES              │
│    CLI · JSON · GitHub CI · MCP      │
└──────────────────────────────────────┘
```

---

## 2. Pipeline Concepts

### 1. Observations
Directly observable, empirical facts about the workspace. Observations never guess:
- File paths, sizes, timestamps, and line counts.
- Declared dependencies in `package.json`, `pyproject.toml`, or `Cargo.toml`.
- Git branch name, commit authoring timestamps, and modified files.

### 2. Evidence
Every observation is tagged with verifiable provenance:
- AST code coordinates (`src/auth/jwt.ts:18`).
- File spans and manifest entries.
- Diff chunks from Git working tree or commits.

### 3. Claims
Derived, confidence-weighted conclusions constructed from observations:
- *Claim:* `project uses TypeScript, React` (confidence: `0.95`, derived from manifest dependencies and `.tsx` file presence).
- *Claim:* `active objective is Implement Stripe checkout` (confidence: `0.85`, derived from branch name `feat/stripe-checkout` and modified `src/webhooks/` files).

### 4. Project Model & Architecture Graph
The unified in-memory representation:
- **Semantic Domains**: Files classified into `api`, `logic`, `database`, `ui`, `config`, `tests`, `docs`, `tooling`.
- **Dependency Topology**: Directed graph of import relationships, circular dependency chains, and orphaned entryless modules.

### 5. Deterministic Checks
Verifiable rules that catch cross-artifact inconsistency without LLM guesswork:
- **`config.env-var-missing`**: Environment variable used in code (`process.env.VAR`) but missing from `.env.example`.
- **`doc.env-undocumented`**: Environment variable used in source logic but missing from all markdown documentation.
- **`architecture.dependency-topology`**: Circular dependency chains in imports.
- **`testing.coverage-relationship`**: Source logic modified without corresponding updates to mapped test files.

---

## 3. Interfaces

Fathom exposes multiple consumption interfaces over the same deterministic reality:

1. **Terminal CLI (`fathom status`, `fathom check`, `fathom diff`, `fathom explain`)**: High-contrast, human-readable soundings.
2. **Machine JSON (`--json`)**: Versioned schemas for developer tooling, scripts, and automation.
3. **CI Gating (`--format github`)**: Workflow command annotations for PR gating on GitHub Actions.
4. **Model Context Protocol (MCP)**: Stdio JSON-RPC server enabling AI coding agents (Copilot, Cursor, Claude Code, Windsurf) to consult project state before, during, and after task execution.
