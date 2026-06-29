const assert = require('node:assert/strict');

const { createFixture, runTest } = require('./helpers');



const results = [];



results.push(runTest('banned words are case-insensitive', 'visible', () => {
  const { repository, service } = createFixture();
  const result = service.submitReview({ id: 'r1', userId: 'u1', body: 'This is SPAM' }, 2);
  assert.equal(result.accepted, false);
  assert.equal(repository.all().length, 0);
}));

results.push(runTest('maxReviews is an inclusive accepted-review limit', 'visible', () => {
  const { service } = createFixture([{ id: 'old', userId: 'u1', body: 'ok', status: 'accepted' }]);
  assert.equal(service.submitReview({ id: 'r2', userId: 'u1', body: 'fine' }, 1).accepted, false);
}));

process.stdout.write(`${JSON.stringify({ results }, null, 2)}\n`);
