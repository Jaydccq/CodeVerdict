# Add AI Debug Workspace Problem Type

## Why

The current practice platform supports classic stdin/stdout coding problems.
That works for algorithm questions but does not faithfully represent Amazon-style
AI Coding / Debug prompts where the user is expected to inspect and fix a small
broken codebase.

The current `amazon-debug-*` problems were imported as compatibility
adaptations. A first-class problem type is needed so future debug tasks can be
modeled as multi-file bug-fix workspaces instead of pseudo-LeetCode prompts.

## What Changes

- Add a new repository-backed practice problem type named `debug-workspace`
- Add a workspace manifest and seed-file model under `problems/<slug>/workspace/`
- Add dedicated run/submit semantics for multi-file bug-fix problems
- Add a file-tree and multi-file editor workflow in the practice workspace
- Keep current stdin/stdout problem behavior unchanged

## Impact

- Affects problem catalog schema and validation
- Affects practice detail and grading APIs
- Affects frontend workspace UX
- Introduces a dedicated runner path distinct from Judge0
