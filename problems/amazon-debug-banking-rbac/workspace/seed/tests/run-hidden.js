const assert = require('node:assert/strict');

const { createFixture, runTest } = require('./helpers');



const results = [];



results.push(runTest('admin wildcard allows any permission', 'visible', () => {
  const { service } = createFixture([{ id: 'admin', permissions: ['*'] }]);
  assert.equal(service.canAccess('admin', 'wire:approve'), true);
}));

results.push(runTest('unknown role is denied', 'visible', () => {
  const { service } = createFixture([{ id: 'viewer', permissions: ['read'] }]);
  assert.equal(service.canAccess('missing', 'read'), false);
}));

results.push(runTest('permission names must match exactly', 'hidden', () => {
  const { service } = createFixture([{ id: 'teller', permissions: ['read'] }]);
  assert.equal(service.canAccess('teller', 'spreadsheet:read'), false);
}));

process.stdout.write(`${JSON.stringify({ results }, null, 2)}\n`);
