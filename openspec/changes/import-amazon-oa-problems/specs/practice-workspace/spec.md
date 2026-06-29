## ADDED Requirements

### Requirement: Editorial display
The practice workspace SHALL display answer and explanation content for problems that provide an editorial artifact.

#### Scenario: User opens an imported problem
- **WHEN** the problem detail response includes editorial content
- **THEN** the workspace provides a readable solution/explanation section for that problem

### Requirement: Editorial display is independent from judging
The editorial display SHALL NOT change run-sample, run-custom, submit, or submission history behavior.

#### Scenario: User submits after reading editorial
- **WHEN** the user reads the editorial and submits code
- **THEN** grading still uses the same visible/hidden test contract and hidden-test-safe response behavior

### Requirement: Editorial edits persist to the repository artifact
The practice workspace SHALL allow the user to edit editorial content and persist it back to the repository-backed `editorial.md` artifact for the active problem.

#### Scenario: User saves revised answer notes
- **WHEN** the user edits the answer-analysis content for a practice problem and saves it
- **THEN** the backend writes the updated content to that problem's `editorial.md`
- **AND** the subsequent practice problem detail response returns the persisted editorial content
