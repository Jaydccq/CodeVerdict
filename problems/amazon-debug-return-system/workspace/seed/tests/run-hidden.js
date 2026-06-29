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

results.push(
  runTest('repayLoan also rejects insufficient balance', 'hidden', () => {
    const { loanService } = createFixture(100);
    const loan = loanService.createLoan('u1', 250);
    loanService.fundLoan('u1', loan.id, 60);
    assert.throws(
      () => loanService.repayLoan('u1', loan.id, 50),
      /INSUFFICIENT_BALANCE/,
    );
  }),
);

results.push(
  runTest('successful fund and repay update the loan lifecycle', 'hidden', () => {
    const { loanService } = createFixture(300);
    const loan = loanService.createLoan('u1', 250);
    const funded = loanService.fundLoan('u1', loan.id, 120);
    assert.equal(funded.status, 'funded');
    const repaid = loanService.repayLoan('u1', loan.id, 120);
    assert.equal(repaid.status, 'repaid');
  }),
);

process.stdout.write(`${JSON.stringify({ results }, null, 2)}\n`);
