## 1. OpenSpec and planning

- [x] 1.1 Validate this OpenSpec change in strict mode
- [x] 1.2 Keep `docs/exec-plans/2026-06-28-amazon-oa-problem-import.md` updated with progress, decisions, risks, and final outcome

## 2. Editorial content contract

- [x] 2.1 Add `editorial.md` support to the problem loader and problem detail response
- [x] 2.2 Render editorial content in the practice workspace without changing judging behavior
- [x] 2.3 Extend problem validation so imported Amazon OA problems require non-empty editorials
- [x] 2.4 Add editorials for existing repository problems or apply a documented compatibility rule
- [x] 2.5 Persist workspace editorial edits back to repository-backed `editorial.md`

## 3. Source extraction and import tooling

- [x] 3.1 Add a reproducible extractor for `/Users/hongxichen/Downloads/amazon_oa_questions_structured_fields.html`
- [x] 3.2 Generate or commit an intermediate manifest that contains exactly 27 source items
- [x] 3.3 Extend import tooling to write `editorial.md` and reject unresolved placeholders in imported content

## 4. Amazon OA content import

- [x] 4.1 Import all 16 algorithm items as executable stdin/stdout practice problems
- [x] 4.2 Import all 11 AI Coding / Debug items as clearly labeled practice adaptations or pause on any item that cannot be represented honestly
- [x] 4.3 Add starter code, visible tests, hidden tests, and editorials for every imported item
- [x] 4.4 Verify expected outputs with reference logic rather than unchecked manual outputs

## 5. Verification

- [x] 5.1 Run `openspec validate import-amazon-oa-problems --strict`
- [x] 5.2 Run `npm run validate:problems`
- [x] 5.3 Run `npm run verify:practice`
- [x] 5.4 Exercise representative imported problems through list/detail/run/submit/history
