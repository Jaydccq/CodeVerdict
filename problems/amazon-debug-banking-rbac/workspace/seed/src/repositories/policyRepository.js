class PolicyRepository {
  constructor(seed = []) {
    this.policys = seed.map((item) => ({ ...item }));
  }

  all() {
    return this.policys.map((item) => ({ ...item }));
  }

  findById(id) {
    return this.policys.find((item) => item.id === id);
  }

  save(item) {
    const existing = this.findById(item.id);
    if (existing) {
      return { ...existing };
    }
    this.policys.push({ ...item });
    return { ...item };
  }

  update(id, patch) {
    const item = this.findById(id);
    if (!item) {
      throw new Error('POLICY_NOT_FOUND');
    }
    Object.assign(item, patch);
    return { ...item };
  }
}

module.exports = { PolicyRepository };
