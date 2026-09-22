import test from "node:test";
import assert from "node:assert/strict";
import { classifyFile, buildSemanticMap } from "../src/core/semantic-map.js";

test("classifyFile correctly identifies software domains and roles", () => {
  assert.equal(classifyFile("src/webhooks/stripe.ts").domain, "api");
  assert.equal(classifyFile("src/webhooks/stripe.ts").role, "Webhook receiver");

  assert.equal(classifyFile("prisma/migrations/20260922_init.sql").domain, "database");
  assert.equal(classifyFile("prisma/migrations/20260922_init.sql").role, "Database migration");

  assert.equal(classifyFile("src/models/user.ts").domain, "database");
  assert.equal(classifyFile("src/models/user.ts").role, "Data model");

  assert.equal(classifyFile(".env.example").domain, "config");
  assert.equal(classifyFile(".env.example").role, "Environment variables");

  assert.equal(classifyFile("tests/cli.test.ts").domain, "tests");
  assert.equal(classifyFile("tests/cli.test.ts").role, "Test suite");

  assert.equal(classifyFile("README.md").domain, "docs");
  assert.equal(classifyFile("README.md").role, "Project README");

  assert.equal(classifyFile(".github/workflows/ci.yml").domain, "tooling");
  assert.equal(classifyFile(".github/workflows/ci.yml").role, "GitHub Actions workflow");

  assert.equal(classifyFile("src/services/billing.ts").domain, "logic");
  assert.equal(classifyFile("src/services/billing.ts").role, "Service layer");
});

test("buildSemanticMap groups files into sorted domain buckets", () => {
  const files = [
    { path: "src/api/routes.ts" },
    { path: "src/webhooks/stripe.ts" },
    { path: "prisma/schema.prisma" },
    { path: "src/services/billing.ts" },
    { path: ".env.example" },
    { path: "tests/api.test.ts" },
    { path: "README.md" },
  ];

  const map = buildSemanticMap(files);
  const domains = map.map((g) => g.domain);

  assert.ok(domains.includes("api"));
  assert.ok(domains.includes("database"));
  assert.ok(domains.includes("logic"));
  assert.ok(domains.includes("config"));
  assert.ok(domains.includes("tests"));
  assert.ok(domains.includes("docs"));

  const apiGroup = map.find((g) => g.domain === "api");
  assert.equal(apiGroup?.count, 2);
});
