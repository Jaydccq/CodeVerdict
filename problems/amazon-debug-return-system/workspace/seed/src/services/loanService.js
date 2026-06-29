class LoanService {
  constructor({ loanRepository, accountService }) {
    this.loanRepository = loanRepository;
    this.accountService = accountService;
  }

  createLoan(userId, principal) {
    const loan = {
      id: `loan-${this.loanRepository.all().length + 1}`,
      userId,
      principal,
      funded: 0,
      repaid: 0,
      status: 'created',
    };
    return this.loanRepository.save(loan);
  }

  listLoans(userId) {
    return this.loanRepository
      .all()
      .filter((loan) => loan.userId === userId);
  }

  fundLoan(userId, loanId, amount) {
    const loan = this.loanRepository.findById(loanId);
    if (!loan) throw new Error('LOAN_NOT_FOUND');
    this.accountService.debit(userId, amount);
    loan.funded += amount;
    loan.status = 'funded';
    return this.loanRepository.update(loan);
  }

  repayLoan(userId, loanId, amount) {
    const loan = this.loanRepository.findById(loanId);
    if (!loan) throw new Error('LOAN_NOT_FOUND');
    this.accountService.debit(userId, amount);
    loan.repaid += amount;
    if (loan.repaid >= loan.funded) {
      loan.status = 'repaid';
    }
    return this.loanRepository.update(loan);
  }
}

module.exports = { LoanService };
