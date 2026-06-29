## ADDED Requirements

### Requirement: Debug workspace problem directories
The system SHALL support a repository-backed practice problem type for multi-file
bug-fix tasks.

#### Scenario: Catalog loads a debug-workspace problem
- **WHEN** a problem declares `questionType: debug-workspace`
- **THEN** the catalog loads repository metadata, editorial content,
  workspace-manifest metadata, and the seed file tree for that problem

### Requirement: Debug workspace validation
The system SHALL validate debug-workspace problem structure mechanically before
the problem is exposed by the practice API.

#### Scenario: Debug workspace is malformed
- **WHEN** a debug-workspace problem is missing its manifest, seed files, or
  editable-path declarations
- **THEN** validation fails before the problem is available in the product

### Requirement: Amazon AI debug import fidelity
The system SHALL represent imported Amazon AI Coding / Debug problems as
repository-backed debug workspaces instead of stdin/stdout adaptations.

#### Scenario: Amazon debug import is validated
- **WHEN** an Amazon OA problem slug starts with `amazon-debug-`
- **THEN** the problem must declare `questionType: debug-workspace`
