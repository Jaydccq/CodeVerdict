# Design

## Context

CodeVerdict is currently a single-user private practice platform. Problems are loaded from `problems/<slug>/problem.yaml`, starter code, and visible/hidden test fixtures. The source Amazon OA HTML contains 16 algorithm items and 11 AI Coding / Debug items, but many fields are explicitly incomplete.

## Decisions

### Editorials

Each imported Amazon OA problem will include an `editorial.md` file under its problem directory. The file is the source of truth for answer and explanation content.

The backend will expose the editorial on problem detail responses. The frontend workspace will render it in a solution/explanation section without changing run/submit behavior.

### Source Extraction

The HTML source will be parsed into a repository-controlled intermediate manifest. The manifest must preserve source IDs, titles, categories, tags, original field text, and completion status so the import is auditable.

### Algorithm Items

Algorithm items will be normalized into executable stdin/stdout practice problems with deterministic visible and hidden tests.

### AI Coding / Debug Items

AI/debug items will be represented as clearly labeled practice adaptations unless a later change introduces real multi-file debugging workspaces. The statement must not imply that generated fixtures are official Amazon tests.

### Generated Tests

Generated tests are authored practice fixtures. They must be deterministic, have checked expected outputs, and remain hidden from submit responses when placed under `tests/hidden`.

## Risks

- Some source items are too incomplete to reconstruct a unique original problem. Those items must be marked as adaptations rather than silently pretending the completion is official.
- Requiring editorials globally may break existing sample problems unless they receive editorials in the same change.
- Importing 27 problems is a high-volume content task; validation must catch placeholder text and missing artifacts.
