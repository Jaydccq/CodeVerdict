# Payment Scheduling Repository Debug

The README is the source of truth for this workspace. A correct fix should make
the scheduler enforce these invariants:

- `amount` must be strictly positive, so `0` and negative amounts are rejected.
- `scheduledAt` may be equal to `now`; only timestamps before `now` are in the
  past.
- duplicate payment IDs are rejected instead of silently returning an existing
  payment.
- `runDuePayments(now)` executes pending payments with `scheduledAt <= now`.
- executed payments are persisted with `status: "processed"` and `executedAt`.
- already processed payments are not executed again.

The seeded bugs are intentionally small: incorrect comparison operators,
duplicate handling that returns the old row, and a status update that uses a
comparison expression instead of assignment. Fix the implementation rather than
weakening the tests.
