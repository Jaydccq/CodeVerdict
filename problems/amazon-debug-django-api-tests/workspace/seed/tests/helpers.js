const { TicketRepository } = require('../src/repositories/ticketRepository');
const { TicketApi } = require('../src/api/ticketApi');

function createFixture(seed = []) {
  const repository = new TicketRepository(seed);
  const service = new TicketApi({ repository });
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
