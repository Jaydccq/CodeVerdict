const { CommentRepository } = require('../src/repositories/commentRepository');
const { CommentService } = require('../src/services/commentService');

function createFixture(seed = []) {
  const repository = new CommentRepository(seed);
  const service = new CommentService({ repository });
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
