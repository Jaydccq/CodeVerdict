# Add OA Problems: LeetCode 1911 and Amazon Box IDs

## Background

The user asked to add two more repository-backed practice problems to the
private CodeVerdict catalog on June 28, 2026:

- LeetCode 1911
- An Amazon OA problem shown in screenshots and linked from Hack2Hire, centered
  on minimizing a digit string `boxIds`

The current practice platform expects each problem to live under `problems/`
with `problem.yaml`, `starter-code/`, visible tests, hidden tests, and optional
or required `editorial.md` depending on source.

## Goal

Add both requested problems as fully runnable practice problems with authored
statements, starter code, visible tests, hidden tests, and editorials.

## Scope

In scope:

- Add one LeetCode-style algorithm problem corresponding to LeetCode 1911
- Add one Amazon OA algorithm problem for optimizing `boxIds`
- Keep the existing single-user practice product boundary
- Validate the full practice catalog after import

Out of scope:

- Adding the screenshot-only Amazon debug-repo prompt as a separate problem in
  this change
- Reworking import generators for a one-off two-problem addition

## Assumptions

- The user request refers to exactly two additions: LeetCode 1911 and the
  Amazon `boxIds` problem from the provided link/screenshots.
- The Hack2Hire page content is incomplete and/or not directly accessible in
  this environment, so the repository version should be an authored normalized
  practice statement rather than a verbatim copy.
- Repository-authored tests are acceptable as long as they are deterministic and
  aligned with the intended algorithm.

## Implementation Steps

1. Author import JSON for both requested problems.
   Verify: each JSON includes metadata, tests, starter code, and editorial.
2. Import both problems into `problems/` using the existing import script.
   Verify: both problem directories are created with the expected structure.
3. Run catalog and practice verification.
   Verify: `npm run validate:problems` and `npm run verify:practice` pass.

## Verification Approach

- `npm run validate:problems`
- `npm run verify:practice`
- Spot-check the new problem directories and editorials

## Progress Log

- 2026-06-28: Confirmed the current repo contract for practice problems and the
  editorial-backed practice workspace.
- 2026-06-28: Reconstructed the Amazon `boxIds` prompt from the provided
  screenshots and normalized it into a deterministic stdin/stdout practice
  problem shape.
- 2026-06-28: Authored import JSON for `leetcode-maximum-alternating-subsequence-sum`
  and `amazon-optimize-box-ids`.
- 2026-06-28: Imported both problems with the existing `import:problem` script
  and corrected one mistaken `1911` sample output from `10` to `9` before
  verification.
- 2026-06-28: Ran `npm run validate:problems` successfully; the catalog now
  contains 32 practice problems.
- 2026-06-28: Ran `npm run verify:practice` successfully after the two-problem
  addition.

## Key Decisions

- Treat LeetCode 1911 as a repository-authored paraphrase of the underlying
  algorithmic problem, not a verbatim copy.
- Treat the Amazon `boxIds` prompt as `source: amazon-oa` with a non-empty
  `editorial.md`, matching the existing validator contract.
- Do not add the screenshot-only debug-repo prompt in this change because the
  user message named only one external Amazon question link in addition to
  LeetCode 1911.

## Risks and Blockers

- The Amazon source screenshots do not expose a full official hidden-test set,
  so all hidden tests in this repo are repository-authored practice tests.

## Final Outcome

Completed.

The repository now includes two additional practice problems:

- `problems/leetcode-maximum-alternating-subsequence-sum`
- `problems/amazon-optimize-box-ids`

Each includes authored metadata, starter code for Python/JavaScript/C++/Java,
visible tests, hidden tests, and editorial content. The Amazon `boxIds`
question is stored as `source: amazon-oa` and satisfies the current editorial
validation contract.
