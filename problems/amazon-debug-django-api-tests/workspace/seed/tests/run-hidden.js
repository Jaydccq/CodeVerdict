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

results.push(runTest('updateStatus persists the new status', 'hidden', () => {
  const { repository, service } = createFixture([{ id: 't1', title: 'Bug', status: 'open' }]);
  const response = service.updateStatus('t1', 'closed');
  assert.equal(response.status, 200);
  assert.equal(repository.findById('t1').status, 'closed');
}));

process.stdout.write(`${JSON.stringify({ results }, null, 2)}\n`);
