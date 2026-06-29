const { ReviewRepository } = require('../src/repositories/reviewRepository');
const { ReviewModerationService } = require('../src/services/reviewModerationService');

function createFixture(seed = []) {
  const repository = new ReviewRepository(seed);
  const service = new ReviewModerationService({ repository });
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
