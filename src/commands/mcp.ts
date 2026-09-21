import path from "node:path";
import { FathomMCPServer } from "../mcp/server.js";

export async function cmdMCP(cwd: string): Promise<number> {
  const root = path.resolve(cwd);
  const server = new FathomMCPServer(root);
  await server.start();
  return 0;
}
