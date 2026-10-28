import test from "node:test";
import assert from "node:assert/strict";
import { envVarCheck } from "../src/checks/env-vars.js";
import { renderFindings, renderGitHubAnnotations } from "../src/render/terminal.js";
import type { Finding, ProjectContext } from "../src/types.js";

function context(files: Record<string, string>): ProjectContext {
  return {
    root: "/fixture",
    fathomDir: "/fixture/.fathom",
    files: Object.keys(files),
    readText: async (file) => files[file] ?? null,
    exists: async (file) => file in files,
  };
}

for (const [name, newline] of [["LF", "\n"], ["CRLF", "\r\n"], ["CR", "\r"]]) {
  test(`env evidence retains the first match per file with ${name} lines`, async () => {
    const findings = await envVarCheck.run(context({
      "src/b.ts": "process.env.API_KEY;",
      "src/a.ts": [
        "// Configuration",
        "",
        'const key = process.env["API_KEY"]; process.env.OTHER_KEY;',
        "process.env.API_KEY;",
      ].join(newline),
      ".env.example": "OTHER_KEY=\n",
    }));
    assert.equal(findings.length, 1);
    assert.deepEqual(findings[0].evidence, [
      { kind: "env-usage", path: "src/a.ts", line: 3, detail: "Referenced in 2 file(s)" },
      { kind: "source", path: "src/a.ts", line: 3, detail: 'process.env["API_KEY"]' },
      { kind: "source", path: "src/b.ts", line: 1, detail: "process.env.API_KEY" },
      { kind: "missing-doc", path: ".env.example", detail: "API_KEY is not listed in .env.example" },
    ]);
  });
}

test("env evidence keeps the five-file limit and missing-file evidence has no line", async () => {
  const files: Record<string, string> = {};
  for (let index = 6; index >= 0; index--) {
    files[`src/${index}.ts`] = "\n".repeat(index) + "process.env['API_KEY'];";
  }
  const [finding] = await envVarCheck.run(context(files));
  const sources = finding.evidence.filter((e) => e.kind === "source");
  assert.deepEqual(sources.map((e) => [e.path, e.line]), [
    ["src/0.ts", 1], ["src/1.ts", 2], ["src/2.ts", 3], ["src/3.ts", 4], ["src/4.ts", 5],
  ]);
  assert.equal(finding.evidence[0].detail, "Referenced in 7 file(s)");
  assert.deepEqual(finding.evidence.at(-1), {
    kind: "missing-doc", path: ".env.example", detail: ".env.example does not exist",
  });
});

test("documented variables and test-only references still produce no findings", async () => {
  assert.deepEqual(await envVarCheck.run(context({
    "src/app.ts": "process.env.DOCUMENTED;",
    "tests/app.ts": "process.env.TEST_ONLY;",
    "src/app.test.ts": "process.env.TEST_ONLY;",
    ".env.example": "DOCUMENTED=\n",
  })), []);
});

test("renderers keep path-only evidence compatible", () => {
  const finding: Finding = {
    id: "example", category: "configuration", severity: "warning", message: "Review config",
    evidence: [{ kind: "source", path: "src/app.ts", detail: "An existing finding" }],
  };
  assert.equal(renderGitHubAnnotations([finding]),
    "::warning file=src/app.ts,title=Configuration::Review config\n");
  assert.match(renderFindings([finding]), /src\/app\.ts: An existing finding/);
});
