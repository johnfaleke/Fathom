# The Fathom Project Model

The **Project Model** is Fathom's durable, evidence-backed representation of what can be established about a software repository.

---

## Structure

The model is generated via `fathom scan` and stored locally in `.fathom/model.json`.

```json
{
  "version": 1,
  "generatedAt": "2026-09-23T00:00:00.000Z",
  "root": "/path/to/project",
  "project": {
    "name": "my-app",
    "files": 42,
    "stack": ["TypeScript", "React", "Next.js"],
    "dependencies": ["react", "next", "tailwindcss"]
  },
  "observations": [
    {
      "id": "project.package-manifest",
      "kind": "manifest",
      "subject": "project",
      "detail": "package manifest declares 3 dependencies",
      "evidence": [
        {
          "kind": "manifest",
          "path": "package.json",
          "detail": "package manifest was read"
        }
      ]
    }
  ],
  "claims": [
    {
      "id": "project.stack",
      "subject": "project",
      "predicate": "uses",
      "object": "TypeScript, React, Next.js",
      "confidence": 0.95,
      "evidence": [
        {
          "kind": "filesystem",
          "detail": "42 files found"
        }
      ]
    }
  ]
}
```

---

## Lifecycle & Views

Views like `fathom status`, `fathom diff`, and `fathom check` compute dynamic soundings over this model in combination with current Git signals.
