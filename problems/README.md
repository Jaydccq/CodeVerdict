# Practice Problem Format

`problems/` is the source of truth for the private practice platform.

Each problem uses this structure:

```text
problems/
  <slug>/
    problem.yaml
    starter-code/
      python.py
      javascript.js
      cpp.cpp
      java.java
    tests/
      visible/
        001.in
        001.out
      hidden/
        001.in
        001.out
    editorial.md
```

`debug-workspace` problems use this structure instead:

```text
problems/
  <slug>/
    problem.yaml
    editorial.md
    workspace/
      manifest.json
      seed/
        ...
```

## `problem.yaml`

Required fields:

- `slug`
- `title`
- `difficulty`
- `description`
- `inputFormat`
- `outputFormat`
- `constraints`
- `samples`
- `supportedLanguages`
- `timeLimitMs`
- `memoryLimitKb`

Optional fields:

- `source`
- `questionType` (`algorithm` by default, `debug-workspace` when present)

Example:

```yaml
slug: sum-pair
title: Sum Pair
difficulty: easy
description: |
  Find the first pair of indices whose values sum to the target.
inputFormat: |
  The first line contains n.
outputFormat: |
  Print two indices.
constraints: |
  2 <= n <= 10^5
samples:
  - input: |
      4
      2 7 11 15
      9
    output: |
      0 1
    explanation: |
      nums[0] + nums[1] = 9.
supportedLanguages:
  - python
  - javascript
  - cpp
  - java
timeLimitMs: 2000
memoryLimitKb: 262144
```

`editorial.md` is optional for legacy/local sample problems and required for
imported Amazon OA problems marked with `source: amazon-oa`. It stores the
answer and explanation shown in the practice workspace.

For `debug-workspace` problems, `workspace/manifest.json` must declare:

- `stack`
- `entryFiles`
- `editablePaths`
- `visibleTestScript`
- `submitTestScript`

Only files referenced by `entryFiles` or `editablePaths` are exposed back to
the client workspace. Hidden test scripts may live inside `workspace/seed/`,
but they must not be listed as visible workspace files.

## Validation

Run:

```bash
npm run validate:problems
```

The validator checks:

- required fields exist
- `slug` matches the directory name
- `supportedLanguages` only uses known language keys
- starter code exists for every declared language
- visible and hidden tests both exist
- every `.in` file has a matching `.out` file
- every declared sample matches a visible test pair
- Amazon OA imports have non-empty `editorial.md`
- Amazon OA judge-facing content does not contain unresolved source placeholders
- `debug-workspace` manifests point to valid seed files and safe relative paths

## Importing from JSON

You can import a problem from a JSON file:

```bash
npm --prefix server run import:problem -- --input /path/to/problem.json
```

Expected JSON fields:

- all `problem.yaml` fields
- `starterCode`
- `visibleTests`
- `hiddenTests`
- `editorial` for `source: "amazon-oa"` imports

The import script writes a normalized problem directory under `problems/`.
