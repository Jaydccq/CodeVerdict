class CommentRepository {
  constructor(seed = []) {
    this.comments = seed.map((item) => ({ ...item }));
  }

  all() {
    return this.comments.map((item) => ({ ...item }));
  }

  findById(id) {
    return this.comments.find((item) => item.id === id);
  }

  save(item) {
    const existing = this.findById(item.id);
    if (existing) {
      return { ...existing };
    }
    this.comments.push({ ...item });
    return { ...item };
  }

  update(id, patch) {
    const item = this.findById(id);
    if (!item) {
      throw new Error('COMMENT_NOT_FOUND');
    }
    Object.assign(item, patch);
    return { ...item };
  }
}

module.exports = { CommentRepository };
