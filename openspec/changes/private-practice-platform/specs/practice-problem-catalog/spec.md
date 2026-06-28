## ADDED Requirements

### Requirement: Repository-backed problem catalog
The system SHALL load practice problems directly from repository files under the `problems/` directory and SHALL NOT require database mirroring for problem definitions.

#### Scenario: List available problems
- **WHEN** the practice API requests the problem list
- **THEN** the system returns the set of valid repository-backed problems with stable identifiers and display metadata

### Requirement: Strict problem directory contract
Each practice problem SHALL use a strict directory structure containing `problem.yaml`, `starter-code/`, `tests/visible/`, and `tests/hidden/`.

#### Scenario: Problem directory is complete
- **WHEN** a problem directory contains the required metadata and test locations
- **THEN** the loader accepts the problem as structurally valid

### Requirement: Mechanical problem validation
The system SHALL validate problem metadata and file completeness at startup and through a repository command named `validate:problems`.

#### Scenario: Missing hidden tests fail validation
- **WHEN** a problem directory has no hidden tests or has unmatched input/output files
- **THEN** startup validation and `validate:problems` both fail with actionable errors

### Requirement: Language declarations stay consistent
The system SHALL reject problem definitions whose declared supported languages do not align with known runtime mappings or available starter code.

#### Scenario: Unsupported language is declared
- **WHEN** `problem.yaml` declares a language that is not mapped to a known runtime
- **THEN** validation fails before the problem is exposed by the practice API
