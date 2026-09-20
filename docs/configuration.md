# Configuration guidance

Fathom stores local project metadata under `.fathom/` and respects a minimal ignore list by default.

## Recommended structure

```text
.fathom/
├── config.json
├── state.json
├── events.jsonl
```

## Recommended config

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

## Why these defaults matter

- `node_modules` and `dist` are large, generated output that does not represent the project’s source-of-truth state.
- `.git` and `.fathom` should be excluded to prevent noise from git metadata and local Fathom state.
- `coverage`, `.next`, and similar build output directories should stay out of deterministic checks.

## Add custom ignores

If a project has large generated folders or vendor directories, add them to the ignore list explicitly and keep the list small and intentional.

## Safety rules

- Never add secrets or environment files to the ignore list unless you intend to exclude them from the project model.
- Prefer explicit directories over broad globs when possible.
- Keep the config stable so that deterministic checks remain reproducible.

## AI usage security

`fathom scan`, `fathom status`, `fathom diff`, and plain `fathom check` are local-only.
They do not call a model or send project files over the network.

AI use requires two deliberate steps:

```bash
fathom setup
fathom check --ai
```

`fathom setup` enables the workspace profile. `check --ai` is the explicit network
boundary; it sends only the filtered context to the configured endpoint. Review
these fields before using it in a repository you did not create:

- `ai.profile` and the selected profile's `provider`
- `ai.profiles.<name>.baseUrl`
- `ai.profiles.<name>.apiKeyEnv`
- `ai.includePaths` and `ai.maxFileBytes`

API keys are read from the named environment variable and are never written to
`.fathom/config.json`. Do not run `check --ai` in an untrusted repository while
valuable credentials are present in your shell environment. Use plain `fathom check`
for untrusted code, or inspect the configuration and run `fathom setup` yourself
before enabling AI.
