class ActivityRepository {
  constructor(seed = []) {
    this.activitys = seed.map((item) => ({ ...item }));
  }

  all() {
    return this.activitys.map((item) => ({ ...item }));
  }

  findById(id) {
    return this.activitys.find((item) => item.id === id);
  }

  save(item) {
    const existing = this.findById(item.id);
    if (existing) {
      return { ...existing };
    }
    this.activitys.push({ ...item });
    return { ...item };
  }

  update(id, patch) {
    const item = this.findById(id);
    if (!item) {
      throw new Error('ACTIVITY_NOT_FOUND');
    }
    Object.assign(item, patch);
    return { ...item };
  }
}

module.exports = { ActivityRepository };
