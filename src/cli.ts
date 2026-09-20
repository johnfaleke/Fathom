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
  const json = args.includes("--json");

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
      process.exitCode = await cmdStatus(process.cwd(), { json });
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

main().catch((err: unknown) => {
  console.error(err);
  process.exitCode = 1;
});
