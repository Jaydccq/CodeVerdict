const assert = require('node:assert/strict');
const { createFixture, runTest } = require('./helpers');

const results = [];

results.push(
  runTest('createLoan persists the new loan', 'visible', () => {
    const { loanService, loanRepository } = createFixture();
    const created = loanService.createLoan('u1', 250);
    assert.equal(created.id, 'loan-1');
    assert.equal(loanRepository.all().length, 1);
  }),
);

results.push(
  runTest('listLoans returns the stored user loans', 'visible', () => {
    const { loanService } = createFixture();
    loanService.createLoan('u1', 250);
    const loans = loanService.listLoans('u1');
    assert.equal(loans.length, 1);
    assert.equal(loans[0].principal, 250);
  }),
);

results.push(
  runTest('fundLoan rejects insufficient balance', 'visible', () => {
    const { loanService } = createFixture(40);
    const loan = loanService.createLoan('u1', 250);
    assert.throws(
      () => loanService.fundLoan('u1', loan.id, 50),
      /INSUFFICIENT_BALANCE/,
    );
  }),
);

process.stdout.write(`${JSON.stringify({ results }, null, 2)}\n`);
