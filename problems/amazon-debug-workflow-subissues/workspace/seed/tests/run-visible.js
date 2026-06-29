const assert = require('node:assert/strict');

const { createFixture, runTest } = require('./helpers');



const results = [];



results.push(runTest('createSubIssue requires an existing parent', 'visible', () => {
  const { service } = createFixture();
  assert.throws(() => service.createSubIssue('missing', 'child-1'), /PARENT_NOT_FOUND/);
}));

results.push(runTest('createSubIssue rejects duplicate child IDs', 'visible', () => {
  const { service } = createFixture([{ id: 'parent', parentId: null, childCount: 0 }, { id: 'child', parentId: 'parent', childCount: 0 }]);
  assert.throws(() => service.createSubIssue('parent', 'child'), /DUPLICATE_ISSUE/);
}));

process.stdout.write(`${JSON.stringify({ results }, null, 2)}\n`);
