## ADDED Requirements

### Requirement: Practice problem detail retrieval
The system SHALL expose a practice problem detail endpoint that returns problem statements, formats, constraints, examples, supported languages, and starter code required by the workspace.

#### Scenario: Load a practice problem
- **WHEN** the client requests a valid problem by slug
- **THEN** the system returns the repository-backed problem details needed to render the workspace

### Requirement: Visible sample execution
The system SHALL provide a `run-sample` operation that executes only visible tests and returns full visible diagnostics on failure.

#### Scenario: Visible sample fails
- **WHEN** a visible sample execution produces the wrong output or execution failure
- **THEN** the response includes the visible input, expected output, actual output when present, and relevant stderr or compile output

### Requirement: Custom stdin execution
The system SHALL provide a `run-custom` operation that executes exactly one caller-provided stdin payload without answer comparison.

#### Scenario: Custom input is run
- **WHEN** the client submits code and custom stdin to `run-custom`
- **THEN** the system returns raw execution results without pass/fail comparison against expected output

### Requirement: Full submit grading with hidden-test protection
The system SHALL provide a `submit` operation that grades visible and hidden tests together while suppressing hidden input and expected output from hidden-only failures.

#### Scenario: Hidden test fails after visible tests pass
- **WHEN** a submission passes visible tests but fails one or more hidden tests
- **THEN** the response includes passed count, total count, and failure type without exposing hidden input or hidden expected output

### Requirement: Practice-safe local execution surface
The system SHALL bind the practice execution surface to `127.0.0.1` by default and SHALL restrict CORS to approved local origins unless explicitly reconfigured.

#### Scenario: Request arrives from a disallowed origin
- **WHEN** a browser request targets the practice API from an origin outside the configured local allowlist
- **THEN** the API rejects the cross-origin access under the configured CORS policy

### Requirement: Stable verdict mapping
The system SHALL surface practice grading outcomes including Accepted, Wrong Answer, Time Limit Exceeded, Runtime Error, and Compile Error.

#### Scenario: Compile failure during submit
- **WHEN** Judge0 reports a compile failure for a submission
- **THEN** the practice API returns a compile error verdict to the client and stores a safe submission result
