# Fix Docker Startup

## Background

The repository exposes Docker wrappers for the default local practice stack and the optional bundled Judge0 profile. The user asked to "fix Docker", but the exact failure mode is not yet established in-repo for this run.

## Goal

Make the default Docker startup path work reliably for local practice development.

## Scope

- Inspect the current Docker startup flow and capture the actual failure.
- Apply the smallest Docker-related change required to fix the failure.
- Verify the relevant startup path after the change.

## Assumptions

- The intended default path is `npm run docker:up`, not the bundled Judge0 profile.
- Existing unrelated worktree changes are not part of this task and should remain untouched.
- A minimal Docker/config/script fix is preferable to broader refactoring.

## Implementation Steps

1. Reproduce the current Docker startup failure.
   Verify: capture the failing command output or health state.
2. Identify the smallest viable fix in Docker config, Dockerfile, or wrapper scripts.
   Verify: changed files map directly to the failure.
3. Re-run the relevant startup flow.
   Verify: containers start successfully and the app health path responds or the stack reaches healthy/running state.
4. Record the result.
   Verify: this plan reflects the final outcome and any residual risks.

## Verification Approach

- Run the current Docker wrapper used by the default local path.
- Inspect `docker compose ps` and relevant container logs if startup fails.
- After the fix, rerun the wrapper and confirm the app is serving the expected health endpoint.

## Progress Log

- 2026-06-28: Reviewed Docker entrypoints, compose file, Dockerfile, README startup instructions, and the existing private-practice conversion plan.
- 2026-06-28: Noted a dirty worktree with unrelated user changes; Docker work will stay surgical.
- 2026-06-28: Reproduced the current default path with `npm run docker:up`; it built and reached a healthy `/api/health` state, so the actionable gap was startup verification rather than a hard boot failure.
- 2026-06-28: Confirmed this machine is `arm64` and re-read the existing repo decision log showing bundled `judge0/judge0:1.13.1` is a known-broken Apple Silicon path that can trigger restart loops and large image downloads.
- 2026-06-28: Added a shared Docker app-wait script, wired both startup wrappers to wait for `/api/health`, and added an `arm64` guard to `npm run docker:up:judge0` unless `CODEVERDICT_ALLOW_UNSUPPORTED_JUDGE0_LOCAL=1` is explicitly set.
- 2026-06-28: Updated `README.md` so the script-level Judge0 guard and override path are documented alongside the existing Apple Silicon warning.
- 2026-06-28: Verified `bash -n` on the edited scripts, re-ran `npm run docker:up` successfully, confirmed `curl http://127.0.0.1:3000/api/health` returned `{"status":"ok",...}`, and confirmed `npm run docker:up:judge0` now fails fast with the intended `arm64` refusal message.

## Key Decisions

- Reproduce the failure before editing anything.
- Treat `npm run docker:up` as the primary success target unless evidence shows the optional Judge0 profile is the broken path the user actually needs.
- Encode the documented Apple Silicon Judge0 incompatibility in the wrapper itself instead of relying on README text alone.
- Make Docker startup scripts prove app readiness before reporting success.

## Risks And Blockers

- Docker commands require local engine access and may surface host-specific issues outside the repository.
- Existing uncommitted edits to Docker-adjacent files may constrain how small the change can be.
- The override path for bundled Judge0 remains unsupported on `arm64`; this change prevents accidental use but does not make the upstream image compatible.

## Final Outcome

The default Docker workflow is now safer and more deterministic on this machine. `npm run docker:up` still starts the lightweight practice stack, but it now waits for `/api/health` before returning success and prints compose/log diagnostics if readiness never arrives. `npm run docker:up:judge0` now refuses immediately on `arm64` unless `CODEVERDICT_ALLOW_UNSUPPORTED_JUDGE0_LOCAL=1` is set, which turns the repository's existing Judge0 compatibility warning into a mechanical guard instead of a doc-only caution.
