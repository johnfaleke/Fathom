import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { initFathom } from "../src/core/storage.js";
import { cmdScan } from "../src/commands/scan.js";

test("scan builds and persists an evidence-backed project model", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "fathom-scan-"));
  await initFathom(root);
  await writeFile(path.join(root, "package.json"), JSON.stringify({
    name: "fixture-project",
    dependencies: { react: "^19.0.0" },
    devDependencies: { typescript: "^5.0.0" },
  }), "utf8");
  await writeFile(path.join(root, "app.tsx"), "export const App = () => null;\n", "utf8");

  assert.equal(await cmdScan(root, { json: true }), 0);
  const model = JSON.parse(await readFile(path.join(root, ".fathom", "model.json"), "utf8"));

  assert.equal(model.version, 1);
  assert.equal(model.project.name, "fixture-project");
  assert.ok(model.project.files >= 2);
  assert.deepEqual(model.project.stack, ["TypeScript", "React"]);
  assert.deepEqual(model.project.dependencies, ["react", "typescript"]);
  assert.equal(model.claims[0].predicate, "uses");
  assert.ok(model.claims[0].evidence.length >= 1);
});
