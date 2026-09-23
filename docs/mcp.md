# Model Context Protocol (MCP) Integration

Fathom exposes a first-class Model Context Protocol (MCP) stdio server so AI coding agents can consult project reality before, during, and after making changes.

---

## 1. Starting the Server

```bash
fathom mcp
```

Or run via `npx`:

```bash
npx @johnfaleke/fathom mcp
```

---

## 2. Editor & Agent Configuration

### Claude Desktop / Cursor / Windsurf / VS Code Copilot

Add Fathom to your MCP settings file (e.g. `claude_desktop_config.json` or `.cursor/mcp.json`):

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

---

## 3. The Agent Reality Loop

```text
Before work starts   ───►  fathom_status
While editing code   ───►  fathom_diff
Before task complete ───►  fathom_check & fathom_explain
```

---

## 4. Available MCP Tools

| Tool | Purpose |
| :--- | :--- |
| `fathom_status` | Retrieve reconstructed objective, semantic domain map, likely completions, and attention findings. |
| `fathom_diff` | Get semantic project-level change summary grouped by domain. |
| `fathom_check` | Run deterministic cross-artifact checks and return findings count. |
| `fathom_explain` | Inspect exact code coordinates, AST spans, and evidence for a finding ID. |
| `fathom_graph` | Generate architecture graph in JSON or Mermaid diagram format. |
| `fathom_scan` | Build or update the Project Model. |
