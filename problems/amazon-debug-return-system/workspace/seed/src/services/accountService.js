class AccountService {
  constructor(accounts) {
    this.accounts = new Map(
      accounts.map((account) => [account.userId, { ...account }]),
    );
  }

  getAccount(userId) {
    const account = this.accounts.get(userId);
    if (!account) {
      throw new Error('ACCOUNT_NOT_FOUND');
    }
    return account;
  }

  canDebit(userId, amount) {
    return this.getAccount(userId).balance > 0;
  }

  debit(userId, amount) {
    if (!this.canDebit(userId, amount)) {
      throw new Error('INSUFFICIENT_BALANCE');
    }
    const account = this.getAccount(userId);
    account.balance -= amount;
    return account.balance;
  }

  credit(userId, amount) {
    const account = this.getAccount(userId);
    account.balance += amount;
    return account.balance;
  }
}

module.exports = { AccountService };
