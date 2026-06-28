# Private Practice Platform Conversion

## Background

This repository currently implements a coding exam platform with authentication, exam windows, admin management, MCQ support, scoring, and leaderboards. The target product is narrower: a private LeetCode-style practice platform for a single user. The user will provide OA problems, visible sample tests, and hidden tests. The system only needs to support selecting a problem, choosing a language, editing code online, running sample/custom input, submitting against the full test suite, and reviewing submission history.

The repository remains the system of record. The converted product must be represented by repository-backed code and repository-backed problem content, not by chat-only decisions.

## Goal

Convert the visible product flow from an exam platform into a single-user private practice platform without login.

## Success Criteria

- The default UI flow starts from a problem list, not exams or admin pages.
- Problems are loaded directly from repository files, not mirrored into the database.
- Problem files are schema-validated at startup, and a repository validation command exists for batch authoring.
- The practice workspace shows:
  - left: problem statement, formats, examples, notes
  - right: language picker and editor
  - bottom: run results, error output, submission history
- The system supports:
  - `Run Sample`
  - `Run Custom`
  - `Submit`
- `Run Sample` reveals full per-sample details on failure.
- `Run Custom` executes user-provided stdin without answer comparison.
- `Submit` can run visible and hidden tests while avoiding hidden test leakage.
- Submission history is saved in a practice-specific table without a user/login concept.
- Problems and tests are maintained as repository files suitable for AI batch editing.
- The local code execution surface is restricted to local use by default.
- The new flow works end-to-end with targeted verification.

## Scope

### In Scope

- Introduce a file-driven problem catalog.
- Define and enforce a strict on-disk problem schema.
- Add or adapt backend practice APIs for list/detail/run/submit/history.
- Replace the current exam-centric student entry flow with a practice-centric flow.
- Preserve Judge0-backed execution.
- Persist submission history in a dedicated practice table.
- Add a repository validation command for problem content.
- Restrict the practice API to local-safe defaults.
- Keep the implementation minimal and reversible where possible.

### Out of Scope For Phase 1

- Physically deleting all unused legacy modules.
- Multi-user support.
- Admin CRUD UI.
- Exam scheduling, scoreboards, class features, or MCQ workflows.
- Broad refactors unrelated to the new practice flow.

## Product Decisions

- No login or user accounts.
- Single-user practice experience.
- Problems use standard input / standard output.
- Problem and test content live in repository files.
- `Run Sample` executes visible tests only.
- `Run Custom` executes one caller-provided stdin payload without answer checking.
- `Submit` executes the complete test suite, including hidden tests.
- Visible test failures can return detailed input/output diagnostics.
- Hidden test failures return summary information only.
- Submission history is stored separately from legacy exam/user submissions.
- The local server should bind to `127.0.0.1` by default and use restrictive CORS.

## Assumptions

- Reusing the existing NestJS + Vue + Judge0 stack is lower risk than replacing the backend/runtime.
- It is acceptable in phase 1 to keep legacy exam/admin/auth code in the repo if the new practice flow does not depend on it.
- A strict YAML-backed directory format is sufficient for AI-assisted batch editing.
- Database persistence remains useful for submission history even if problem definitions move to files.

## Uncertainties

- Whether draft code autosave should remain in phase 1. It is not required by the request and should be excluded unless needed to support the new workspace cleanly.
- Whether problem files should be loaded eagerly at startup only or support development-time reload without restart.

## Recommended Approach

Use a compatibility-first conversion:

- Keep the current runtime stack.
- Build a new practice-facing vertical slice with file-backed problems and simplified run/submit APIs.
- Repoint the frontend to the new practice experience.
- Leave legacy modules in place for now if they do not interfere.

This avoids a risky full teardown while still producing the requested product shape.

## Simplest Viable Path

1. Define a repository-backed problem file format, validator, and loader.
   Verify: sample problems can be listed and loaded from disk.
2. Add practice APIs for problem list/detail/run/custom-run/submit/history.
   Verify: API calls work without auth or exam context.
3. Preserve Judge0 integration while changing grading semantics to practice mode.
   Verify: sample run and submit return expected verdicts.
4. Replace the default frontend flow with problem list + practice workspace.
   Verify: the UI supports language selection, editing, running, submitting, and history display.
5. Hide or bypass legacy entry points that are no longer part of the main experience.
   Verify: normal usage no longer depends on exam/admin routes.

## Proposed Architecture

### Problem Source of Truth

Use repository files as the source of truth for problem definitions and tests.

Suggested layout:

```text
problems/
  two-sum/
    problem.yaml
    starter-code/
      python.py
      javascript.js
      cpp.cpp
      java.java
    tests/
      visible/
        001.in
        001.out
      hidden/
        001.in
        001.out
```

Required `problem.yaml` fields:

- `slug`
- `title`
- `difficulty`
- `description`
- `inputFormat`
- `outputFormat`
- `constraints`
- `samples`
- `supportedLanguages`
- `timeLimitMs`
- `memoryLimitKb`

Validation rules:

- `slug` must match the directory name and be unique.
- At least one visible test and one hidden test must exist.
- Each `.in` file must have a matching `.out` file.
- `supportedLanguages` must map to known runtime/language IDs.
- Starter code files must align with declared supported languages.
- Declared samples in `problem.yaml` must stay consistent with visible test intent.

Repository tooling:

- Add `pnpm validate:problems` to validate schema and file completeness.
- Run validation at startup before exposing the practice API.
- Development mode may add reload support, but startup validation is mandatory.

### Backend Surface

Practice-facing API shape:

- `GET /api/problems`
- `GET /api/problems/:slug`
- `POST /api/problems/:slug/run-sample`
- `POST /api/problems/:slug/run-custom`
- `POST /api/problems/:slug/submit`
- `GET /api/problems/:slug/submissions`

Behavior:

- `run-sample`
  - Runs visible samples only.
  - Returns per-sample details including input, expected output, actual output, stderr, compile output, status, time, and memory.
- `run-custom`
  - Runs one custom stdin payload.
  - Returns stdout, stderr, compile output, status, time, and memory.
- `submit`
  - Runs the full test suite.
  - Stores a submission record.
  - Returns overall verdict, passed count, total count, failure type, and only safe detail for hidden failures.

Grading semantics:

- `Run Sample`
  - Compare against visible expected outputs.
  - On failure, reveal `input`, `expectedOutput`, `actualOutput`, and stderr/compile output when available.
- `Run Custom`
  - Never compare against an expected output.
  - Use it as raw execution/debugging only.
- `Submit`
  - Run visible and hidden tests together.
  - If a visible test fails, visible failure details may be returned.
  - If only hidden tests fail, return a safe summary such as `failed on hidden test`, passed count, total count, and error category, without hidden input/output.
- Output matching starts with exact match plus trailing-whitespace normalization.

### Submission Persistence

Submission history remains in the database.

Phase 1 should use a dedicated practice submission table instead of reusing the legacy exam/user submission entity.

Required stored fields:

- `id`
- `problemSlug`
- `language`
- `sourceCode`
- `verdict`
- `passedCount`
- `totalCount`
- `safeDetailsJson`
- `createdAt`

Explicitly excluded fields:

- `userId`
- `examId`
- score/leaderboard fields
- MCQ-related fields

### Frontend Surface

Primary pages:

- `ProblemListView`
- `ProblemWorkspaceView`

Workspace layout:

- left panel: statement, input/output format, constraints, samples, notes
- right panel: language selector + Monaco editor
- bottom panel: run results, errors, submission history

Primary actions:

- choose problem
- choose language
- edit code
- run samples
- run custom input
- submit full solution
- inspect prior submissions

### Local Safety Boundary

- Bind the practice server to `127.0.0.1` by default unless explicitly reconfigured.
- Restrict CORS to the local frontend origin used in development/packaged local use.
- Do not leave unauthenticated practice execution endpoints broadly exposed by default.

## Keep / Replace / Ignore Strategy

### Keep

- Judge0 integration
- Monaco editor
- Existing Vue + NestJS application shell where useful

### Replace

- Exam-centric routes and stores used by the main flow
- Auth-required submission APIs
- Problem retrieval based on exam mappings
- Legacy submission persistence for the new practice flow

### Ignore For Now

- Legacy admin pages
- Leaderboard and scoring modules
- MCQ workflows
- User management

## Verification Approach

1. Problem loading
   Verify: a repository-backed sample problem appears in the list and detail API.
2. Problem validation
   Verify: `pnpm validate:problems` fails on missing files/invalid schema and passes on the sample set.
3. Sample run
   Verify: a correct submission passes visible samples; an incorrect one returns expected vs actual output.
4. Custom run
   Verify: arbitrary stdin returns raw execution output without answer comparison.
5. Submit
   Verify: accepted, wrong answer, runtime error, compile error, and time limit states are surfaced correctly.
6. Hidden test protection
   Verify: hidden test failure returns counts and failure type without hidden input/output leakage.
7. Submission history
   Verify: a new submission appears in the history panel after submit.
8. Local safety boundary
   Verify: the practice API binds locally by default and rejects disallowed origins under configured CORS.
9. Main flow
   Verify: a fresh session can go from problem list to working solution flow without login, exam selection, or admin interaction.

## Implementation Priorities

### P0

- Define the `problems/` directory format with `problem.yaml`, `starter-code/`, `tests/visible/`, and `tests/hidden/`.
- Implement the problem loader and schema validator.
- Add `pnpm validate:problems`.
- Build the practice API:
  - `GET /api/problems`
  - `GET /api/problems/:slug`
  - `POST /api/problems/:slug/run-sample`
  - `POST /api/problems/:slug/run-custom`
  - `POST /api/problems/:slug/submit`
  - `GET /api/problems/:slug/submissions`
- Add a Judge0 grading adapter for stdin/stdout practice judging.
- Persist a minimal practice submission record from the `submit` path so the practice submission API contract is real from day one.
- Repoint the frontend main flow to problem list + workspace.
- Hide exam/admin/auth entry points from the default product path.
- Add one sample problem and verify end-to-end.

### P1

- Expand submission history into a polished bottom-panel experience with clean rendering, ordering, and safe detail display.
- Add an AI-friendly import tool such as `problems/import` or a normalization script that converts Markdown/JSON into the standard problem directory format.

## File-Level Implementation Plan

1. Repository scripts and problem fixtures
   Verify: root and server scripts can invoke problem validation, and one sample problem exists under `problems/`.
2. Backend practice foundation
   Verify: a startup-safe problem loader and validator can load the sample problem without database mirroring.
3. Backend persistence and API
   Verify: practice endpoints list problems, return detail, run sample/custom execution, submit full grading, and persist submission history through a dedicated entity.
4. Frontend practice flow
   Verify: the default route lands on a problem list and the workspace can load details, switch languages, run, submit, and show history.
5. Targeted verification
   Verify: lint/build or equivalent targeted checks pass for the touched client/server code, and manual command checks cover the hidden-test safety contract.

## Risks And Blockers

- Existing entities and services are tightly coupled to exam/user concepts, so phase 1 may need adapter code before deeper cleanup.
- File-driven problem loading introduces a split between repository-backed problem content and database-backed submission history; boundaries must stay explicit.
- Keeping legacy code in place can cause route/config confusion if the new entry path is not made unambiguous.
- Local-only safety defaults must not accidentally regress during dev/prod config changes.

## Key Decisions

- Prefer shrinking the visible product surface over physically deleting legacy code in phase 1.
- Use repository files as the durable source of truth for problem content.
- Validate problem files mechanically instead of relying on documentation only.
- Use a dedicated practice submission table.
- Keep submission history persistent.
- Preserve Judge0-based execution and verdict mapping.
- Keep hidden-test responses safe by design.
- Default the execution surface to local-only access.
- Exclude unnecessary platform features rather than partially adapting them.

## Progress Log

- 2026-06-27: Read repository entry docs, router, modules, entities, and run/submit flow.
- 2026-06-27: Confirmed target scope with the user: no login, single-user, stdin/stdout, file-driven problem content, sample/custom run, full submit, hidden-test-safe feedback.
- 2026-06-27: Chose compatibility-first conversion instead of aggressive code deletion.
- 2026-06-27: Wrote the initial design and execution entry document.
- 2026-06-27: Incorporated follow-up decisions: no problem DB mirroring, strict schema validation, dedicated practice submission table, local-only safety defaults, and explicit P0/P1 execution order.
- 2026-06-27: Initialized and validated the OpenSpec change `private-practice-platform` with proposal, design, specs, and tasks.
- 2026-06-27: Added a file-level implementation plan to guide execution of the OpenSpec P0/P1 tasks.
- 2026-06-27: Implemented the repository-backed `problems/` catalog, sample fixtures, startup loader, strict validation, and a pure-Node `validate:problems` command.
- 2026-06-27: Implemented the practice backend module, `run-sample` / `run-custom` / `submit` APIs, hidden-test-safe submit responses, local host/CORS defaults, and dedicated practice submission persistence.
- 2026-06-27: Implemented the frontend practice problem list, workspace, Monaco-based editor flow, bottom results/history panel, and practice API wiring.
- 2026-06-27: Verified `validate:problems` passes against the repository problems and fails against a malformed temporary problem set.
- 2026-06-27: Installed repo dependencies, verified `npm --prefix server run build`, and verified `npm --prefix client run build`.
- 2026-06-27: `npm --prefix client run lint` completed with one pre-existing warning in `client/src/components/layout/AppHeader.vue`.
- 2026-06-27: Attempted Docker Compose end-to-end verification, but the local Docker daemon was not running, so runtime verification against Postgres + Judge0 remains incomplete.
- 2026-06-27: Verified compiled `PracticeService` verdict shaping for accepted, wrong answer, compile error, runtime error, time limit exceeded, and hidden-test failure paths with direct Node assertions against the built server output.
- 2026-06-27: Brought up local Postgres, a local Judge0 stub, and the Nest production server bound to `127.0.0.1`; verified live `GET /api/problems`, `GET /api/problems/:slug`, `POST /run-sample`, `POST /submit`, and `GET /submissions` without login or exam context.
- 2026-06-27: Verified live hidden-test-safe submit behavior: visible-passing / hidden-failing submissions return only `passedCount`, `totalCount`, and hidden-safe failure metadata, while the stored history record omits hidden input and expected output.
- 2026-06-27: During page-level verification, found the Vite dev proxy still targeted `http://localhost:3000`, which broke fresh local practice sessions with `502` on `/api/problems`.
- 2026-06-27: Fixed the Vite dev proxy by adding configurable `VITE_API_PROXY_TARGET` support and defaulting local practice development to `http://127.0.0.1:3001`; re-verified `http://127.0.0.1:5173/api/problems`.
- 2026-06-27: Verified the default frontend entry renders the problem list in practice mode and that the direct `/problems/sum-pair` route opens the practice workspace shell without login, exam selection, or admin interaction.
- 2026-06-27: Re-ran `npm run verify:practice` after the proxy fix and confirmed it passes.
- 2026-06-27: Audited the problem-authoring surface and removed a stale `c` language mismatch from the JSON import script, the standalone validator script, and the `problems/` format documentation so AI-authored content matches the actual supported runtime set.
- 2026-06-27: Tightened the default local safety boundary further by changing the root example host binding to `127.0.0.1` and publishing the Docker Compose app port on `127.0.0.1:${PORT}:3000` instead of all host interfaces; verified the composed configuration with `docker compose config`.
- 2026-06-27: Re-ran `npm run validate:problems` and `npm run verify:practice` after the consistency and safety-boundary fixes; both passed.
- 2026-06-27: Compared the practice editor against a LeetCode-style reference screenshot and found the code pane still looked like a generic dark admin editor rather than a light practice IDE.
- 2026-06-27: Reworked the practice-only Monaco presentation to a light theme with a two-row code toolbar, Chinese run/submit actions, language pill, local-practice status, copy/reset/fullscreen affordances, and a tighter bottom results panel without changing the legacy exam editor.
- 2026-06-27: Inspected live container usage with `docker stats`; only the standalone local Postgres container was running and measured about `35.91MiB`, so the reported memory pressure is likely the full Judge0 compose stack rather than the current local verification setup.
- 2026-06-27: Reduced the default Judge0 stack footprint for single-user local practice by lowering `WORKERS_COUNT` from `3` to `1`, shrinking `MAX_QUEUE_SIZE`, and adding per-container `mem_limit` values for the app, both Postgres instances, Redis, Judge0 server, and Judge0 worker; verified the resulting caps with `docker compose config`.
- 2026-06-27: Re-ran `npm --prefix client run build`, `npm run validate:problems`, and `docker compose config` after the editor and memory-tuning changes; all passed.
- 2026-06-28: Repaired the local Docker Desktop daemon enough to build and start the full compose stack again by restarting Docker Desktop and removing the project-specific temporary Postgres container created during earlier verification.
- 2026-06-28: Collected live compose stats after recovery. Stable memory usage stayed modest (`app` about `50MiB`, each Postgres about `50-56MiB`, Redis about `18MiB`, Judge0 server about `14-24MiB`, Judge0 worker about `22-48MiB`), while Judge0 CPU remained high.
- 2026-06-28: Identified the remaining Judge0 failure as an upstream image/runtime compatibility issue rather than a local container-memory issue: `judge0/judge0:1.13.1` resolves to a single `linux/amd64` manifest and on this `arm64` Docker Desktop host its Rails process fails with `libpq.so.5: file too short`, causing restart loops and high CPU.
- 2026-06-28: Changed Compose and docs so Judge0 local services are opt-in under a `judge0-local` profile, explicitly marked `linux/amd64`, and no longer represent the default path on Apple Silicon hosts. The default `.env.example` now points `JUDGE0_URL` at a host-provided Judge0 endpoint instead of assuming the bundled local Judge0 stack.
- 2026-06-28: Fixed the production container healthcheck to use the existing `/api/health` endpoint over `127.0.0.1`, which eliminated the false `unhealthy` state caused first by probing `/api` and then by `localhost` resolving to IPv6 while the app was bound on IPv4.
- 2026-06-28: Updated the active local `.env` and Compose defaults so the normal `docker compose up --build` path targets `http://host.docker.internal:2358` unless the user explicitly opts into the bundled `judge0-local` profile.
- 2026-06-28: Soft-disabled leaderboard noise for the practice flow by treating a missing `leaderboard_view` as an expected practice-mode condition instead of a repeating runtime error.
- 2026-06-28: Rebuilt the compose app, stopped leftover Judge0 profile containers, and re-verified the default stack is now just `app` + `app-db`, with `docker compose ps` showing both healthy and `docker stats` showing about `49.85MiB` for `app` and `56.39MiB` for `app-db`.
- 2026-06-28: Added the new repository-backed practice problem `construct-largest-sequence` with a fully specified statement, normalized stdin/stdout format, two visible examples, three hidden tests, and starter code for Python, JavaScript, C++, and Java.
- 2026-06-28: Added `server/scripts/mock-judge0-practice.mjs` plus `npm --prefix server run mock:judge0:practice` so local practice verification can exercise real Python code through the live practice API without depending on the broken bundled Judge0 image on Apple Silicon.
- 2026-06-28: Verified the new problem end-to-end with the live Dockerized app: `GET /api/problems/construct-largest-sequence` returned the new statement and starter code, `run-sample` returned detailed wrong-answer diagnostics for a bad solution and accepted both visible tests for a good solution, `run-custom` returned `100 90 80 4`, `submit` returned `accepted` with `passedCount=5/5`, and `GET /submissions` recorded the saved practice submission history.
- 2026-06-28: Investigated the reported Docker Desktop memory spike from macOS Activity Monitor. Live container usage for the active CodeVerdict stack stayed around `53MiB` for `app` and `57MiB` for `app-db`, so the observed `5.25GB` came from the Docker Desktop VM rather than the current project containers.
- 2026-06-28: Confirmed the Docker Desktop backing store is heavily bloated and still partly inconsistent: `docker system df -v` fails with the same snapshot-missing error, the local Docker data file `~/docker/DockerDesktop/Docker.raw` is `60G`, and the image inventory includes many unrelated large images including `judge0/judge0:1.13.1` at `14.2GB`.
- 2026-06-28: Removed the abandoned CodeVerdict Judge0 containers (`codeverdict-judge0-server-1`, `codeverdict-judge0-worker-1`, `codeverdict-judge0-db-1`, `codeverdict-judge0-redis-1`), retried Docker Desktop after restart, and then successfully removed the stale `codeverdict_judge0-db-data` volume once the bad reference metadata cleared.
- 2026-06-28: Removed the CodeVerdict Judge0-related images `judge0/judge0:1.13.1`, `postgres:16-alpine`, and `redis:7.2.4-alpine`, plus dangling image layers. After cleanup, `docker system df -v` recovered from the earlier snapshot error and `~/docker/DockerDesktop/Docker.raw` dropped from `60G` to `28G`.
- 2026-06-28: Final CodeVerdict Docker state after the repair: only `codeverdict-app-1` and `codeverdict-app-db-1` remain, both healthy, with live container memory around `125.5MiB` for `app` and `47.8MiB` for `app-db`.
- 2026-06-28: Root cause of the useless CodeVerdict containers was process, not Compose itself: after starting `judge0-local` during debugging, later runs switched back with `docker compose up` and `docker compose stop`, which leaves exited profile containers on disk. Added repository-managed Docker entry scripts so the default `npm run docker:up` path now cleans stale CodeVerdict Judge0 profile resources first, `npm run docker:up:judge0` is explicit, and `npm run docker:down` / `npm run docker:clean:judge0` give a clean supported shutdown path.
- 2026-06-28: Aligned the repo-facing Docker guidance with the new prevention flow. Updated `README.md` and `AGENTS.md` so raw `docker compose ...` is documented as a manual/debug path rather than the default recommendation, and updated the `Dockerfile` comments to reflect that the production image is the lightweight practice app image with health checks on `/api/health`, not a bundled Judge0 image.

## Final Outcome

The repository now runs as a private LeetCode-style practice platform on top of the existing stack without requiring code deletion of legacy exam/admin/auth modules. Problems are file-backed under `problems/`, startup and CLI validation are mechanical, practice submissions persist in a dedicated table, run/submit semantics are explicitly split, hidden tests stay hidden on submit failures, the AI authoring surface matches the real supported languages, and the default frontend flow starts in the practice problem list rather than login or exam selection. On this Apple Silicon development machine, the default Docker path is also back to a light two-container setup (`app` + `app-db`) with a passing healthcheck and localhost-only exposure, while the incompatible bundled Judge0 stack is now opt-in instead of always-on. The practice catalog now includes a fully verified medium-difficulty problem, `construct-largest-sequence`, that has been exercised through live list/detail/run/custom-run/submit/history endpoints.

The last implementation gaps discovered during verification were local frontend proxying in development, a stale unsupported-language path in the problem import/validation surface, host exposure that was looser than the intended local-only default in Compose, and a misleading Docker healthcheck that made a healthy app look broken. Those are now fixed. Targeted verification completed with `npm run verify:practice`, live localhost API checks, live database checks against `practice_submissions`, browser snapshots showing the practice problem list as the default entry flow, `docker compose config` proving localhost-only port publication by default, `curl http://127.0.0.1:3000/api/health`, `curl http://127.0.0.1:3000/api/problems`, `docker compose ps`, and `docker stats`.
