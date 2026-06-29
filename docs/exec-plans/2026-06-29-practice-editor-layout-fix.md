# Practice Editor Layout Fix

## Background

The practice workspace can render the right-side code editor as only its header,
toolbar, and footer. The Monaco container is present, but the editor card is
inside a sticky/grid wrapper without a definite height, so the `h-full` editor
card cannot give its `flex-1` Monaco region usable space.

## Goal

Make the code editor panel visible and usable in the practice problem workspace.

## Scope

- Adjust the practice workspace layout around `PracticeCodeEditor`.
- Keep the existing visual design and component behavior.
- Do not change problem loading, submission, result rendering, or Monaco editor
  synchronization logic.

## Assumptions

- The screenshot shows the normal algorithm-practice workspace, not the
  multi-file debug workspace.
- The intended desktop layout is a sticky right-side editor with a stable height
  while the statement scrolls.
- Mobile and narrower screens should still stack the panels without relying on
  sticky positioning.

## Implementation Steps

1. Add a stable height to the right-side editor shell.
   Verify: Monaco has a nonzero vertical editor area below the toolbar.
2. Preserve responsive stacking.
   Verify: the same shell has a mobile-safe minimum height and desktop viewport
   height.
3. Run the client build.
   Verify: TypeScript and Vite production build complete.

## Verification Approach

- Run `npm --prefix client run build`.
- If a local dev server is already available, visually inspect the page after
  the build-impacting change.

## Progress Log

- 2026-06-29: Reproduced the likely layout cause from the screenshot and code:
  `PracticeCodeEditor` uses `h-full`, but the parent wrapper in
  `PracticeWorkspaceView` has no definite height.
- 2026-06-29: Added a stable viewport-bound height and minimum height to the
  editor wrapper in `PracticeWorkspaceView`.
- 2026-06-29: Verified the client production build and inspected the problem
  page at desktop width. The code editor area rendered with a nonzero height
  below the toolbar.

## Key Decisions

- Fix the height contract at the workspace wrapper instead of changing Monaco or
  introducing editor-specific measurement code.

## Risks and Blockers

- The worktree already contains unrelated modified and untracked files. This fix
  will avoid reverting or normalizing them.

## Final Outcome

Fixed in `client/src/views/PracticeWorkspaceView.vue`. Verification completed
with `npm --prefix client run build` and browser inspection of
`/problems/amazon-maximum-total-dataflow`.
