class RecurringPaymentRepository {
  constructor(seed = []) {
    this.payments = seed.map((item) => ({ ...item }));
  }

  all() {
    return this.payments.map((item) => ({ ...item }));
  }

  findById(id) {
    return this.payments.find((item) => item.id === id);
  }

  save(item) {
    const existing = this.findById(item.id);
    if (existing) {
      return { ...existing };
    }
    this.payments.push({ ...item });
    return { ...item };
  }

  update(id, patch) {
    const item = this.findById(id);
    if (!item) {
      throw new Error('PAYMENT_NOT_FOUND');
    }
    Object.assign(item, patch);
    return { ...item };
  }
}

module.exports = { RecurringPaymentRepository };
