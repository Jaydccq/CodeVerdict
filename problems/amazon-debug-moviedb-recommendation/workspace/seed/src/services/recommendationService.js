class RecommendationService {
  constructor({ repository }) {
    this.repository = repository;
  }

  recommend(user, minRating) {
    return this.repository
      .all()
      .filter((movie) => movie.rating > minRating)
      .filter((movie) => movie.genres.every((genre) => user.preferredGenres.includes(genre)))
      .sort((left, right) => left.rating - right.rating);
  }
}

module.exports = { RecommendationService };
