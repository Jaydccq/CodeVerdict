# OA Debug Payment Workspace Correction

## Background

The Amazon OA import currently includes algorithm problems and AI Coding / Debug
items under `problems/`. The repository already supports `debug-workspace`
problems with seeded repository files and visible/hidden test scripts.

The user pointed out that AI Coding / Debug items should be represented as a
code repo with multiple failing tests, where the expected answer is corrected
code behavior, not stdin/stdout output.

## Goal

Review the provided Amazon OA HTML source against the current problem bank and
correct the Payment scheduling AI/debug problem so it behaves like a real
debug-workspace task.

## Scope

In scope:

- Compare the current source HTML structure with existing `problems/` content.
- Update `amazon-debug-scheduled-payments` to use the existing
  `debug-workspace` contract.
- Make the statement closer to LeetCode-style clarity while preserving the
  repo-debug nature of the task.
- Add deterministic visible and hidden predefined tests for README behavior,
  boundary conditions, and status updates.
- Run repository problem validation.

Out of scope:

- Migrating all remaining AI/debug imported items in this pass.
- Redesigning the debug workspace UI.
- Claiming any repository-authored tests are official Amazon hidden tests.

## Assumptions

- The repository is the system of record.
- The existing `debug-workspace` problem contract is the correct target form.
- Node-based seed repositories are acceptable for normalized AI/debug practice
  problems.
- The user specifically called out Payment scheduling, so that problem is the
  smallest viable first correction.

## Implementation Steps

1. Inspect HTML source and current problem metadata.
   Verify: identify whether the current problem is algorithm or
   `debug-workspace`.
2. Replace the Payment scheduling problem with a seeded repo workspace.
   Verify: visible tests fail against the seeded buggy code.
3. Add hidden tests for boundary and lifecycle behavior.
   Verify: fixed reference edits pass visible and hidden scripts.
4. Run catalog validation.
   Verify: `npm run validate:problems` passes.

## Verification Approach

- Directly run the debug-workspace visible script against the seed to confirm it
  exposes failing tests.
- Directly run the scripts against a temporary fixed copy to confirm the
  intended behavior is reachable.
- Run `npm run validate:problems` to verify the repository problem contract.

## Progress Log

- 2026-06-29: Confirmed the provided HTML source still contains 27 items, with
  11 AI Coding / Debug items.
- 2026-06-29: Confirmed `amazon-debug-scheduled-payments` was still a
  stdin/stdout practice adaptation, while the repo already has
  `debug-workspace` support.
- 2026-06-29: Replaced `amazon-debug-scheduled-payments` with a
  `debug-workspace` problem using a seeded Node repository, README, visible
  test script, hidden test script, and allowed editable source files.
- 2026-06-29: Removed the old stdin/stdout starter-code and fixture files for
  this problem because they conflicted with the debug-workspace contract.
- 2026-06-29: Verified the seeded visible tests fail before the fix:
  zero-amount validation, current-time scheduling, and exact-boundary due
  execution all report failures.
- 2026-06-29: Verified a temporary reference fix passes all 6 visible/hidden
  predefined tests.
- 2026-06-29: Verified `npm run validate:problems` passes with 32 practice
  problems.
- 2026-06-29: Verified `npm run verify:practice` passes.

## Key Decisions

- Correct the Payment scheduling debug item first because it is explicitly
  named in the request and has a clear source contract.
- Use the existing Node debug-workspace runner instead of adding a new runner.

## Risks And Blockers

- The remaining AI/debug items still need the same migration if full fidelity is
  required across the whole import.
- The HTML source gives debug-task themes and failure directions, not a complete
  official repository, so the seeded repo and tests are normalized practice
  content.
- The remaining stdin/stdout AI/debug adaptations found in this pass are:
  banking RBAC, Django API tests, movie review moderation, MovieDB
  recommendation, issue activity logs, issue comments, workflow sub-issues,
  wallet recurring payments, and user reset password.

## Final Outcome

Completed, then superseded by the full OpenSpec migration.

`amazon-debug-scheduled-payments` is now a real repository-debug problem. The
problem statement presents the task as README-guided bug fixing with predefined
tests, and the workspace contains deterministic visible and hidden tests for
README behavior, boundary conditions, duplicate IDs, and payment lifecycle
state.

The broader migration is tracked in
`docs/exec-plans/2026-06-28-ai-coding-debug-workspace-redesign.md`, which now
records the full 11-problem Amazon AI/debug conversion and verification.
