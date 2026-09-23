# Deterministic Checks Catalog

Fathom runs cross-artifact verification checks without LLM hallucinations. Every check produces structured findings with coordinates and provenance.

---

## 1. Configuration Checks

- **`config.env-var-missing`**: Catches `process.env.VARIABLE` references in source code that are missing from `.env.example`.
- **`doc.env-undocumented`**: Catches environment variables referenced in source code that are not documented in any markdown files or documentation.

---

## 2. Dependency Checks

- **`dependencies.undeclared`**: Flags packages imported by source code (`import x from 'pkg'`) that are missing from `package.json` `dependencies` or `peerDependencies`.
- **`architecture.dependency-topology`**: Identifies circular dependency chains across modules.
- **`dep.orphan`**: Identifies orphaned internal modules that are never imported by any other file in the workspace.

---

## 3. Testing Checks

- **`testing.coverage-relationship`**: Flags modified core business or API source logic that lack corresponding updates to test suites.

---

## 4. Documentation Drift Checks

- Catches documentation drift when source logic, commands, or environment variables are modified without updating corresponding documentation.
