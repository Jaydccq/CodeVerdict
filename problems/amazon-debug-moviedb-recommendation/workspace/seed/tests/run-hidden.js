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

results.push(runTest('recommend sorts by rating desc then title asc', 'hidden', () => {
  const { service } = createFixture([
    { id: 'm2', title: 'Beta', rating: 5, genres: ['drama'] },
    { id: 'm1', title: 'Alpha', rating: 5, genres: ['drama'] },
  ]);
  assert.deepEqual(service.recommend({ watchedMovieIds: [], preferredGenres: ['drama'] }, 1).map((m) => m.title), ['Alpha', 'Beta']);
}));

process.stdout.write(`${JSON.stringify({ results }, null, 2)}\n`);
