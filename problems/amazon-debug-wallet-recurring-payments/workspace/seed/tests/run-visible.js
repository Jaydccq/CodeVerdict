const assert = require('node:assert/strict');

const { createFixture, runTest } = require('./helpers');



const results = [];



results.push(runTest('executeDue allows amount equal to balance', 'visible', () => {
  const { service } = createFixture([{ id: 'p1', amount: 50, active: true, nextRunAt: 10, intervalDays: 30 }]);
  assert.equal(service.executeDue(10, 50).executed.length, 1);
}));

results.push(runTest('executeDue runs payments due exactly now', 'visible', () => {
  const { service } = createFixture([{ id: 'p1', amount: 10, active: true, nextRunAt: 10, intervalDays: 30 }]);
  assert.equal(service.executeDue(10, 100).executed.length, 1);
}));

process.stdout.write(`${JSON.stringify({ results }, null, 2)}\n`);
