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

results.push(
  runTest('schedulePayment rejects duplicate ids', 'hidden', () => {
    const { paymentScheduler } = createFixture();
    paymentScheduler.schedulePayment(validPayment({ scheduledAt: 1100 }), 1000);
    assert.throws(
      () =>
        paymentScheduler.schedulePayment(
          validPayment({ amount: 250, scheduledAt: 1200 }),
          1000,
        ),
      /DUPLICATE_PAYMENT/,
    );
  }),
);

results.push(
  runTest('schedulePayment rejects past timestamps', 'hidden', () => {
    const { paymentScheduler } = createFixture();
    assert.throws(
      () =>
        paymentScheduler.schedulePayment(
          validPayment({ scheduledAt: 999 }),
          1000,
        ),
      /SCHEDULED_IN_PAST/,
    );
  }),
);

results.push(
  runTest('runDuePayments does not reprocess completed payments', 'hidden', () => {
    const { paymentScheduler } = createFixture([
      validPayment({
        status: 'processed',
        executedAt: 900,
        scheduledAt: 800,
      }),
    ]);

    const executed = paymentScheduler.runDuePayments(1000);
    assert.equal(executed.length, 0);
  }),
);

process.stdout.write(`${JSON.stringify({ results }, null, 2)}\n`);
