## Context

The repository already has a working NestJS backend, Vue frontend, Monaco editor integration, and Judge0-based code execution. Those are useful assets. The current product shape, however, is centered on exams, authentication, admin CRUD, leaderboards, and score tracking. The desired product is a local private practice platform with stdin/stdout coding problems and no login.

This is a cross-cutting change because it touches routing, persistence, execution semantics, content management, and local security defaults. The conversion should prefer compatibility with existing runtime components while avoiding deep coupling to exam/user concepts in the new flow.

## Goals / Non-Goals

**Goals:**

- Use repository files as the source of truth for problems and tests.
- Validate problem structure mechanically at startup and via CLI.
- Preserve Judge0 execution but expose it through practice-mode APIs.
- Add a dedicated practice submission table with no exam/user fields.
- Present a problem-list-to-workspace UX as the default product surface.
- Keep the initial change compatible-first by not requiring physical removal of all legacy code.

**Non-Goals:**

- Rewriting the entire stack or replacing Judge0.
- Preserving the exam platform as a co-equal primary experience.
- Building multi-user support, admin CRUD, class features, or leaderboards.
- Adding speculative abstractions beyond the immediate practice flow.

## Decisions

### 1. File-backed problems instead of database-backed problems

The new product needs AI-friendly batch creation and modification. A strict repository layout under `problems/` is a better source of truth than an admin UI or a mirrored database table.

Alternatives considered:

- Mirror problems into the database at startup.
  Rejected because it creates two sources of truth and makes bulk edits harder to reason about.
- Keep the current admin-managed problem entity as the primary model.
  Rejected because it preserves exactly the product surface the new direction is trying to leave behind.

### 2. Dedicated practice submission persistence

The new submit flow must not reuse the legacy `Submission` entity because that model is shaped around `userId`, `examId`, and score-related concepts. A separate practice submission table keeps the new flow clean and reduces the risk of legacy business rules leaking into the practice product.

Alternatives considered:

- Reuse the existing submission table with nullable compatibility fields.
  Rejected because the semantics remain polluted by exam/user history and are likely to cause accidental coupling.

### 3. Practice APIs with hard-coded run semantics

The API surface should explicitly separate:

- `run-sample`: compare only visible tests and return full visible diagnostics
- `run-custom`: execute one custom stdin without answer comparison
- `submit`: grade visible and hidden tests together, but suppress hidden input/output on hidden-only failures

This preserves the expected LeetCode-style experience while keeping hidden tests safe.

Alternatives considered:

- One generic run endpoint with mode flags.
  Rejected because it weakens the contract and makes hidden-test safety easier to get wrong.

### 4. Local-only execution defaults

Without login, the practice API is an unauthenticated code execution surface. The server must bind to `127.0.0.1` by default and use restrictive CORS to reduce accidental exposure.

Alternatives considered:

- Leave network exposure unchanged and rely on user environment.
  Rejected because it makes the safe path optional instead of default.

### 5. Compatibility-first product conversion

The main user-facing flow should be replaced, but legacy exam/admin/auth code does not need to be physically deleted in phase 1. The key requirement is that the new practice flow works end-to-end and no longer depends on legacy concepts.

Alternatives considered:

- Aggressively delete all unrelated modules before rebuilding the flow.
  Rejected because it increases migration risk and slows down getting to a working practice product.

## Risks / Trade-offs

- [Legacy coupling in services and entities] → Introduce new practice-facing modules and persistence instead of adapting every legacy concept in place.
- [Problem schema drift from AI-generated content] → Add startup validation and `validate:problems` so malformed content fails fast.
- [Hidden test leakage through reused result objects] → Create a safe result-shaping layer specifically for submit responses and stored details.
- [Ambiguous product entry paths] → Make the problem list the default route and hide exam/admin/auth from the normal flow.
- [Unauthenticated code execution exposure] → Default to loopback binding and restrictive CORS, with any broader exposure requiring explicit configuration.

## Migration Plan

1. Initialize OpenSpec artifacts and align the repository plan with the change.
2. Define the `problems/` format and validator.
3. Add a practice module and dedicated practice submission persistence.
4. Build practice APIs on top of the existing Judge0 execution core.
5. Repoint the frontend to problem list and workspace flows.
6. Verify with at least one sample problem end-to-end.

Rollback strategy:

- Because this is compatibility-first, legacy code remains available in the repository during phase 1.
- If the new practice flow is incomplete, the repository can pause on the new artifacts without having already deleted the old platform.

## Open Questions

- Whether startup loading should be eager-only in phase 1 or include development reload support.
- Whether autosave is worth preserving later as a practice-only feature, or should stay out entirely.
- Whether import tooling for Markdown/JSON should live as a CLI script only or as a small normalization package under `problems/`.
