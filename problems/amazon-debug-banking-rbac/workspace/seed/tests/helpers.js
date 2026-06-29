const { PolicyRepository } = require('../src/repositories/policyRepository');
const { AccessService } = require('../src/services/accessService');

function createFixture(seed = []) {
  const repository = new PolicyRepository(seed);
  const service = new AccessService({ repository });
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
