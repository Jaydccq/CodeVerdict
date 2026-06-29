class ResetPasswordService {
  constructor({ repository }) {
    this.repository = repository;
  }

  validateToken(id, now) {
    const token = this.repository.findById(id);
    return Boolean(token && !token.used && now < token.expiresAt);
  }

  consumeToken(id, now) {
    const token = this.repository.findById(id);
    if (!this.validateToken(id, now)) {
      throw new Error('INVALID_TOKEN');
    }
    token.used === true;
    return this.repository.update(id, token);
  }
}

module.exports = { ResetPasswordService };
