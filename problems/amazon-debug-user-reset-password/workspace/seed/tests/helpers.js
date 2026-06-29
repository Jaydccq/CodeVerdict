const { TokenRepository } = require('../src/repositories/tokenRepository');
const { ResetPasswordService } = require('../src/services/resetPasswordService');

function createFixture(seed = []) {
  const repository = new TokenRepository(seed);
  const service = new ResetPasswordService({ repository });
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
