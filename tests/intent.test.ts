import test from "node:test";
import assert from "node:assert/strict";
import { inferObjective } from "../src/core/intent.js";
import { buildSemanticMap } from "../src/core/semantic-map.js";

test("inferObjective deduces objective from git feature branch", () => {
  const map = buildSemanticMap([
    { path: "src/webhooks/stripe.ts" },
    { path: "src/billing/checkout.ts" },
  ]);

  const obj = inferObjective(
    {
      branch: "feat/stripe-subscriptions",
      recentCommits: ["feat(billing): add stripe webhook handler"],
      changedFiles: ["src/webhooks/stripe.ts"],
      isClean: false,
    },
    map,
  );

  assert.equal(obj.title, "Implement Stripe Subscriptions");
  assert.ok(obj.confidence >= 0.9);
  assert.equal(obj.source, "branch");
  assert.ok(obj.evidence.some((e) => e.includes("feat/stripe-subscriptions")));
});

test("inferObjective falls back to cleaned recent commit on main branch", () => {
  const map = buildSemanticMap([{ path: "src/auth/session.ts" }]);

  const obj = inferObjective(
    {
      branch: "main",
      recentCommits: ["fix(auth): resolve session token expiration leak"],
      changedFiles: ["src/auth/session.ts"],
      isClean: false,
    },
    map,
  );

  assert.equal(obj.title, "Resolve session token expiration leak");
  assert.ok(obj.confidence >= 0.8);
  assert.equal(obj.source, "git");
});

test("inferObjective respects explicit manual work state with highest confidence", () => {
  const map = buildSemanticMap([]);

  const obj = inferObjective(
    {
      branch: "feat/custom-branch",
      recentCommits: [],
      changedFiles: [],
      isClean: true,
    },
    map,
    "Ship the billing flow",
  );

  assert.equal(obj.title, "Ship the billing flow");
  assert.equal(obj.confidence, 0.98);
  assert.equal(obj.source, "manual");
});
