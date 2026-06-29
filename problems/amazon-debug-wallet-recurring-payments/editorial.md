# Wallet Recurring Payments Repository Debug

Select active records with nextRunAt <= now, allow amount <= remaining balance, and assign the updated nextRunAt before saving.

The repository tests are deterministic practice tests. Fix the implementation instead of changing test files.
