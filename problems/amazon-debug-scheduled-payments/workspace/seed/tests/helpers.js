const { PaymentRepository } = require('../src/repositories/paymentRepository');
const { PaymentScheduler } = require('../src/services/paymentScheduler');

function createFixture(initialPayments = []) {
  const paymentRepository = new PaymentRepository(initialPayments);
  const paymentScheduler = new PaymentScheduler({ paymentRepository });

  return { paymentRepository, paymentScheduler };
}

function validPayment(overrides = {}) {
  return {
    id: 'payment-1',
    recipientId: 'merchant-1',
    amount: 100,
    scheduledAt: 1000,
    ...overrides,
  };
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

module.exports = { createFixture, runTest, validPayment };
