import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { spawn, execFile } from "node:child_process";
import { promisify } from "node:util";
import path from "node:path";
import { fileURLToPath } from "node:url";

const execFileAsync = promisify(execFile);
const projectRoot = fileURLToPath(new URL("..", import.meta.url));
const cliPath = path.join(projectRoot, "dist", "cli.js");

function sendJSONRPC(proc: any, msg: any): Promise<any> {
  return new Promise((resolve, reject) => {
    let buffer = "";
    const onData = (chunk: Buffer) => {
      buffer += chunk.toString("utf8");
      const lines = buffer.split("\n");
      for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed) {
          try {
            const parsed = JSON.parse(trimmed);
            if (parsed.id === msg.id) {
              proc.stdout.off("data", onData);
              resolve(parsed);
              return;
            }
          } catch {
            // keep buffering
          }
        }
      }
    };
    proc.stdout.on("data", onData);
    proc.stdin.write(JSON.stringify(msg) + "\n");
  });
}

test("MCP server lifecycle: initialize, tools/list, resources/list, tools/call, and resources/read", async () => {
  const tempDir = mkdtempSync(path.join(tmpdir(), "fathom-mcp-test-"));
  mkdirSync(path.join(tempDir, "src"), { recursive: true });

  writeFileSync(
    path.join(tempDir, "package.json"),
    JSON.stringify({ name: "fixture-mcp-app", version: "1.0.0" }, null, 2),
  );

  writeFileSync(
    path.join(tempDir, "src", "index.ts"),
    "const secret = process.env.DATABASE_KEY;\nconsole.log(secret);\n",
  );

  // Initialize workspace first
  await execFileAsync(process.execPath, [cliPath, "init"], {
    cwd: tempDir,
    env: process.env,
  });

  // Spawn MCP server
  const serverProc = spawn(process.execPath, [cliPath, "mcp"], {
    cwd: tempDir,
    env: process.env,
    stdio: ["pipe", "pipe", "pipe"],
  });

  try {
    // 1. initialize
    const initRes = await sendJSONRPC(serverProc, {
      jsonrpc: "2.0",
      id: 1,
      method: "initialize",
      params: {
        protocolVersion: "2024-11-05",
        capabilities: {},
        clientInfo: { name: "test-client", version: "1.0.0" },
      },
    });

    assert.equal(initRes.result.serverInfo.name, "fathom");
    assert.equal(initRes.result.serverInfo.version, "0.4.0");
    assert.ok(initRes.result.capabilities.tools);
    assert.ok(initRes.result.capabilities.resources);

    // 2. tools/list
    const toolsRes = await sendJSONRPC(serverProc, {
      jsonrpc: "2.0",
      id: 2,
      method: "tools/list",
    });

    const toolNames = toolsRes.result.tools.map((t: any) => t.name);
    assert.ok(toolNames.includes("fathom_status"));
    assert.ok(toolNames.includes("fathom_explain"));
    assert.ok(toolNames.includes("fathom_scan"));
    assert.ok(toolNames.includes("fathom_check"));
    assert.ok(toolNames.includes("fathom_set_work"));
    assert.ok(toolNames.includes("fathom_diff"));
    assert.ok(toolNames.includes("fathom_get_model"));

    // 3. resources/list
    const resList = await sendJSONRPC(serverProc, {
      jsonrpc: "2.0",
      id: 3,
      method: "resources/list",
    });

    const resourceUris = resList.result.resources.map((r: any) => r.uri);
    assert.ok(resourceUris.includes("fathom://sounding"));
    assert.ok(resourceUris.includes("fathom://state"));
    assert.ok(resourceUris.includes("fathom://model"));
    assert.ok(resourceUris.includes("fathom://config"));
    assert.ok(resourceUris.includes("fathom://events"));

    // 4. tools/call -> fathom_set_work
    const setWorkRes = await sendJSONRPC(serverProc, {
      jsonrpc: "2.0",
      id: 4,
      method: "tools/call",
      params: {
        name: "fathom_set_work",
        arguments: {
          currentWork: "Integrate MCP Server",
          completed: ["Tool definitions"],
          incomplete: ["Documentation"],
        },
      },
    });

    const setWorkData = JSON.parse(setWorkRes.result.content[0].text);
    assert.equal(setWorkData.currentWork, "Integrate MCP Server");
    assert.equal(setWorkData.completed.length, 1);
    assert.equal(setWorkData.incomplete.length, 1);

    // 5. tools/call -> fathom_check
    const checkRes = await sendJSONRPC(serverProc, {
      jsonrpc: "2.0",
      id: 5,
      method: "tools/call",
      params: {
        name: "fathom_check",
      },
    });

    const checkData = JSON.parse(checkRes.result.content[0].text);
    assert.ok(checkData.findings.some((f: any) => f.id === "config.env-var-missing"));
    assert.ok(checkData.attention >= 1);

    // 6. tools/call -> fathom_scan
    const scanRes = await sendJSONRPC(serverProc, {
      jsonrpc: "2.0",
      id: 6,
      method: "tools/call",
      params: {
        name: "fathom_scan",
      },
    });

    const scanData = JSON.parse(scanRes.result.content[0].text);
    assert.equal(scanData.project.name, "fixture-mcp-app");
    assert.ok(scanData.claims.length > 0);

    // 7. resources/read -> fathom://state
    const readRes = await sendJSONRPC(serverProc, {
      jsonrpc: "2.0",
      id: 7,
      method: "resources/read",
      params: {
        uri: "fathom://state",
      },
    });

    const stateContent = JSON.parse(readRes.result.contents[0].text);
    assert.equal(stateContent.currentWork, "Integrate MCP Server");
  } finally {
    serverProc.kill();
  }
});
