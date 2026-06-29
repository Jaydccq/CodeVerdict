# Design

## Context

CodeVerdict currently assumes one source string, one language selector, and one
Judge0-backed grading flow per problem. That is sufficient for algorithm
questions, but a debug-repo prompt needs:

- a seeded file tree
- multiple editable files
- a visible test command
- a hidden submit command
- patch or file-map persistence in history

## Decisions

### Separate Problem Type

Introduce `questionType: debug-workspace` instead of stretching the current
stdin/stdout schema.

### Repository-backed Seed Workspace

Each debug problem owns a `workspace/seed/` tree inside its problem directory.
The repository remains the source of truth for broken starter files, visible
tests, hidden tests, and editorial guidance.

### Dedicated Runner

Do not route debug-workspace problems through Judge0. Use a dedicated local
runner profile that materializes an ephemeral workspace, applies user edits to an
allowlisted file set, runs manifest-defined commands, and then destroys the temp
workspace.

### Constrained Editing

The manifest must explicitly declare editable files. Files outside the allowlist
remain read-only or hidden.

### Submission Persistence

Submission history should store the edited-file map or normalized patch summary,
not just a single `sourceCode` string.

## Risks

- Multi-stack workspace runners can become slow and operationally noisy if the
  contract permits arbitrary install steps.
- The frontend complexity jumps materially once a file tree and multi-tab editor
  are introduced.
- Cleanup must be automatic; otherwise debug-workspace tasks will recreate the
  same container/tempdir sprawl the repo just cleaned up.
