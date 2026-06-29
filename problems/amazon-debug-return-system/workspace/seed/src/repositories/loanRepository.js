class LoanRepository {
  constructor() {
    this.loans = [];
  }

  save(loan) {
    return { ...loan };
  }

  all() {
    return [];
  }

  findById(loanId) {
    return this.loans.find((loan) => loan.id === loanId) ?? null;
  }

  update(updatedLoan) {
    const index = this.loans.findIndex((loan) => loan.id === updatedLoan.id);
    if (index >= 0) {
      this.loans[index] = { ...updatedLoan };
    }
    return { ...updatedLoan };
  }
}

module.exports = { LoanRepository };
