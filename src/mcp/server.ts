import readline from "node:readline";
import { MCP_TOOLS, executeMCPTool } from "./tools.js";
import { MCP_RESOURCES, readMCPResource } from "./resources.js";

interface JSONRPCRequest {
  jsonrpc: "2.0";
  id?: string | number | null;
  method: string;
  params?: Record<string, unknown>;
}

interface JSONRPCResponse {
  jsonrpc: "2.0";
  id: string | number | null;
  result?: unknown;
  error?: {
    code: number;
    message: string;
    data?: unknown;
  };
}

export class FathomMCPServer {
  private readonly root: string;

  constructor(root: string) {
    this.root = root;
  }

  async start(): Promise<void> {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
      terminal: false,
    });

    rl.on("line", async (line) => {
      const trimmed = line.trim();
      if (!trimmed) return;

      try {
        const req = JSON.parse(trimmed) as JSONRPCRequest;
        const res = await this.handleRequest(req);
        if (res) {
          process.stdout.write(JSON.stringify(res) + "\n");
        }
      } catch (err) {
        const errorResponse: JSONRPCResponse = {
          jsonrpc: "2.0",
          id: null,
          error: {
            code: -32700,
            message: "Parse error",
            data: err instanceof Error ? err.message : String(err),
          },
        };
        process.stdout.write(JSON.stringify(errorResponse) + "\n");
      }
    });
  }

  async handleRequest(req: JSONRPCRequest): Promise<JSONRPCResponse | null> {
    // If it's a notification without an id, do not respond unless required
    const isNotification = req.id === undefined || req.id === null;

    switch (req.method) {
      case "initialize": {
        const result = {
          protocolVersion: "2024-11-05",
          capabilities: {
            tools: {},
            resources: {},
          },
          serverInfo: {
            name: "fathom",
            version: "0.4.0",
          },
        };
        return { jsonrpc: "2.0", id: req.id ?? null, result };
      }

      case "notifications/initialized":
      case "initialized":
        return null;

      case "ping":
        return { jsonrpc: "2.0", id: req.id ?? null, result: {} };

      case "tools/list": {
        return {
          jsonrpc: "2.0",
          id: req.id ?? null,
          result: {
            tools: MCP_TOOLS,
          },
        };
      }

      case "tools/call": {
        const toolName = String(req.params?.name ?? "");
        const toolArgs = (req.params?.arguments as Record<string, unknown>) ?? {};
        const outcome = await executeMCPTool(this.root, toolName, toolArgs);
        return {
          jsonrpc: "2.0",
          id: req.id ?? null,
          result: outcome,
        };
      }

      case "resources/list": {
        return {
          jsonrpc: "2.0",
          id: req.id ?? null,
          result: {
            resources: MCP_RESOURCES,
          },
        };
      }

      case "resources/read": {
        const uri = String(req.params?.uri ?? "");
        try {
          const outcome = await readMCPResource(this.root, uri);
          return {
            jsonrpc: "2.0",
            id: req.id ?? null,
            result: outcome,
          };
        } catch (err) {
          return {
            jsonrpc: "2.0",
            id: req.id ?? null,
            error: {
              code: -32602,
              message: err instanceof Error ? err.message : String(err),
            },
          };
        }
      }

      default:
        if (isNotification) return null;
        return {
          jsonrpc: "2.0",
          id: req.id ?? null,
          error: {
            code: -32601,
            message: `Method not found: ${req.method}`,
          },
        };
    }
  }
}
