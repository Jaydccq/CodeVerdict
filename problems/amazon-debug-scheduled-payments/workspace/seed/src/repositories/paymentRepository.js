class PaymentRepository {
  constructor(initialPayments = []) {
    this.payments = initialPayments.map((payment) => ({ ...payment }));
  }

  all() {
    return this.payments.map((payment) => ({ ...payment }));
  }

  findById(id) {
    return this.payments.find((payment) => payment.id === id);
  }

  save(payment) {
    const existing = this.findById(payment.id);
    if (existing) {
      return { ...existing };
    }

    this.payments.push({ ...payment });
    return { ...payment };
  }

  update(id, patch) {
    const payment = this.findById(id);
    if (!payment) {
      throw new Error('PAYMENT_NOT_FOUND');
    }

    Object.assign(payment, patch);
    return { ...payment };
  }
}

module.exports = { PaymentRepository };
