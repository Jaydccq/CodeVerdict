# Wallet Recurring Payments

## Contract

- executeDue(now, balance) executes active payments whose nextRunAt <= now.
- A payment may execute when amount <= balance.
- Executed payments update nextRunAt by intervalDays.
- Insufficient balance leaves the payment unchanged.
