# Fathom

> AI can generate the work. Fathom helps you understand the work.

Fathom is a local-first CLI for project Work State. It gives developers a deterministic, evidence-backed view of what is happening in a repo: what is in progress, what has been completed, what changed, and what may be silently broken.

## Why Fathom exists

Most project tooling answers either:

- which files changed, or
- what an AI thinks is happening.

Fathom does neither blindly. It focuses on observable evidence and clearly labelled findings:

- missing environment variables
- undeclared dependencies
- stale project state
- changed files grouped by project area
- a machine-readable snapshot of project health

## Quick start

Install Fathom globally:

```bash
npm install --global @johnfaleke/fathom
```

Then run it from any project workspace:

```bash
cd /path/to/your-project
fathom init
fathom check
fathom status
```

The package installs the `fathom` command. You do not need to clone this
repository into the project being inspected.

For repository development, install dependencies locally instead:

```bash
npm install
```

Initialize a project:

```bash
npm run fathom -- init
```

Set your current work and task state:

```bash
npm run fathom -- set --current "Ship OAuth integration" --complete "Login API, API docs" --incomplete "Webhook retry handling, Missing README"
```

Check the project for inconsistencies:

```bash
npm run fathom -- check
npm run fathom -- check --json
```

Review project state:

```bash
npm run fathom -- status
npm run fathom -- status --json
```

See what meaningfully changed:

```bash
npm run fathom -- diff
npm run fathom -- diff --json
```

Optional AI interpretation is explicit and requires consent:

```bash
set OPENAI_API_KEY=your-key
npm run fathom -- interpret --provider openai --consent --prompt "Summarize likely follow-up work" --json
```

The published CLI uses the same command:

```bash
fathom interpret --provider openai --consent
```

Interpretation sends only filtered context, requires `OPENAI_API_KEY`, and never
runs automatically as part of `check`, `status`, or `diff`. Configure optional
file filtering in `.fathom/config.json` with `ai.includePaths` and
`ai.maxFileBytes`.

After building:

```bash
npm run build
node dist/cli.js init
node dist/cli.js status
```

## Use Fathom in another project

Fathom operates on the current working directory. Build it once, then run the
CLI while your other project is the working directory.

From PowerShell on Windows:

```powershell
Set-Location C:\path\to\Fathom
npm run build
Set-Location C:\path\to\your-project
node C:\path\to\Fathom\dist\cli.js init
node C:\path\to\Fathom\dist\cli.js check
node C:\path\to\Fathom\dist\cli.js status
```

From macOS or Linux:

```bash
cd /path/to/Fathom
npm run build
cd /path/to/your-project
node /path/to/Fathom/dist/cli.js init
node /path/to/Fathom/dist/cli.js check
node /path/to/Fathom/dist/cli.js status
```

Initialization creates `.fathom/` and `.env.example` in the target project.
The generated `.fathom/` directory is local project state; commit it only if
you want to share that state with collaborators. Use `--json` for automation:

```bash
node /path/to/Fathom/dist/cli.js check --json
node /path/to/Fathom/dist/cli.js status --json
node /path/to/Fathom/dist/cli.js diff --json
```

To use the `fathom` command directly during local development, run `npm link`
once from the Fathom directory. Then open another project and run:

```bash
fathom init
fathom check
fathom status
```

The direct command works because Fathom always inspects the directory where
the command is run, not the directory where Fathom itself is installed.

## Open-source project site

The static project site lives in [`site/`](./site/index.html). Open
`site/index.html` directly in a browser, or serve the repository with any static
file server while developing. It includes the product overview, installation
guide, command reference, check interface, Work State schema, contribution links,
and support link.

The machine-readable [`llms.txt`](./llms.txt) file is a concise text reference for
AI tools, search systems, and integrations that need to understand Fathom without
parsing the full README or landing page.

## Package releases

The published package name is `@johnfaleke/fathom`; the installed command remains
`fathom`. Releases are published automatically by GitHub Actions when a maintainer
pushes a semantic version tag:

```bash
git tag v0.1.0
git push origin v0.1.0
```

Before the first release, the npm package owner must configure GitHub Actions as a
trusted publisher for `@johnfaleke/fathom` on npm. Future v0.2 and later tags will
then build, test, and publish automatically. A version tag does not happen by
itself; it is the deliberate release switch.

## Commands

| Command | Purpose |
|---------|---------|
| `fathom init` | Create `.fathom/` for state, config, and event history |
| `fathom set --current ...` | Update current work and task lists |
| `fathom status` | Show the current project state |
| `fathom diff` | Show semantic file changes and project impact |
| `fathom check` | Detect inconsistent or forgotten wiring |

Add `--json` to any of the reporting commands for machine-readable output.

## Example status output

```text
FATHOM STATUS

Current work: Ship OAuth integration
Progress: 1 complete, 1 remaining

Completed:
  ✓ Login API

Remaining:
  • Webhook retry handling

Findings:
  ⚠ left-pad is imported but not declared in package.json

Changes:
  1 file(s) changed
  ~ src/app.ts

Attention:
  1 thing(s) are worth reviewing.
```

## Example JSON output

```json
{
  "version": 1,
  "updatedAt": "2026-09-20T00:00:00.000Z",
  "root": "/path/to/project",
  "currentWork": "Ship OAuth integration",
  "completed": [
    { "id": "completed-login-api", "title": "Login API", "status": "completed" }
  ],
  "incomplete": [
    { "id": "incomplete-webhook-retry-handling", "title": "Webhook retry handling", "status": "incomplete" }
  ],
  "findings": [
    {
      "id": "deps.undeclared-import",
      "category": "dependencies",
      "severity": "warning",
      "message": "left-pad is imported but not declared in package.json",
      "evidence": []
    }
  ],
  "changes": {
    "filesChanged": 1,
    "summary": ["~ src/app.ts"]
  },
  "attention": 1
}
```

## Built-in checks

The current v0.1 checks are deterministic and evidence-based:

- **config.env-var-missing** — `process.env.X` used but not present in `.env.example`
- **deps.undeclared-import** — package imported but not declared in `package.json`

## Project configuration guidance

Fathom uses a local `.fathom/config.json` file and respects ignore rules. A good default config is deliberately conservative:

```json
{
  "version": 1,
  "ignore": [
    "node_modules",
    "dist",
    ".git",
    ".fathom",
    "coverage",
    ".next"
  ]
}
```

For more guidance, see [docs/configuration.md](./docs/configuration.md).

## AI interpretation layer (optional)

Fathom intentionally keeps deterministic checks separate from interpretation. If you want AI assistance later, it should be opt-in and use a clean provider interface instead of hard coding a single model provider.

```ts
export interface AIProvider {
  id: string;
  name: string;
  interpret(input: AIInterpretationRequest): Promise<AIInterpretationResult>;
}
```

This keeps the core product honest: evidence stays evidence, and model output remains clearly labelled as interpretation.

See [docs/ai-provider.md](./docs/ai-provider.md) for the provider surface and integration conventions.

## Docs and roadmap

- [FATHOM.md](./FATHOM.md) — vision, principles, and roadmap
- [docs/configuration.md](./docs/configuration.md) — config and ignore recommendations
- [docs/ai-provider.md](./docs/ai-provider.md) — optional provider abstraction for interpretation

## License

MIT
