# AI Coding Debug Workspace Redesign

## Background

The current CodeVerdict practice platform is built around single-file
stdin/stdout problems under `problems/<slug>/`. That model fits classic
algorithm questions, but it distorts the Amazon-style AI Coding / Debug prompts
that ask the user to fix a few files inside an existing repository or service.

The current imported `amazon-debug-*` entries were intentionally stored as
stdin/stdout adaptations to stay within the existing product boundary. That was
acceptable as a compatibility-first import, but it is not the right long-term
design if the goal is to represent real bug-fix tasks.

## Goal

Define a repository-backed problem model, workspace UX, and evaluation flow for
AI coding / debug questions that behave like “fix the broken repo” tasks rather
than LeetCode-style algorithm prompts.

## Scope

In scope:

- Define the new problem type and on-disk schema
- Define the workspace UX and runner behavior
- Define evaluation semantics for visible and hidden tests
- Define guardrails for resource cleanup and Docker/Judge0 separation
- Define a migration path for the existing `amazon-debug-*` problems

Out of scope:

- Fully implementing the new runner in this planning change
- Rebuilding every existing debug problem immediately
- General-purpose cloud IDE features, collaboration, or arbitrary shell access

## Current Gaps

- Current debug problems are represented as data-transformation tasks rather than
  repository bug-fix tasks.
- The existing practice API only understands a single code blob per language.
- The workspace UI exposes one Monaco buffer, not a file tree plus editable file
  set.
- Judge0 is designed for compile/run of a single submission, not “seed a repo,
  edit multiple files, run a test command, and grade by test outcomes”.

## Recommended Direction

Add a second first-class practice problem type: `debug-workspace`.

Algorithm problems stay on the current stdin/stdout path. AI coding / debug
problems move to a repository-backed multi-file workspace path with explicit
test commands and editable-file constraints.

## Proposed Problem Directory Shape

```text
problems/<slug>/
  problem.yaml
  editorial.md
  workspace/
    manifest.json
    seed/
      ... broken project files ...
    expected/
      optional/patch-hints/oracle-files
  tests/
    visible/
      001.json
      002.json
    hidden/
      001.json
  assets/
    optional screenshots, diagrams, fixtures
```

## Proposed Metadata Additions

`problem.yaml` should support:

- `questionType: debug-workspace`
- `stack`: `python`, `node`, `java`, etc.
- `entryFiles`: initial files to open in the editor
- `editablePaths`: allowlist of files the user may modify
- `workspaceManifest`: pointer to `workspace/manifest.json`
- `runnerProfile`: the runtime profile used to execute tests

`workspace/manifest.json` should define:

- seed directory root
- visible test commands
- hidden test commands
- install/build command if needed
- file open order
- per-file readOnly flags
- optional known issues list shown in the prompt

## Workspace UX

For `debug-workspace` problems, the left/right LeetCode layout is not enough.
The workspace should become:

1. Prompt and issue list
2. File tree
3. Multi-file editor tabs
4. Visible test runner panel
5. Submission panel
6. Editorial / answer-analysis panel

The user flow should be:

1. Read the repo scenario and known bugs
2. Open allowed files
3. Edit multiple files
4. Run visible tests
5. Submit against full test suite
6. Review hidden/visible failure summaries

## Evaluation Model

The grading unit should be the workspace snapshot, not a single source string.

Recommended submit flow:

1. Materialize an ephemeral workspace from `workspace/seed/`
2. Apply the user’s edited files only within `editablePaths`
3. Run setup/build/test commands from the manifest inside an isolated runner
4. Convert test results into:
   - visible pass/fail details for local runs
   - hidden-safe summary for submit
5. Persist the patch or edited-file map in submission history

## Runner Architecture

Do not force this problem type through Judge0.

Recommended split:

- `stdin/stdout` problems: keep current Judge0 path
- `debug-workspace` problems: use a dedicated local runner service or command
  executor with language-specific profiles

That runner should:

- create per-run temp directories
- copy only the workspace seed for the current problem
- enforce file and command allowlists
- set hard CPU/memory/time limits
- remove temp directories after run completion

## Resource Hygiene

To avoid repeating Judge0/Docker sprawl:

- keep debug-workspace runner isolated from Judge0 containers
- use one reusable runner image/profile per stack, not per problem
- clean ephemeral workspaces after every run
- avoid orphaned containers by preferring `docker run --rm` or equivalent
- document one supported cleanup command in the repo

## Migration Plan

Phase 1:

- Keep existing `amazon-debug-*` problems live as compatibility adaptations
- Add the new problem type and runner behind an explicit feature slice
- Introduce one canonical real debug-workspace example first

Phase 2:

- Migrate the most representative Amazon debug prompts into true multi-file
  workspaces
- Mark older stdin/stdout adaptations as legacy or replace them

Phase 3:

- Add authoring tooling for generating new debug-workspace problems from repo
  templates

## Verification Strategy

Before calling the redesign complete, the repo should prove:

- schema validation rejects malformed debug-workspace problems
- local runs can execute visible tests for a multi-file problem
- submit hides hidden test internals but records deterministic failure types
- temp workspaces are cleaned after run/submit
- at least one real bug-fix problem works end to end

Verification run completed on 2026-06-28:

- `openspec validate ai-debug-workspace-problems --strict`
- `npm run validate:problems`
- `npm run verify:practice`

## Progress Log

- 2026-06-28: Reviewed current `amazon-debug-*` problems and confirmed they are
  stored as stdin/stdout practice adaptations.
- 2026-06-28: Wrote the recommended redesign around a new `debug-workspace`
  problem type instead of extending the current single-buffer model further.
- 2026-06-28: Started implementation of the `debug-workspace` path across the
  practice catalog, API, runner, and editor UX, with
  `amazon-debug-return-system` as the first canonical migrated example.
- 2026-06-28: Verified the implementation with OpenSpec strict validation,
  problem validation, a practice smoke test that exercises the real
  `amazon-debug-return-system` workspace path, and a full client production
  build.
- 2026-06-28: Closed the first review follow-up by restricting debug workspace
  file exposure to visible editor files only, so hidden test scripts stay in
  the seed workspace but no longer leak through the problem detail payload.
- 2026-06-28: Added server-backed debug workspace draft persistence with
  automatic client sync, plus smoke coverage for draft round-trip behavior.
- 2026-06-29: Extended the OpenSpec content-migration task from representative
  migration to full Amazon AI/debug migration.
- 2026-06-29: Added `server/scripts/migrate-amazon-ai-debug-workspaces.mjs`,
  wired `npm --prefix server run migrate:amazon-ai-debug`, and chained it after
  `generate:amazon-oa` so regenerated imports do not revert debug prompts to
  stdin/stdout adaptations.
- 2026-06-29: Migrated all 11 `amazon-debug-*` Amazon OA problems to
  `questionType: debug-workspace` with repository-backed seed workspaces,
  README contracts, visible tests, hidden tests, and editorials.
- 2026-06-29: Added mechanical catalog validation in both the standalone
  validator and runtime catalog loader so any `amazon-debug-*` Amazon OA problem
  that omits `questionType: debug-workspace` fails validation.
- 2026-06-29: Verified no `amazon-debug-*` problem still contains the old
  repository-authored stdin/stdout adaptation text.
- 2026-06-29: Verified every debug workspace visible/hidden script emits valid
  JSON test results and exposes failing seed tests.
- 2026-06-29: Verified `openspec validate ai-debug-workspace-problems --strict`,
  `npm run validate:problems`, and `npm run verify:practice` all pass.

## Key Decisions

- Keep algorithm and debug-repo problems as two distinct product paths.
- Do not overload Judge0 with multi-file repo debugging.
- Make the repository problem directory the source of truth for seeded files,
  manifests, and editorials.
- Encode the Amazon debug migration boundary mechanically: imported
  `amazon-debug-*` OA problems must stay on the `debug-workspace` path.

## Risks and Blockers

- The workspace runner is a real platform feature, not a content-only import.
- Per-stack setup commands can become slow or flaky if the runner contract is too
  loose.
- Security and cleanup rules must be encoded mechanically, not left as prose.
- Draft persistence for debug-workspace problems now exists server-side, but it
  is problem-scoped only and does not yet support multi-user ownership or
  version history.

## Final Outcome

Implemented and verified a first-class `debug-workspace` practice path for
multi-file AI coding / bug-fix problems. The repository now supports seeded
workspace problems with editable-file constraints, dedicated visible/hidden
test execution, editorial persistence, client-side multi-file editing, and a
canonical migrated Amazon debug example in
`problems/amazon-debug-return-system/`.
