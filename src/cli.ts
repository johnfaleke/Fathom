#!/usr/bin/env node
import { cmdInit } from "./commands/init.js";
import { cmdCheck } from "./commands/check.js";
import { cmdStatus } from "./commands/status.js";
import { cmdDiff } from "./commands/diff.js";

const VERSION = "0.1.0";

function printHelp(): void {
  console.log(`fathom ${VERSION}

Understand the work — local-first Work State with evidence.

Usage:
  fathom <command> [options]

Commands:
  init              Initialize Fathom in the current project
  status [--json]   Where does the project actually stand?
  diff [--json]     What meaningfully changed (git-backed in v0.1)
  check [--json]    Find inconsistencies and forgotten wiring

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
      process.exitCode = await cmdCheck(process.cwd(), { json });
      break;
    default:
      console.error(`Unknown command: ${command}`);
      printHelp();
      process.exitCode = 1;
  }
}

function parseStatusOptions(args: string[]): {
  json: boolean;
  current: string | null;
  completed: string[];
  incomplete: string[];
} {
  const result = {
    json: false,
    current: null as string | null,
    completed: [] as string[],
    incomplete: [] as string[],
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
        result.completed.push(value);
        i += 1;
      }
      continue;
    }
    if (arg === "--incomplete") {
      const value = args[i + 1];
      if (value && !value.startsWith("--")) {
        result.incomplete.push(value);
        i += 1;
      }
      continue;
    }
  }

  return result;
}

main().catch((err: unknown) => {
  console.error(err);
  process.exitCode = 1;
});
