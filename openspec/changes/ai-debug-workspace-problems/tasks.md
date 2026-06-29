## 1. Spec and planning

- [x] 1.1 Validate this OpenSpec change in strict mode
- [x] 1.2 Keep `docs/exec-plans/2026-06-28-ai-coding-debug-workspace-redesign.md` updated during implementation

## 2. Problem catalog contract

- [x] 2.1 Add `debug-workspace` problem metadata to the catalog schema
- [x] 2.2 Validate `workspace/manifest.json`, `workspace/seed/`, and editable file constraints
- [x] 2.3 Preserve current stdin/stdout problem validation unchanged

## 3. Backend runner and APIs

- [x] 3.1 Add problem detail responses for file tree, editable files, and workspace metadata
- [x] 3.2 Add visible-test run for debug-workspace problems
- [x] 3.3 Add submit flow for debug-workspace problems with hidden-safe failure summaries
- [x] 3.4 Add cleanup guarantees for temp workspaces and runner resources

## 4. Frontend workspace

- [x] 4.1 Add file tree and multi-file editor workflow for debug-workspace problems
- [x] 4.2 Add visible test output and submit result rendering for debug-workspace problems
- [x] 4.3 Preserve current algorithm workspace flow unchanged

## 5. Content migration

- [x] 5.1 Add one canonical real debug-workspace example
- [x] 5.2 Migrate representative `amazon-debug-*` problems off the stdin/stdout adaptation path
- [x] 5.3 Migrate every imported Amazon AI/debug problem to `debug-workspace`
- [x] 5.4 Add mechanical validation that prevents `amazon-debug-*` Amazon OA problems from staying on the stdin/stdout path

## 6. Verification

- [x] 6.1 Run OpenSpec strict validation
- [x] 6.2 Run problem validation
- [x] 6.3 Run practice verification including one debug-workspace example
