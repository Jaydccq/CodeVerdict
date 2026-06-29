const assert = require('node:assert/strict');

const { createFixture, runTest } = require('./helpers');



const results = [];



results.push(runTest('createComment rejects blank bodies', 'visible', () => {
  const { service } = createFixture();
  assert.throws(() => service.createComment({ id: 'c1', issueId: 'I1', body: '' }), /COMMENT_BODY_REQUIRED/);
}));

results.push(runTest('deleteComment marks the comment as deleted', 'visible', () => {
  const { repository, service } = createFixture([{ id: 'c1', issueId: 'I1', body: 'x', deleted: false }]);
  service.deleteComment('c1');
  assert.equal(repository.findById('c1').deleted, true);
}));

process.stdout.write(`${JSON.stringify({ results }, null, 2)}\n`);
