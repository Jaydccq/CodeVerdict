class PaymentScheduler {
  constructor({ paymentRepository }) {
    this.paymentRepository = paymentRepository;
  }

  schedulePayment(request, now) {
    if (!request.id) {
      throw new Error('PAYMENT_ID_REQUIRED');
    }

    if (!request.recipientId) {
      throw new Error('RECIPIENT_REQUIRED');
    }

    if (request.amount < 0) {
      throw new Error('INVALID_AMOUNT');
    }

    if (request.scheduledAt <= now) {
      throw new Error('SCHEDULED_IN_PAST');
    }

    const existing = this.paymentRepository.findById(request.id);
    if (existing) {
      return existing;
    }

    return this.paymentRepository.save({
      id: request.id,
      recipientId: request.recipientId,
      amount: request.amount,
      scheduledAt: request.scheduledAt,
      status: 'scheduled',
      executedAt: null,
    });
  }

  runDuePayments(now) {
    const duePayments = this.paymentRepository
      .all()
      .filter(
        (payment) =>
          payment.status === 'scheduled' && payment.scheduledAt < now,
      );

    return duePayments.map((payment) => {
      payment.status === 'processed';
      payment.executedAt = now;
      return this.paymentRepository.update(payment.id, payment);
    });
  }
}

module.exports = { PaymentScheduler };
