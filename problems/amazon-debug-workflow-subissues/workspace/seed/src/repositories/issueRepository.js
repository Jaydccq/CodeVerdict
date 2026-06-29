class IssueRepository {
  constructor(seed = []) {
    this.issues = seed.map((item) => ({ ...item }));
  }

  all() {
    return this.issues.map((item) => ({ ...item }));
  }

  findById(id) {
    return this.issues.find((item) => item.id === id);
  }

  save(item) {
    const existing = this.findById(item.id);
    if (existing) {
      return { ...existing };
    }
    this.issues.push({ ...item });
    return { ...item };
  }

  update(id, patch) {
    const item = this.findById(id);
    if (!item) {
      throw new Error('ISSUE_NOT_FOUND');
    }
    Object.assign(item, patch);
    return { ...item };
  }
}

module.exports = { IssueRepository };
