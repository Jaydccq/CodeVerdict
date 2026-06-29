const { ActivityRepository } = require('../src/repositories/activityRepository');
const { ActivityLogService } = require('../src/services/activityLogService');

function createFixture(seed = []) {
  const repository = new ActivityRepository(seed);
  const service = new ActivityLogService({ repository });
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
