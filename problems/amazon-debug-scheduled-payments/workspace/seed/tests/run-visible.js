const assert = require('node:assert/strict');
const { createFixture, runTest, validPayment } = require('./helpers');

const results = [];

results.push(
  runTest('schedulePayment rejects zero amount', 'visible', () => {
    const { paymentScheduler } = createFixture();
    assert.throws(
      () =>
        paymentScheduler.schedulePayment(
          validPayment({ amount: 0, scheduledAt: 1100 }),
          1000,
        ),
      /INVALID_AMOUNT/,
    );
  }),
);

results.push(
  runTest('schedulePayment allows current timestamp', 'visible', () => {
    const { paymentScheduler } = createFixture();
    const payment = paymentScheduler.schedulePayment(
      validPayment({ scheduledAt: 1000 }),
      1000,
    );

    assert.equal(payment.status, 'scheduled');
    assert.equal(payment.scheduledAt, 1000);
  }),
);

results.push(
  runTest('runDuePayments executes payments due exactly now', 'visible', () => {
    const { paymentRepository, paymentScheduler } = createFixture([
      validPayment({ status: 'scheduled', executedAt: null, scheduledAt: 1000 }),
    ]);

    const executed = paymentScheduler.runDuePayments(1000);
    assert.equal(executed.length, 1);
    assert.equal(executed[0].status, 'processed');
    assert.equal(executed[0].executedAt, 1000);
    assert.equal(paymentRepository.findById('payment-1').status, 'processed');
  }),
);

process.stdout.write(`${JSON.stringify({ results }, null, 2)}\n`);
