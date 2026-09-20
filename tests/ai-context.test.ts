import test from "node:test";
import assert from "node:assert/strict";
import { collectSafeAIContext } from "../src/ai/context.js";
import type { ProjectContext } from "../src/types.js";

test("safe AI context excludes secrets, binaries, and oversized files", async () => {
  const contents: Record<string, string> = {
    "src/app.ts": "export const answer = 42;\n",
    ".env": "API_KEY=secret\n",
    "config/credentials.json": "{\"token\":\"secret\"}\n",
    "assets/logo.png": "not text",
    "docs/large.md": "x".repeat(20),
  };
  const ctx: ProjectContext = {
    root: "/fixture",
    fathomDir: "/fixture/.fathom",
    files: Object.keys(contents),
    async readText(relPath) {
      return contents[relPath] ?? null;
    },
    async exists() {
      return true;
    },
  };

  const result = await collectSafeAIContext(ctx, { maxFileBytes: 10 });

  assert.deepEqual(result.files, {});
  assert.deepEqual(
    result.excluded.map((item) => [item.path, item.reason]),
    [
      ["src/app.ts", "too-large"],
      [".env", "sensitive"],
      ["config/credentials.json", "sensitive"],
      ["assets/logo.png", "binary"],
      ["docs/large.md", "too-large"],
    ],
  );
});

test("safe AI context supports an explicit file allowlist", async () => {
  const ctx: ProjectContext = {
    root: "/fixture",
    fathomDir: "/fixture/.fathom",
    files: ["README.md", "src/app.ts"],
    async readText(relPath) {
      return relPath === "README.md" ? "Project notes" : "source";
    },
    async exists() {
      return true;
    },
  };

  const result = await collectSafeAIContext(ctx, { includePaths: ["README.md"] });

  assert.deepEqual(result.files, { "README.md": "Project notes" });
  assert.deepEqual(result.excluded, [{ path: "src/app.ts", reason: "not-allowed" }]);
});
