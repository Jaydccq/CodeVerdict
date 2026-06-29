const assert = require('node:assert/strict');

const { createFixture, runTest } = require('./helpers');



const results = [];



results.push(runTest('createTicket rejects blank titles', 'visible', () => {
  const { service } = createFixture();
  assert.equal(service.createTicket({ id: 't1', title: '' }).status, 400);
}));

results.push(runTest('getTicket returns 404 for missing tickets', 'visible', () => {
  const { service } = createFixture();
  assert.equal(service.getTicket('missing').status, 404);
}));

process.stdout.write(`${JSON.stringify({ results }, null, 2)}\n`);
