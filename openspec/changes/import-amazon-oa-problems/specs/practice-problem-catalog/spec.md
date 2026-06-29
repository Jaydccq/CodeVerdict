## MODIFIED Requirements

### Requirement: Strict problem directory contract
Each practice problem SHALL use a strict directory structure containing `problem.yaml`, `starter-code/`, `tests/visible/`, `tests/hidden/`, and, for imported Amazon OA content, `editorial.md`.

#### Scenario: Problem directory is complete
- **WHEN** a problem directory contains the required metadata, starter code, tests, and required editorial artifact
- **THEN** the loader accepts the problem as structurally valid

### Requirement: Mechanical problem validation
The system SHALL validate problem metadata, file completeness, fixture consistency, and required editorial content at startup and through a repository command named `validate:problems`.

#### Scenario: Missing editorial fails validation for imported content
- **WHEN** an imported Amazon OA problem directory is missing `editorial.md` or the file is empty
- **THEN** startup validation and `validate:problems` both fail with actionable errors

## ADDED Requirements

### Requirement: Amazon OA source manifest
The system SHALL include a repository-controlled manifest extracted from the Amazon OA HTML source so imported content can be audited against the source artifact.

#### Scenario: Source extraction is complete
- **WHEN** the source extraction is run
- **THEN** it identifies exactly 27 source items with their source IDs, titles, categories, and original structured fields

### Requirement: Complete imported problem content
Each imported Amazon OA problem SHALL have complete judge-facing problem text, examples, visible tests, hidden tests, starter code, and editorial content without unresolved source placeholders.

#### Scenario: Imported problem has no unresolved placeholders
- **WHEN** `validate:problems` checks an imported Amazon OA problem
- **THEN** it rejects judge-facing content containing unresolved source placeholders such as "未提供", "未公开", or "不伪造官方答案"
