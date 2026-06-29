class TokenRepository {
  constructor(seed = []) {
    this.tokens = seed.map((item) => ({ ...item }));
  }

  all() {
    return this.tokens.map((item) => ({ ...item }));
  }

  findById(id) {
    return this.tokens.find((item) => item.id === id);
  }

  save(item) {
    const existing = this.findById(item.id);
    if (existing) {
      return { ...existing };
    }
    this.tokens.push({ ...item });
    return { ...item };
  }

  update(id, patch) {
    const item = this.findById(id);
    if (!item) {
      throw new Error('TOKEN_NOT_FOUND');
    }
    Object.assign(item, patch);
    return { ...item };
  }
}

module.exports = { TokenRepository };
