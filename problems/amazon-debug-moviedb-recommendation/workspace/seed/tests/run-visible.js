const assert = require('node:assert/strict');

const { createFixture, runTest } = require('./helpers');



const results = [];



results.push(runTest('recommend excludes watched movies', 'visible', () => {
  const { service } = createFixture([
    { id: 'm1', title: 'A', rating: 5, genres: ['drama'] },
  ]);
  assert.deepEqual(service.recommend({ watchedMovieIds: ['m1'], preferredGenres: ['drama'] }, 4), []);
}));

results.push(runTest('recommend includes rating equal to minRating', 'visible', () => {
  const { service } = createFixture([{ id: 'm1', title: 'A', rating: 4, genres: ['drama'] }]);
  assert.equal(service.recommend({ watchedMovieIds: [], preferredGenres: ['drama'] }, 4).length, 1);
}));

process.stdout.write(`${JSON.stringify({ results }, null, 2)}\n`);
