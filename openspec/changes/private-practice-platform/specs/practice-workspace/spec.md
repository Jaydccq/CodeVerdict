## ADDED Requirements

### Requirement: Problem list as the default entry flow
The system SHALL make the practice problem list the default visible entry path for the product.

#### Scenario: Fresh local session starts in practice mode
- **WHEN** the application is opened in its default local flow
- **THEN** the user lands on the practice problem list instead of exam selection, login, or admin pages

### Requirement: LeetCode-style workspace layout
The system SHALL provide a practice workspace with a statement panel, code editor panel, and bottom results/history panel.

#### Scenario: User opens a problem workspace
- **WHEN** the user selects a problem from the problem list
- **THEN** the workspace shows the problem statement on the left, the language-aware editor on the right, and run/submit output plus submission history at the bottom

### Requirement: Language-aware starter code
The workspace SHALL allow the user to switch among supported languages and load the corresponding starter code for the active problem.

#### Scenario: User changes language
- **WHEN** the user selects another supported language
- **THEN** the editor updates to the starter code defined for that language for the active problem

### Requirement: Default flow independent of exam and auth concepts
The practice workspace SHALL not require login, exam selection, timer state, or admin interactions to complete the core solve-run-submit-history flow.

#### Scenario: User completes a practice round
- **WHEN** the user chooses a problem, writes code, runs samples, submits, and checks history
- **THEN** the full flow succeeds without depending on exam or authentication state
