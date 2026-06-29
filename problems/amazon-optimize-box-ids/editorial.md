# Optimize Box IDs

A digit should stay in place only if no smaller digit appears to its right. Otherwise, keeping it where it is would force a larger digit to appear too early in the final string.

Process the string from right to left and record the minimum suffix digit after each position.

- If `boxIds[i]` is greater than the minimum digit that appears later, remove it, increment it by one (capped at `9`), and place it into a multiset of deferred digits.
- Otherwise keep it in the main sequence.

Because digits are only `0` through `9`, the deferred multiset can be stored as a size-10 frequency array. To build the answer, merge:

- the kept digits in their original order
- the deferred digits in sorted order

Before emitting a kept digit `d`, flush every deferred digit smaller than `d`. After all kept digits are emitted, append the remaining deferred digits in ascending order.

This yields the lexicographically smallest reachable string in `O(n)` time and `O(1)` extra space beyond the output buffer.