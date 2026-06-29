## ADDED Requirements

### Requirement: Dedicated debug workspace run and submit flow
The system SHALL provide run and submit behavior for multi-file debug-workspace
problems without using the single-source stdin/stdout grading contract.

#### Scenario: User runs visible tests for a debug problem
- **WHEN** the user edits allowed files in a debug-workspace problem and runs
  visible tests
- **THEN** the backend materializes an ephemeral workspace, applies the edits,
  runs the visible test command, and returns test results for display

#### Scenario: User submits a debug problem
- **WHEN** the user submits a debug-workspace problem
- **THEN** the backend runs the full test suite for that problem
- **AND** hidden failures are summarized safely without exposing hidden test
  internals

### Requirement: Runner cleanup
The system SHALL clean temporary workspace and runner resources after every run
and submit action.

#### Scenario: Debug run completes
- **WHEN** a debug-workspace run or submit finishes
- **THEN** temporary files and containers created for that execution are removed
