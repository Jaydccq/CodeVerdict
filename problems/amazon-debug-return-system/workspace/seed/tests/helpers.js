const { LoanRepository } = require('../src/repositories/loanRepository');
const { AccountService } = require('../src/services/accountService');
const { LoanService } = require('../src/services/loanService');

function createFixture(balance = 100) {
  const loanRepository = new LoanRepository();
  const accountService = new AccountService([{ userId: 'u1', balance }]);
  const loanService = new LoanService({ loanRepository, accountService });

  return { loanRepository, accountService, loanService };
}

function runTest(name, visibility, fn) {
  try {
    fn();
    return { name, visibility, passed: true };
  } catch (error) {
    return {
      name,
      visibility,
      passed: false,
      message: error instanceof Error ? error.message : String(error),
    };
  }
}

module.exports = { createFixture, runTest };
