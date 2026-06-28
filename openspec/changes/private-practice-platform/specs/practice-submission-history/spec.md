## ADDED Requirements

### Requirement: Dedicated practice submission persistence
The system SHALL store practice submissions in a dedicated persistence model that does not require `userId`, `examId`, leaderboard fields, or MCQ-related fields.

#### Scenario: Save a practice submission
- **WHEN** a user submits code for a practice problem
- **THEN** the system writes a record containing `problemSlug`, `language`, `sourceCode`, `verdict`, `passedCount`, `totalCount`, `safeDetailsJson`, and creation time

### Requirement: Submission history by problem
The system SHALL expose practice submission history by problem slug.

#### Scenario: View history for one problem
- **WHEN** the client requests submissions for a valid problem slug
- **THEN** the system returns the saved practice submissions for that problem in a deterministic order

### Requirement: Safe stored details
The system SHALL store only hidden-test-safe result details for submission history responses.

#### Scenario: Hidden-only failure is persisted
- **WHEN** a submission fails only on hidden tests
- **THEN** the stored safe details omit hidden input and hidden expected output while retaining the visible summary needed for history display
