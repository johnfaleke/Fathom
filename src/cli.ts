#!/usr/bin/env node
import { cmdInit } from "./commands/init.js";
import { cmdCheck } from "./commands/check.js";
import { cmdStatus } from "./commands/status.js";
import { cmdDiff } from "./commands/diff.js";
import { cmdExplain } from "./commands/explain.js";
import { cmdInterpret } from "./commands/interpret.js";
import { cmdConfig } from "./commands/config.js";
import { cmdSetup } from "./commands/setup.js";
import { cmdScan } from "./commands/scan.js";
import { cmdMCP } from "./commands/mcp.js";
import { runGraphCommand } from "./commands/graph.js";

const VERSION = "0.5.0";

function printHelp(): void {
  console.log(`fathom ${VERSION}

Measure reality. Understand the change — local-first Project Model & State Ledger.

Usage:
  fathom <command> [options]

Commands:
  status [--json]                 Automatic project sounding: objective, semantic map, drift
  explain [<finding-id>] [--json] Inspect deterministic evidence coordinates and risk
  graph [--format text|json|mermaid] [--filter <domain>]
                                  Visual architecture graph and circular dependency analysis
  check [options]                 Verify wiring integrity (env vars, dependencies, doc drift)
  diff [--json]                   Semantic change summary grouped by project domain
  scan [--json]                   Rebuild the local Project Model (.fathom/model.json)
  init [--json]                   Initialize Fathom in the current workspace
  set [--current <text>] [--complete <item>] [--incomplete <item>] 
                                  Manually record or update workspace objectives
  mcp                             Start Model Context Protocol (MCP) stdio server
  setup [options]                 Configure named AI provider profiles
  config show | set <k> <v>       Inspect or update local profile configuration
  check --ai [options]            Opt-in AI interpretation with explicit consent

Automation & CI Options:
  --json                          Emit machine-readable JSON output
  --format <type>                 Output format: terminal | json | github | markdown
  --max-attention <number>        CI gating: fail if attention items exceed threshold
  --fail-on <severity>            CI gating: fail on severity: info | potential | warning

Options:
  -h, --help                      Show help
  -v, --version                   Show version
`);
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const command = args[0];

  const statusOptions = parseStatusOptions(args.slice(1));
  const json = statusOptions.json || args.includes("--json");
  const format = parseFormatOption(args.slice(1), json);
  const maxAttentionRaw = parseOption(args.slice(1), "--max-attention");
  const maxAttention = maxAttentionRaw !== undefined ? Number(maxAttentionRaw) : undefined;
  const failOn = parseOption(args.slice(1), "--fail-on") as ("info" | "potential" | "warning" | undefined);

  if (!command || command === "-h" || command === "--help") {
    printHelp();
    return;
  }
  if (command === "-v" || command === "--version") {
    console.log(VERSION);
    return;
  }

  switch (command) {
    case "init":
      process.exitCode = await cmdInit(process.cwd(), { json });
      break;
    case "set":
      process.exitCode = await cmdStatus(process.cwd(), {
        json,
        current: statusOptions.current,
        completed: statusOptions.completed,
        incomplete: statusOptions.incomplete,
      });
      break;
    case "status":
      process.exitCode = await cmdStatus(process.cwd(), {
        json,
        current: statusOptions.current,
        completed: statusOptions.completed,
        incomplete: statusOptions.incomplete,
      });
      break;
    case "explain":
      process.exitCode = await cmdExplain(process.cwd(), args[1], { json });
      break;
    case "graph":
      process.exitCode = await runGraphCommand(process.cwd(), {
        json,
        format: parseOption(args.slice(1), "--format") as any,
        filter: parseOption(args.slice(1), "--filter"),
      });
      break;
    case "diff":
      process.exitCode = await cmdDiff(process.cwd(), { json });
      break;
    case "check":
      process.exitCode = await cmdCheck(process.cwd(), {
        json,
        format,
        maxAttention,
        failOn,
        ai: args.includes("--ai"),
        prompt: parseOption(args.slice(1), "--prompt"),
      });
      break;
    case "config":
      process.exitCode = await cmdConfig(process.cwd(), args.slice(1));
      break;
    case "setup":
      process.exitCode = await cmdSetup(process.cwd(), {
        profile: parseOption(args.slice(1), "--profile"),
        provider: parseOption(args.slice(1), "--provider") as "openai" | "custom" | undefined,
        model: parseOption(args.slice(1), "--model"),
        baseUrl: parseOption(args.slice(1), "--base-url"),
        apiKeyEnv: parseOption(args.slice(1), "--api-key-env"),
        nonInteractive: args.includes("--non-interactive"),
        json,
      });
      break;
    case "scan":
      process.exitCode = await cmdScan(process.cwd(), { json });
      break;
    case "mcp":
      process.exitCode = await cmdMCP(process.cwd());
      break;
    case "interpret":
      process.exitCode = await cmdInterpret(process.cwd(), {
        json,
        provider: parseOption(args.slice(1), "--provider"),
        prompt: parseOption(args.slice(1), "--prompt"),
        consent: args.includes("--consent"),
      });
      break;
    default:
      console.error(`Unknown command: ${command}`);
      printHelp();
      process.exitCode = 1;
  }
}

function parseStatusOptions(args: string[]): {
  json: boolean;
  current?: string | null;
  completed?: string[];
  incomplete?: string[];
} {
  const result = {
    json: false,
    current: undefined as string | null | undefined,
    completed: undefined as string[] | undefined,
    incomplete: undefined as string[] | undefined,
  };

  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i];
    if (arg === "--json") {
      result.json = true;
      continue;
    }
    if (arg === "--current") {
      const value = args[i + 1];
      if (value && !value.startsWith("--")) {
        result.current = value;
        i += 1;
      }
      continue;
    }
    if (arg === "--complete") {
      const value = args[i + 1];
      if (value && !value.startsWith("--")) {
        result.completed = splitList(value);
        i += 1;
      }
      continue;
    }
    if (arg === "--incomplete") {
      const value = args[i + 1];
      if (value && !value.startsWith("--")) {
        result.incomplete = splitList(value);
        i += 1;
      }
      continue;
    }
  }

  return result;
}

function splitList(value: string): string[] {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function parseOption(args: string[], option: string): string | undefined {
  const index = args.indexOf(option);
  const value = index >= 0 ? args[index + 1] : undefined;
  return value && !value.startsWith("--") ? value : undefined;
}

function parseFormatOption(args: string[], json: boolean): "terminal" | "json" | "github" | "markdown" {
  const raw = parseOption(args, "--format");
  if (raw === "json" || raw === "github" || raw === "markdown" || raw === "terminal") {
    return raw;
  }
  return json ? "json" : "terminal";
}

main().catch((err: unknown) => {
  console.error(err);
  process.exitCode = 1;
});
