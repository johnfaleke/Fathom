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
