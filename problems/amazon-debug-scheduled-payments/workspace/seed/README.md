# Payment Scheduler

The scheduler stores payment requests and executes pending payments when they
become due.

## Contract

- `schedulePayment(request, now)` creates a new scheduled payment.
- `request.id` and `request.recipientId` are required.
- `request.amount` must be greater than `0`.
- `request.scheduledAt` must not be earlier than `now`.
- `request.scheduledAt === now` is valid and means the payment is immediately
  due.
- duplicate payment IDs must be rejected with `DUPLICATE_PAYMENT`.
- created payments start with `status: "scheduled"`.
- `runDuePayments(now)` executes every payment whose status is `"scheduled"`
  and whose `scheduledAt <= now`.
- executed payments must be persisted with `status: "processed"` and
  `executedAt: now`.
- processed payments must not be executed again.

Do not change test files. Fix the repository code so the predefined tests pass.
