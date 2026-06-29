# Import Amazon OA Problems

## Why

The repository has a local source artifact, `/Users/hongxichen/Downloads/amazon_oa_questions_structured_fields.html`, containing 27 Amazon OA items. The current practice platform can run repository-backed stdin/stdout problems, but it does not have a first-class answer/editorial artifact and the source HTML has missing samples, hidden tests, limits, and explanations.

The import needs to produce complete, validated practice content instead of preserving incomplete source notes.

## What Changes

- Add first-class editorial support to repository-backed practice problems.
- Require imported Amazon OA problems to include answer and explanation content.
- Extract the HTML source into a reproducible intermediate manifest.
- Add all 27 source items as repository-backed practice content.
- Complete missing statements, examples, visible tests, hidden tests, starter code, and editorial explanations.
- Label generated tests as authored practice tests, not official Amazon hidden tests.

## Impact

- Affects `problems/` content and validation.
- Affects practice problem metadata served by the backend.
- Affects the practice workspace UI so the user can read, edit, and persist answers/explanations back into repository-backed `editorial.md`.
- Adds import/conversion tooling for the Amazon OA HTML source.
- Does not reintroduce login, exams, admin flows, or database-backed problem definitions.
