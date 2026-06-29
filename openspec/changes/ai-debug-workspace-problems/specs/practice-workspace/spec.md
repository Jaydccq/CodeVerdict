## ADDED Requirements

### Requirement: Multi-file debug workspace UX
The practice workspace SHALL render a dedicated UI for `debug-workspace`
problems.

#### Scenario: User opens a debug-workspace problem
- **WHEN** the user opens a problem of type `debug-workspace`
- **THEN** the workspace shows the bug prompt, file tree, editable files,
  multi-file editor, visible test output, and submit controls

### Requirement: Debug editing constraints
The workspace SHALL respect repository-defined editable file constraints.

#### Scenario: File is outside editable allowlist
- **WHEN** a debug-workspace file is not declared editable by the manifest
- **THEN** the user cannot modify it through the practice editor
