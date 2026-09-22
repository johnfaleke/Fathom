import { test } from "node:test";
import assert from "node:assert/strict";
import { extractSourceSymbols } from "../src/core/ast.js";

test("AST extracts ESM imports, named symbols, and dynamic imports", () => {
  const code = `
import path from "node:path";
import { readFile, writeFile as write } from "node:fs/promises";
import * as utils from "./utils.js";
import "dotenv/config";

async function load() {
  const dynamic = await import("./lazy-module.js");
  const envKey = process.env.API_SECRET_KEY;
  const clientKey = import.meta.env.VITE_CLIENT_ID;
}
`;

  const symbols = extractSourceSymbols("src/app.ts", code);

  assert.equal(symbols.imports.length, 5);
  assert.equal(symbols.imports[0].specifier, "node:path");
  assert.equal(symbols.imports[0].isDefault, true);

  assert.equal(symbols.imports[1].specifier, "node:fs/promises");
  assert.deepEqual(symbols.imports[1].symbols, ["readFile", "writeFile"]);

  assert.equal(symbols.imports[2].isNamespace, true);
  assert.equal(symbols.imports[4].isDynamic, true);

  assert.deepEqual(symbols.envVars, ["API_SECRET_KEY", "VITE_CLIENT_ID"]);
});

test("AST extracts exports and HTTP route definitions", () => {
  const code = `
export const PORT = 3000;
export function handleRequest(req, res) {}
export class UserService {}
export interface UserPayload {}
export type ID = string;
export default function main() {}

app.get("/api/v1/users", (req, res) => {});
router.post("/api/v1/auth/login", (req, res) => {});
`;

  const symbols = extractSourceSymbols("src/routes.ts", code);

  assert.equal(symbols.exports.length, 6);
  assert.ok(symbols.exports.some(e => e.name === "PORT" && e.kind === "const"));
  assert.ok(symbols.exports.some(e => e.name === "handleRequest" && e.kind === "function"));
  assert.ok(symbols.exports.some(e => e.name === "UserService" && e.kind === "class"));
  assert.ok(symbols.exports.some(e => e.name === "UserPayload" && e.kind === "interface"));
  assert.ok(symbols.exports.some(e => e.name === "ID" && e.kind === "type"));

  assert.equal(symbols.routes.length, 2);
  assert.equal(symbols.routes[0].method, "GET");
  assert.equal(symbols.routes[0].path, "/api/v1/users");
  assert.equal(symbols.routes[1].method, "POST");
  assert.equal(symbols.routes[1].path, "/api/v1/auth/login");
});
