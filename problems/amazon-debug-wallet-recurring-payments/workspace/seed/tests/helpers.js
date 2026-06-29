const { RecurringPaymentRepository } = require('../src/repositories/recurringPaymentRepository');
const { RecurringPaymentService } = require('../src/services/recurringPaymentService');

function createFixture(seed = []) {
  const repository = new RecurringPaymentRepository(seed);
  const service = new RecurringPaymentService({ repository });
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
