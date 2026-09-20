# Fathom

> AI can generate the work. Fathom helps you understand the work.

Local-first CLI for project **Work State** — deterministic checks first, evidence on every finding.

## Quick start

```bash
npm install
npm run fathom -- init
npm run fathom -- check
npm run fathom -- status
npm run fathom -- diff
```

Or after build:

```bash
npm run build
node dist/cli.js init
```

## Commands

| Command | Purpose |
|---------|---------|
| `fathom init` | Create `.fathom/` (state, events, config) |
| `fathom status` | Where the project stands |
| `fathom diff` | What changed (git-backed in v0.1) |
| `fathom check` | Inconsistencies / forgotten wiring |

Add `--json` to `status`, `diff`, or `check` for machine-readable output.

## v0.1 checks

- **config.env-var-missing** — `process.env.X` used but not in `.env.example`
- **deps.undeclared-import** — package imported but not in `package.json`

See [FATHOM.md](./FATHOM.md) for vision, adoption targets, and roadmap.
