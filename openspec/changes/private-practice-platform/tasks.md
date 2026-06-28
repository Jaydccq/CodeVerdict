## 1. OpenSpec Alignment

- [x] 1.1 Finalize proposal, design, and capability specs for the private practice platform change
- [x] 1.2 Validate the OpenSpec change artifacts and resolve schema issues

## 2. Problem Catalog Foundation

- [x] 2.1 Define the `problems/` directory contract with `problem.yaml`, `starter-code/`, `tests/visible/`, and `tests/hidden/`
- [x] 2.2 Implement a startup problem loader that reads repository files directly without database mirroring
- [x] 2.3 Implement strict problem schema and file completeness validation
- [x] 2.4 Add a `validate:problems` command and wire it to the same validator used at startup
- [x] 2.5 Add one repository-backed sample problem that exercises the full contract

## 3. Practice Execution Backend

- [x] 3.1 Create a practice-facing backend module isolated from exam/auth flows
- [x] 3.2 Implement `GET /api/problems` and `GET /api/problems/:slug`
- [x] 3.3 Implement `POST /api/problems/:slug/run-sample` with visible-test diagnostics
- [x] 3.4 Implement `POST /api/problems/:slug/run-custom` with raw stdin execution only
- [x] 3.5 Implement `POST /api/problems/:slug/submit` with visible/hidden grading and hidden-test-safe responses
- [x] 3.6 Add trailing-whitespace-normalized output comparison on top of exact matching
- [x] 3.7 Bind the practice server to `127.0.0.1` by default and restrict CORS for local use

## 4. Practice Submission Persistence

- [x] 4.1 Add a dedicated practice submission table with `problemSlug`, `language`, `sourceCode`, `verdict`, `passedCount`, `totalCount`, `safeDetailsJson`, and timestamps
- [x] 4.2 Persist a minimal practice submission record from the submit path
- [x] 4.3 Implement `GET /api/problems/:slug/submissions`

## 5. Practice Frontend Flow

- [x] 5.1 Replace the default entry route with a problem list view
- [x] 5.2 Build a practice workspace view with statement, editor, and bottom results/history panels
- [x] 5.3 Wire language selection, sample run, custom run, submit, and submission history to the new APIs
- [x] 5.4 Remove exam/admin/auth from the default product path without requiring full code deletion

## 6. End-to-End Verification

- [x] 6.1 Verify problem validation passes for the sample problem set and fails for malformed fixtures
- [x] 6.2 Verify accepted, wrong answer, runtime error, compile error, and hidden-test failure behaviors
- [x] 6.3 Verify a fresh local session can go from problem list to submit/history without login or exam context
