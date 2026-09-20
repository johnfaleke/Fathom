# FATHOM

> **AI can generate the work. Fathom helps you understand the work.**

Fathom is an open-source, local-first tool that catches the inconsistencies and
forgotten wiring that AI-assisted development leaves behind — provably, and with
evidence.

Run it in any project. Get a structured, understandable picture of the current
state of the work. No account. No cloud. No telemetry.

---

## The problem

AI coding agents have collapsed the cost of producing code. A single developer can
now generate changes faster than any human can reasonably review, track, or trust.

The bottleneck is no longer code generation.

It is understanding, verifying, and maintaining the state of the work being produced.

Developers now routinely ask:

- What actually changed?
- What is complete, and what only looks complete?
- What contradicts something else in the project?
- What did we forget to wire up?
- Can I confidently say this work is done?

`git` answers *which lines changed*. It does not answer *what meaningfully
changed about the software*, or *what no longer lines up*. Asking an AI "what
changed?" produces a plausible-sounding answer with no evidence behind it.

Fathom exists to answer:

> **"What is actually happening with my project, and is the work really done?"**

And it answers with evidence you can inspect, not an opinion you have to take on faith.

---

## One honest promise

Fathom is not a chatbot and not another coding agent.

Fathom makes one promise, and holds to it before anything else:

> **Fathom reliably finds the things you forgot to wire up across your project —
> locally, with no account, and with evidence you can verify.**

Everything else is a consequence of doing that one thing well.

---

## The name

To fathom something is to understand it — fully, not approximately. A fathom is also
a measure of depth: a fixed unit, not a guess. Sailors took soundings against that
measure to know where they actually stood.

That is precisely what Fathom does. It takes a reading of a project's artifacts and
tells you how deep the work really goes — what is complete, what is missing, and what
no longer lines up. No opinion, no guessing — just measurement against evidence.

---

## The core primitive: Work State

The fundamental concept in Fathom is **Work State**.

A Work State is a machine-readable representation of the current state of a piece of
software work. It combines observable project evidence with clearly-labelled,
AI-assisted interpretation.

```text
Human intent
    ↓
Human / AI work
    ↓
Repository evidence
    ↓
Fathom
    ↓
Work State
```

A Work State may describe:

- current, completed, and incomplete work
- meaningful changes
- project and architecture structure
- dependencies and configuration
- test and documentation state
- contradictions and inconsistencies
- missing follow-ups and unresolved decisions
- potential risks and recommended next actions

The Work State is designed to be consumed by other tools, not merely printed to a
terminal. It is a format first and a CLI second.

---

## The design principle that makes Fathom trustworthy

Fathom must never blur the line between what it observed and what it inferred. Every
output is one of two kinds of thing:

### Evidence

Things directly observable from the project. Examples:

- Git history, diffs, and changed files
- filesystem and project structure
- package manifests and dependencies
- source, configuration, and documentation files
- tests and test results
- `TODO` / `FIXME` markers
- environment examples

### Interpretation

Things inferred from evidence, potentially using an LLM. Examples:

- architectural intent
- likely incomplete work
- contradictions
- stale TODOs
- missing follow-ups
- project-level meaning and risk
- suggested next steps

**Fathom must never present an AI inference as if it were observed fact.**

Bad:

> "Your feature is 78% complete."

Better:

> "Based on the available evidence, the feature appears incomplete because 2 tests
> are failing, the required environment variable is undocumented, and the README
> does not describe the new API."

The goal is **evidence-backed intelligence**, not an AI opinion disguised as certainty.

---

## Correctness is the product

In a local, open-source tool, no one is standing next to the user to explain a false
positive. A wrong answer doesn't start a conversation — it ends one. Trust is not a
feature of Fathom; it *is* Fathom.

This has a direct consequence for how value is ordered:

1. **Provably-correct checks come first.** Cross-artifact checks that cannot be wrong:

   - an environment variable used in code but missing from `.env.example`
   - a dependency imported by code but not declared in the manifest
   - a configuration key referenced but never defined
   - a route, command, or endpoint added with no test and no documentation
   - a path or module referenced that does not exist

   These are unglamorous, deterministic, and verifiable. They build trust, and they are
   exactly the ground that flashier tools tend to skip.

2. **The interpretation layer comes second.** README-versus-implementation
   contradictions, stale TODOs, architectural intent, and risk. These are valuable but
   fallible, so they are:

   - always labelled as interpretation
   - always shown with the evidence they were derived from
   - opt-in where they require an LLM

When a check can be deterministic, it must be deterministic. Only reach for the model
when the problem is genuinely interpretive.

Fathom prefers "potential inconsistency" over a confident claim when the evidence is
ambiguous.

---

## What Fathom is not

To stay honest and focused, Fathom is deliberately **not**:

- a coding agent or code generator
- an AI chatbot
- a cloud platform
- a system that requires user accounts, authentication, or billing
- a service that silently uploads repositories
- a wrapper around a single AI vendor

Fathom does not compete with coding agents. It works alongside them. It understands the
resulting project state through observable evidence, so it works the same whether the
code was written by a human, an agent, or both.

---

## Commands

### `fathom init`

Initializes Fathom inside an existing project.

```bash
npx fathom init
```

Creates a local `.fathom/` directory:

```text
.fathom/
├── state.json     # the current Work State
├── events.jsonl   # an append-only record of observations and runs
└── config.json    # local configuration
```

Fathom is local-first. No account is required. No cloud service is required. The exact
structure may evolve.

### `fathom status`

The primary command. Answers: *"Where does my project actually stand?"*

```text
FATHOM STATUS

Current work
Add Stripe subscriptions

COMPLETED
✓ Subscription model
✓ Checkout endpoint
✓ Database migration

INCOMPLETE
⚠ Webhook retry handling
⚠ Integration tests

INCONSISTENCIES
⚠ README says JWT authentication
  Implementation uses sessions

MISSING
⚠ STRIPE_WEBHOOK_SECRET is used
  but missing from .env.example

CHANGES
14 files
+1 dependency
+3 API endpoints
+1 database migration

ATTENTION
3 things are worth reviewing.
```

### `fathom diff`

A semantic, project-level diff. Git answers *which lines changed*; Fathom answers
*what meaningfully changed about the software*.

```text
FATHOM DIFF

ARCHITECTURE
→ Added asynchronous payment processing

API
+ POST /subscriptions
+ POST /webhooks/stripe

DATABASE
+ subscriptions table

DEPENDENCIES
+ stripe

CONFIGURATION
+ STRIPE_SECRET_KEY
+ STRIPE_WEBHOOK_SECRET

TESTS
+ 11
⚠ 2 failing

DOCUMENTATION
⚠ README not updated
```

Categories: architecture, API, database, dependencies, configuration, tests,
documentation, infrastructure.

### `fathom check`

Inspects the project for inconsistencies and likely missing work. Examples:

- README contradicts implementation
- environment variables used by code are missing from `.env.example`
- an API exists but has no corresponding documentation
- a major feature has no meaningful tests
- a TODO appears to have already been implemented
- configuration references something that does not exist
- code references a dependency not properly declared

```text
FATHOM CHECK

3 inconsistencies found.

⚠ Documentation
README describes JWT authentication.
Implementation uses sessions.

⚠ Configuration
STRIPE_WEBHOOK_SECRET is required by code
but missing from .env.example.

⚠ Testing
Webhook retry behavior has no integration test.

○ STALE TODO
"Implement subscriptions"
appears to already be implemented.

4 things may require attention.
```

The exact UI is not fixed. Clarity and developer experience are the priorities.

---

## The Work State schema

The most durable thing Fathom produces is not a terminal rendering. It is the
**Work State schema**: a clean, versioned, documented JSON shape for project state,
emitted by `fathom status`, `fathom diff`, and `fathom check`.

Any tool can consume it. Any tool can emit it. Agents can write to it. Editors and CI
can read from it.

Fathom does not attempt to govern a standard. It ships a good format, and if it proves
useful, adoption makes it a standard naturally. A format earns that position; it is
not granted by declaration.

---

## Extensibility: built to be built on

Fathom's value grows with the checks and integrations the community adds. That requires
real seams in the very first release — not finished integrations, just a clean,
documented surface to extend.

A **check** is a function that inspects project evidence and emits findings:

```ts
type Severity = "info" | "warning" | "potential";

interface Finding {
  id: string;          // stable, namespaced, e.g. "config.env-var-missing"
  category: string;    // "configuration" | "documentation" | "testing" | ...
  severity: Severity;  // evidence-based; "potential" signals uncertainty
  message: string;     // human-readable
  evidence: Evidence[];// what was observed to produce this finding
}

interface Check {
  id: string;
  run(ctx: ProjectContext): Promise<Finding[]>;
}
```

Because every finding carries its evidence, third-party checks inherit Fathom's central
promise: the user can always see *why* Fathom said something.

The path to a first contribution should be short and obvious — **add a check in about
twenty lines.** The same interface later supports provider adapters and agent adapters
without redesigning the core.

---

## AI and model usage

Fathom uses the user's own AI API key. The project does not pay for inference on behalf
of other developers, and developers are never billed for someone else's usage.

The MVP prioritizes **one provider** behind a **clean provider interface**. Additional
providers are added later without touching the core.

Intended provider coverage over time: OpenAI, Anthropic, Google, OpenRouter, and other
compatible providers.

Models are used only where interpretation is genuinely required, never as a substitute
for a deterministic check that could have been exact.

---

## Privacy

Privacy is part of Fathom's identity, not a policy bolted on later.

- **Local-first.** Fathom works without a backend.
- **No silent uploads.** Fathom makes it obvious when project information is sent to an
  external LLM.
- **No telemetry by default.**
- **Sensitive data never leaves the machine.** `.env` files, private keys, credentials,
  and secrets are never sent to an LLM.
- **Explicit ignore rules.** File filtering and ignore configuration are first-class.

---

## Adoption targets

Fathom succeeds if developers *reach for it* — alone, with agents, and at work.
Adoption is sequenced so each layer earns the next. Local-first trust never becomes
optional.

### 1. Solo developers

The habit loop: after a burst of work (human or agent), run `fathom status` or
`fathom check`.

- Seconds to run, almost nothing to configure
- Quiet when the project is clean; loud when something is unwired
- Useful with no API key and no account
- Default output answers *"what needs my attention?"* in a short scan

If a solo developer does not open Fathom after a long coding session, the product
has not earned its place.

### 2. Coding agents

Agents generate change faster than humans can track it. Fathom is the shared
board they write to and humans read from.

- Agents read and write **Work State** (MCP and adapters come after the core)
- A session can leave behind completed / incomplete / missing follow-ups with evidence
- Humans do not re-ask "what did the agent do?" into another chat — they inspect state
- Same checks run whether the author was a person, an agent, or both

Agent-native is not a plugin bolted on later; it is how Fathom stays relevant when
most code is machine-assisted.

### 3. Company workspaces

Teams adopt Fathom because it plugs into how they already ship — not because they
must move repos into a cloud product.

- CI: exit codes and `--json` so Work State can gate or annotate a change
- PRs: short, evidence-backed findings — not LLM walls of text
- Org check packs and shared ignore/secrets rules security can approve
- Optional team visibility later; the CLI and local `.fathom/` remain enough to work

Individuals love Fathom because it is local and honest. Companies require it because
it is correct, automatable, and policy-friendly.

---

## Roadmap

Scope discipline is what makes an open-source project last. Each stage is shippable and
useful on its own.

### v0.1 — Deterministic core

- `fathom init`, `fathom status`, `fathom diff`, `fathom check`
- Work State schema, versioned and documented
- A set of provably-correct cross-artifact checks (env vars, dependencies, config,
  missing tests/docs)
- Public check interface, with a documented "add a check" path
- Local-only. No LLM required to get value.

### v0.2 — Interpretation, carefully

- Opt-in LLM provider interface with a single supported provider
- Interpretation findings that always carry their evidence
- Explicit, inspectable file filtering for anything sent to a model

### v0.3 — Automation surfaces

- Machine-readable output (`--json`) for every command
- CI usage, so a Work State can gate or annotate a change

### Later — Ecosystem

- MCP server, so agents can read and write Work State
- Editor integrations
- Adapters letting agents explicitly communicate work state to Fathom

Everything beyond v0.1 is explicitly *later*. None of it is required for Fathom to be
useful.

---

## Open source

Fathom is open source so that it can be used, understood, scrutinized, and extended.

- **Local-first and transparent.** The user can inspect exactly what Fathom does.
- **Composable and model-agnostic.** No part of the core is tied to one vendor.
- **Agent-agnostic.** Fathom understands project state, not one particular tool.

What makes an open-source project real is not the license file. It is the ability for a
stranger to run it and get a correct, useful result — and then to extend it in a single
sitting. That is the standard Fathom aims to meet:

- a README whose first screen shows real output on a real project
- tests and CI that run on every change
- a documented check interface
- a contribution path measured in minutes, not days
- honest, clearly-labelled interpretation

---

## Product philosophy

Fathom should feel like a tool developers barely notice until they need it.

It should be fast, local, simple, developer-native, transparent, open-source,
composable, model-agnostic, and agent-agnostic.

Every feature should help answer one of these questions:

1. What was I trying to do?
2. What actually changed?
3. What has been completed?
4. What remains?
5. What doesn't make sense?
6. What did we forget?
7. What needs my attention?
8. Can I confidently say this work is done?

If a feature does not contribute to one of these questions, it probably does not belong
in Fathom.

---

## The core statement

Fathom is not trying to make AI code faster.

AI already made coding faster.

Fathom is trying to make the **human side of AI-assisted development keep up**.

> **AI can generate the work. Fathom helps you understand the work.**
