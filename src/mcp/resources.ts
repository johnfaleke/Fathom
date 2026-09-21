import path from "node:path";
import { readFile } from "node:fs/promises";
import { fathomPaths, isInitialized } from "../core/storage.js";

export interface MCPResourceDefinition {
  uri: string;
  name: string;
  description: string;
  mimeType: string;
}

export const MCP_RESOURCES: MCPResourceDefinition[] = [
  {
    uri: "fathom://state",
    name: "Fathom Work State",
    description: "The active project Work State snapshot (.fathom/state.json)",
    mimeType: "application/json",
  },
  {
    uri: "fathom://model",
    name: "Fathom Project Model",
    description: "The durable evidence-backed Project Model (.fathom/model.json)",
    mimeType: "application/json",
  },
  {
    uri: "fathom://config",
    name: "Fathom Config",
    description: "Local project configuration and ignore rules (.fathom/config.json)",
    mimeType: "application/json",
  },
  {
    uri: "fathom://events",
    name: "Fathom Event Log",
    description: "Append-only log of repository checks, scans, and updates (.fathom/events.jsonl)",
    mimeType: "text/plain",
  },
];

export async function readMCPResource(
  root: string,
  uri: string,
): Promise<{ contents: Array<{ uri: string; mimeType: string; text: string }> }> {
  const absRoot = path.resolve(root);

  if (!(await isInitialized(absRoot))) {
    throw new Error("Fathom is not initialized in this workspace.");
  }

  const paths = fathomPaths(absRoot);
  let filePath: string;
  let mimeType = "application/json";

  switch (uri) {
    case "fathom://state":
      filePath = paths.state;
      break;
    case "fathom://model":
      filePath = paths.model;
      break;
    case "fathom://config":
      filePath = paths.config;
      break;
    case "fathom://events":
      filePath = paths.events;
      mimeType = "text/plain";
      break;
    default:
      throw new Error(`Resource not found: ${uri}`);
  }

  try {
    const text = await readFile(filePath, "utf8");
    return {
      contents: [{ uri, mimeType, text }],
    };
  } catch (error) {
    throw new Error(`Failed to read resource ${uri}: ${error instanceof Error ? error.message : String(error)}`);
  }
}
