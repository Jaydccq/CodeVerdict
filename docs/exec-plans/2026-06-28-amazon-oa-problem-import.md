# Amazon OA Problem Import

## Background

The source artifact is `/Users/hongxichen/Downloads/amazon_oa_questions_structured_fields.html`.
It contains 27 Amazon OA items: 16 normal algorithm items and 11 AI Coding / Debug items.

CodeVerdict is currently operated as a private, single-user, repository-backed practice platform.
The existing system supports stdin/stdout practice problems under `problems/`, visible and hidden tests, starter code, Judge0-backed run/submit, and `npm run validate:problems`.

The source HTML is incomplete in several places. It explicitly marks many sample outputs, hidden tests, time limits, and memory limits as not provided. Therefore this import must be a content-normalization and authoring task, not a blind copy.

## Goal

Add all 27 Amazon OA items to CodeVerdict as repository-backed practice content with complete problem statements, deterministic tests, starter code, answers, and explanations.

## Scope

In scope:

- Parse the HTML source and create a reproducible intermediate manifest.
- Normalize every item into a CodeVerdict-compatible problem slug.
- Complete missing problem details where the original source is incomplete.
- Add visible and hidden tests with verified expected outputs.
- Add solution/editorial content so each problem has an answer and explanation.
- Add or update mechanical validation so missing editorials and invalid generated content are caught.
- Add the required OpenSpec change before implementation work proceeds.
- Run problem validation and the most relevant practice verification after import.

Out of scope:

- Claiming generated tests are official Amazon hidden tests.
- Preserving AI/debug items as full multi-file backend projects unless the platform is extended for that explicitly.
- Reintroducing login, exams, admin flows, leaderboards, or database-backed problem definitions.
- Broad visual redesign of the practice workspace beyond the minimum needed to expose editorial content.

## Assumptions

- The repository remains the only durable source of truth.
- Algorithm items should become executable stdin/stdout practice problems.
- AI Coding / Debug items should be included, but only through a clearly labeled adaptation compatible with the current practice platform unless a separate debug-project runner is approved.
- Generated hidden tests are authored practice tests, not official hidden tests.
- Every problem should support the current language set: Python, JavaScript, C++, and Java, unless a specific item cannot reasonably support all four.
- The existing `problems/` file contract is the right base; the smallest platform extension is adding editorial/solution support rather than creating a new problem system.

## Uncertainties

- Some HTML items are too incomplete to reconstruct a single canonical algorithm with high confidence.
- The 11 AI/debug items may lose fidelity if converted into stdin/stdout exercises instead of real project-debugging tasks.
- The existing problem importer accepts normalized JSON, but it does not yet cover editorial content.

## Chosen Approach

Use a two-layer import:

1. Platform/content contract extension:
   - Add a first-class per-problem editorial artifact, preferably `editorial.md`.
   - Validate that every imported Amazon OA problem has an editorial.
   - Expose editorial content in the practice detail API and UI behind an optional solution/explanation section.

2. Problem content import:
   - Convert all 16 algorithm items into executable stdin/stdout problems.
   - Convert the 11 AI/debug items into clearly labeled practice adaptations unless a future OpenSpec change adds multi-file debugging workspaces.
   - For every problem, add visible tests, hidden tests, starter code, and an editorial explaining the intended answer.

This keeps the current product shape intact while satisfying the request to include answers and explanations.

## Rejected Alternative

Do not paste the HTML text directly into `description` fields and leave missing samples as "not provided".
That would pass some file checks only if the validator stayed weak, but it would violate the request for complete statements, tests, answers, and explanations.

## Implementation Steps

1. Create an OpenSpec change named `import-amazon-oa-problems`.
   Verify: `openspec validate import-amazon-oa-problems --strict` passes.

2. Add an HTML-to-intermediate-manifest extraction script or one-time checked-in manifest under a repository-controlled location.
   Verify: it detects exactly 27 source items, with 16 algorithm and 11 AI/debug categories.

3. Extend the problem contract for editorials.
   Verify: `npm run validate:problems` fails for a problem without required editorial content and passes for existing migrated content after adding editorials or compatibility rules.

4. Expose editorial content through backend problem detail responses and the practice workspace.
   Verify: a problem detail API response includes the editorial, and the UI renders it without changing run/submit behavior.

5. Import the 16 algorithm problems as executable stdin/stdout practice problems.
   Verify: every imported algorithm problem has `problem.yaml`, starter code for supported languages, at least two visible tests when reasonable, hidden tests, and a reviewed editorial.

6. Import the 11 AI/debug items as adapted practice problems or pause if any item cannot be represented honestly in the current platform.
   Verify: each adapted item is labeled in its statement as an adaptation and has deterministic judgeable input/output behavior.

7. Verify expected outputs from reference solutions instead of hand-entering them untested.
   Verify: generated expected outputs are reproduced by at least one reference implementation per problem.

8. Run repository verification.
   Verify: `npm run validate:problems`, `npm run verify:practice`, and targeted API/UI checks pass.

## Verification Approach

- Source extraction count equals 27.
- No imported problem keeps placeholder text such as "未提供", "未公开", or "不伪造官方答案" in judge-facing fields.
- `npm run validate:problems` passes after import.
- Each problem has visible and hidden tests.
- Each problem has an editorial/answer artifact.
- Hidden tests remain hidden in submit responses.
- At least a representative sample of newly imported problems is exercised through live list/detail/run/submit/history APIs.

## Key Decisions

- Treat generated tests as authored practice tests, not official hidden tests.
- Add editorials as a mechanical content contract because the current schema only supports sample explanations.
- Keep all content repository-backed under `problems/`.
- Preserve the single-user private practice product boundary.
- Use OpenSpec for the platform/content-contract change, then execute tasks against that change.

## Risks And Blockers

- Incomplete source items may require invented constraints or tests; these must be marked as practice adaptations rather than official statements.
- AI/debug items may not fit the current stdin/stdout judge. If fidelity matters more than importing all items quickly, they need a separate debug-workspace capability.
- Importing 27 problems manually is error-prone; validation and generated expected-output checks are required before declaring completion.
- Adding editorial UI touches backend types, API serialization, client store types, and workspace rendering.

## Progress Log

- 2026-06-28: Confirmed working path is `/Users/hongxichen/Desktop/CodeVerdict`.
- 2026-06-28: Confirmed OpenSpec has one active change, `private-practice-platform`, with 24/24 tasks complete.
- 2026-06-28: Read repository instructions, the current private-practice execution plan, problem format documentation, current problem schema, parser, validator, and workspace rendering.
- 2026-06-28: Parsed the HTML source and confirmed 27 items: 16 algorithm and 11 AI/debug.
- 2026-06-28: Identified that many source items have missing sample outputs, hidden tests, time limits, or memory limits, so direct import is insufficient.
- 2026-06-28: Wrote this plan before implementation, per repository rules.
- 2026-06-28: Created OpenSpec change `import-amazon-oa-problems` and validated it with `openspec validate import-amazon-oa-problems --strict`.
- 2026-06-28: Added optional `editorial.md` support to the problem loader, problem detail API, frontend practice workspace, import script, and validation tooling.
- 2026-06-28: Established the compatibility rule that legacy/local sample problems may omit editorials, while imported Amazon OA problems marked `source: amazon-oa` must include non-empty editorials and must not contain unresolved source placeholders.
- 2026-06-28: Verified the editorial contract slice with `npm run validate:problems`, `npm --prefix server run build`, `npm --prefix client run build`, and OpenSpec strict validation.
- 2026-06-28: Added `server/scripts/extract-amazon-oa-html.mjs`, wired `npm --prefix server run extract:amazon-oa`, and generated `data/imports/amazon-oa-source-manifest.json` from the downloaded HTML.
- 2026-06-28: Verified the extracted manifest contains exactly 27 items: 16 algorithm and 11 AI Coding / Debug.
- 2026-06-28: Added `server/scripts/generate-amazon-oa-problems.mjs`, wired `npm --prefix server run generate:amazon-oa`, and generated 27 Amazon OA practice problem directories under `problems/`.
- 2026-06-28: Imported all 16 algorithm source items as executable stdin/stdout practice problems and all 11 AI Coding / Debug source items as explicitly labeled practice adaptations.
- 2026-06-28: Each imported Amazon OA problem now has `source: amazon-oa`, starter code for Python, JavaScript, C++, and Java, visible tests, hidden tests, and `editorial.md`.
- 2026-06-28: Expected outputs for imported fixtures are generated by reference solver functions in `server/scripts/generate-amazon-oa-problems.mjs` rather than manually typed into each fixture.
- 2026-06-28: Verified `npm run validate:problems` passes with 30 total practice problems, including 27 Amazon OA imports.
- 2026-06-28: Verified `npm run verify:practice` passes.
- 2026-06-28: Verified compiled catalog evidence: 30 total problems, 27 `source: amazon-oa` problems, and 27 non-empty editorials.
- 2026-06-28: Rebuilt and restarted the default Docker stack with `npm run docker:up` so the running app image includes the imported content.
- 2026-06-28: Started `npm --prefix server run mock:judge0:practice` temporarily and exercised live API endpoints for `amazon-product-variant-conversion`: list returned 30 problems with 27 Amazon imports, detail returned editorial content, `run-sample` accepted both samples, `submit` accepted 4/4 tests, and submissions history recorded the accepted result.
- 2026-06-28: Replaced the plain inline editorial block with a dedicated statement / answer-analysis tab interface in the practice workspace so `editorial.md` content is exposed as an actual UI surface.
- 2026-06-28: Converted the answer-analysis tab into an editable textarea prefilled from the current problem editorial, with live preview cards below it so answers and explanations can be entered directly in the workspace UI.
- 2026-06-28: Added a practice editorial save path that writes workspace edits back to the active problem's repository-backed `editorial.md`, reloads the catalog, and returns the persisted problem detail payload to the client.
- 2026-06-28: Extended the verification path so `server/scripts/smoke-practice.mjs` now exercises `saveEditorial`, then re-ran `openspec validate import-amazon-oa-problems --strict`, `npm --prefix server run build`, `npm --prefix client run build`, and `npm run verify:practice` successfully.
- 2026-06-28: Fixed the local Vite API proxy default back to `http://127.0.0.1:3000`, added an explicit problem-list error/empty state so catalog failures no longer silently show `0`, and changed the default Docker startup script to use `--pull never --remove-orphans` while still cleaning Judge0 profile resources first.

## Final Outcome

Completed.

The repository now contains an OpenSpec-backed Amazon OA import change, a source manifest extracted from the provided HTML, editorial support in the practice problem contract, and 27 imported Amazon OA practice problems. The 16 algorithm items are executable stdin/stdout problems. The 11 AI Coding / Debug items are represented as clearly labeled practice adaptations, which preserves the current single-user stdin/stdout practice platform boundary without pretending they are full multi-file debug workspaces.

Every imported Amazon OA item has a complete statement, input/output format, constraints, visible tests, hidden tests, starter code for all supported languages, and an `editorial.md` answer/explanation artifact. The validator now mechanically requires editorials and rejects unresolved source placeholders for `source: amazon-oa` problems.

Verification completed with OpenSpec strict validation, problem validation, full practice verification, compiled catalog checks, rebuilt Docker runtime delivery, and live list/detail/run/submit/history API checks against a representative imported problem.
