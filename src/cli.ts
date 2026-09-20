#!/usr/bin/env node
import { cmdInit } from "./commands/init.js";
import { cmdCheck } from "./commands/check.js";
import { cmdStatus } from "./commands/status.js";
import { cmdDiff } from "./commands/diff.js";
import { cmdInterpret } from "./commands/interpret.js";
import { cmdConfig } from "./commands/config.js";
import { cmdSetup } from "./commands/setup.js";
import { cmdScan } from "./commands/scan.js";

const VERSION = "0.2.0";

function printHelp(): void {
  console.log(`fathom ${VERSION}

Understand the work — local-first Work State with evidence.

Usage:
  fathom <command> [options]

Commands:
  init                            Initialize Fathom in the current project
  set [--current <text>] [--complete <item>] [--incomplete <item>] 
                                  Update the active work state
  status [--json]                 Where does the project actually stand?
  diff [--json]                   What meaningfully changed (git-backed in v0.1)
  check [--json]                  Find inconsistencies and forgotten wiring
  check --ai [--json]             Add opt-in provider interpretation
  config show                     Show local configuration
  config set <key> <value>        Update AI profile configuration
  setup                           Guided AI setup for this workspace
  scan [--json]                   Build the local Project Model
  interpret --provider openai
                                  Opt-in AI interpretation with explicit consent

Options:
  -h, --help        Show help
  -v, --version     Show version
`);
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const command = args[0];

  const statusOptions = parseStatusOptions(args.slice(1));
  const json = statusOptions.json || args.includes("--json");

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
      process.exitCode = await cmdInit(process.cwd());
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
    case "diff":
      process.exitCode = await cmdDiff(process.cwd(), { json });
      break;
    case "check":
      process.exitCode = await cmdCheck(process.cwd(), {
        json,
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
      });
      break;
    case "scan":
      process.exitCode = await cmdScan(process.cwd(), { json });
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

main().catch((err: unknown) => {
  console.error(err);
  process.exitCode = 1;
});
