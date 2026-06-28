## Why

CodeVerdict currently presents itself as a full coding exam platform with login, exam scheduling, admin workflows, scoring, and leaderboards. The immediate need is narrower: a private LeetCode-style practice product for one local user, with file-backed problem authoring, online coding, sample/custom runs, full submit grading, and saved submission history.

## What Changes

- Introduce a repository-backed problem catalog under `problems/` with a strict directory and schema format.
- Add startup and CLI validation for problem content so AI-assisted bulk authoring is mechanically checked.
- Add practice-facing APIs for listing problems, loading problem details, running visible samples, running custom stdin, submitting full test suites, and listing saved submissions.
- Add a dedicated practice submission model that does not depend on login, users, exams, scores, or leaderboards.
- Repoint the visible frontend flow to a problem list and LeetCode-style workspace while hiding exam/admin/auth from the default product path.
- Apply local-only safety defaults for unauthenticated code execution endpoints.

## Capabilities

### New Capabilities

- `practice-problem-catalog`: File-backed problem definitions with strict validation and list/detail access.
- `practice-grading-api`: Practice-mode run and submit APIs with visible/hidden test semantics and local-only safety defaults.
- `practice-submission-history`: Persistent practice submission records and retrieval by problem slug.
- `practice-workspace`: Problem list and coding workspace flow optimized for a single-user practice experience.

### Modified Capabilities

- None.

## Impact

- Backend modules around problem loading, Judge0 integration, submission persistence, and API routing.
- Frontend router, stores, and workspace views.
- New repository content under `problems/`.
- New validation tooling and startup checks.
- Local server binding and CORS defaults for practice execution endpoints.
