class TicketRepository {
  constructor(seed = []) {
    this.tickets = seed.map((item) => ({ ...item }));
  }

  all() {
    return this.tickets.map((item) => ({ ...item }));
  }

  findById(id) {
    return this.tickets.find((item) => item.id === id);
  }

  save(item) {
    const existing = this.findById(item.id);
    if (existing) {
      return { ...existing };
    }
    this.tickets.push({ ...item });
    return { ...item };
  }

  update(id, patch) {
    const item = this.findById(id);
    if (!item) {
      throw new Error('TICKET_NOT_FOUND');
    }
    Object.assign(item, patch);
    return { ...item };
  }
}

module.exports = { TicketRepository };
