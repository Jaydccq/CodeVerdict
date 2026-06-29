const assert = require('node:assert/strict');

const { createFixture, runTest } = require('./helpers');



const results = [];



results.push(runTest('record accepts COMMENT events', 'visible', () => {
  const { repository, service } = createFixture();
  service.record({ id: 'e1', issueId: 'ISSUE-1', action: 'COMMENT' });
  assert.equal(repository.all().length, 1);
}));

results.push(runTest('duplicate event IDs are ignored', 'visible', () => {
  const { repository, service } = createFixture();
  service.record({ id: 'e1', issueId: 'ISSUE-1', action: 'CREATE' });
  service.record({ id: 'e1', issueId: 'ISSUE-1', action: 'UPDATE' });
  assert.equal(repository.all().length, 1);
}));

process.stdout.write(`${JSON.stringify({ results }, null, 2)}\n`);
