# Loan Software Repository Debug

The seeded workspace has three intended edit points:

- `src/repositories/loanRepository.js`
- `src/services/accountService.js`
- `src/services/loanService.js`

## Root Causes

1. `loanRepository.save` returns the loan object but never persists it.
2. `loanRepository.all` returns an empty array instead of the stored loans.
3. `accountService.canDebit` checks only whether the balance is positive, not
   whether it covers the requested amount.

Because both `fundLoan` and `repayLoan` call `accountService.debit`, fixing the
balance check once restores the money-safety invariant for both paths.

## Expected Fix Shape

- persist newly created loans in the repository
- return the actual stored collection from the repository
- require `balance >= amount` before any debit is allowed

After those fixes, visible tests pass and the hidden regression for repay with
insufficient balance also passes.
