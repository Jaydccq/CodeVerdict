const assert = require('node:assert/strict');

const { createFixture, runTest } = require('./helpers');



const results = [];



results.push(runTest('validateToken accepts expiry equal to now', 'visible', () => {
  const { service } = createFixture([{ id: 't1', expiresAt: 1000, used: false, revoked: false }]);
  assert.equal(service.validateToken('t1', 1000), true);
}));

results.push(runTest('validateToken rejects revoked tokens', 'visible', () => {
  const { service } = createFixture([{ id: 't1', expiresAt: 2000, used: false, revoked: true }]);
  assert.equal(service.validateToken('t1', 1000), false);
}));

results.push(runTest('consumeToken persists used state', 'hidden', () => {
  const { repository, service } = createFixture([{ id: 't1', expiresAt: 2000, used: false, revoked: false }]);
  service.consumeToken('t1', 1000);
  assert.equal(repository.findById('t1').used, true);
}));

process.stdout.write(`${JSON.stringify({ results }, null, 2)}\n`);
