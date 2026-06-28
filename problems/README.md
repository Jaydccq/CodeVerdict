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

The import script writes a normalized problem directory under `problems/`.
