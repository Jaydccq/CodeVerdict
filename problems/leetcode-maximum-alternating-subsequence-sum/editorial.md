# Maximum Alternating Subsequence Sum

Track two best states while scanning the array.

- `plus` = best alternating sum where the next chosen number would be subtracted.
- `minus` = best alternating sum where the next chosen number would be added.

For each value `x`:

- `nextPlus = max(plus, minus + x)`
- `nextMinus = max(minus, plus - x)`

Initialize `plus = 0` and `minus = 0`. After processing every value, the answer is `plus`.

Because all transitions use only the previous pair of states, the solution runs in `O(n)` time and `O(1)` extra space.