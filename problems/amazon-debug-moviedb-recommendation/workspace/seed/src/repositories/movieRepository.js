class MovieRepository {
  constructor(seed = []) {
    this.movies = seed.map((item) => ({ ...item }));
  }

  all() {
    return this.movies.map((item) => ({ ...item }));
  }

  findById(id) {
    return this.movies.find((item) => item.id === id);
  }

  save(item) {
    const existing = this.findById(item.id);
    if (existing) {
      return { ...existing };
    }
    this.movies.push({ ...item });
    return { ...item };
  }

  update(id, patch) {
    const item = this.findById(id);
    if (!item) {
      throw new Error('MOVIE_NOT_FOUND');
    }
    Object.assign(item, patch);
    return { ...item };
  }
}

module.exports = { MovieRepository };
