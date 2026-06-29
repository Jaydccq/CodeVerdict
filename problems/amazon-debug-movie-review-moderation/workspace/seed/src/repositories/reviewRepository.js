class ReviewRepository {
  constructor(seed = []) {
    this.reviews = seed.map((item) => ({ ...item }));
  }

  all() {
    return this.reviews.map((item) => ({ ...item }));
  }

  findById(id) {
    return this.reviews.find((item) => item.id === id);
  }

  save(item) {
    const existing = this.findById(item.id);
    if (existing) {
      return { ...existing };
    }
    this.reviews.push({ ...item });
    return { ...item };
  }

  update(id, patch) {
    const item = this.findById(id);
    if (!item) {
      throw new Error('REVIEW_NOT_FOUND');
    }
    Object.assign(item, patch);
    return { ...item };
  }
}

module.exports = { ReviewRepository };
