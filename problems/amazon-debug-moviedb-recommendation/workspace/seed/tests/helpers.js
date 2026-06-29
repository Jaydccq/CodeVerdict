const { MovieRepository } = require('../src/repositories/movieRepository');
const { RecommendationService } = require('../src/services/recommendationService');

function createFixture(seed = []) {
  const repository = new MovieRepository(seed);
  const service = new RecommendationService({ repository });
  return { repository, service };
}

function runTest(name, visibility, fn) {
  try {
    fn();
    return { name, visibility, passed: true };
  } catch (error) {
    return {
      name,
      visibility,
      passed: false,
      message: error instanceof Error ? error.message : String(error),
    };
  }
}

module.exports = { createFixture, runTest };
