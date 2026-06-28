import assert from 'node:assert/strict';

process.env.DB_USERNAME ??= 'postgres';
process.env.DB_PASSWORD ??= 'changeme';
process.env.DB_NAME ??= 'exam_platform';
process.env.JWT_SECRET ??= 'local-dev-secret';
process.env.ADMIN_SETUP_KEY ??= 'local-admin-setup-key';

const { loadPracticeCatalog } = await import('../dist/practice/problem-catalog.js');
const { PracticeService } = await import('../dist/practice/practice.service.js');

const catalog = loadPracticeCatalog();
assert.ok(catalog.problems.length >= 2, 'expected at least two practice problems');
assert.ok(
  catalog.problems.some((problem) => problem.slug === 'sum-pair'),
  'sum-pair should exist in the practice catalog',
);

const hiddenProblem = {
  slug: 'sum-pair',
  supportedLanguages: ['python'],
  timeLimitMs: 2000,
  memoryLimitKb: 262144,
  visibleTests: [
    { id: '001', input: '1', expectedOutput: '1', visibility: 'visible' },
  ],
  hiddenTests: [
    { id: '002', input: '2', expectedOutput: '2', visibility: 'hidden' },
  ],
};

function makeRepo() {
  const saved = [];
  return {
    saved,
    create: (value) => value,
    save: async (value) => {
      const record = {
        id: saved.length + 1,
        createdAt: new Date('2026-06-27T00:00:00Z'),
        ...value,
      };
      saved.push(record);
      return record;
    },
    find: async () => saved,
  };
}

function buildService(problem, executeBatch, execute) {
  const repo = makeRepo();
  const service = new PracticeService(
    { get: () => problem, list: () => [] },
    { executeBatch, execute },
    repo,
    { query: async () => {} },
  );
  return { service, repo };
}

{
  const { service } = buildService(
    hiddenProblem,
    async () => [
      {
        index: 0,
        status: 'accepted',
        stdout: '0',
        stderr: null,
        compileOutput: null,
        time: 0.01,
        memory: 64,
      },
    ],
    async () => null,
  );
  const result = await service.runSample('sum-pair', 'code', 'python');
  assert.equal(result.results[0].status, 'wrong_answer');
}

{
  const { service } = buildService(
    hiddenProblem,
    async () => [],
    async () => ({
      status: 'compilation_error',
      stdout: null,
      stderr: null,
      compileOutput: 'compile failed',
      time: null,
      memory: null,
    }),
  );
  const result = await service.runCustom('sum-pair', 'code', 'python', 'stdin');
  assert.equal(result.status, 'compile_error');
}

{
  const { service, repo } = buildService(
    hiddenProblem,
    async () => [
      {
        index: 0,
        status: 'accepted',
        stdout: '1',
        stderr: null,
        compileOutput: null,
        time: 0.01,
        memory: 64,
      },
      {
        index: 1,
        status: 'accepted',
        stdout: '999',
        stderr: null,
        compileOutput: null,
        time: 0.01,
        memory: 64,
      },
    ],
    async () => null,
  );
  const result = await service.submit('sum-pair', 'code', 'python');
  assert.equal(result.verdict, 'wrong_answer');
  assert.equal(result.hiddenFailure.message, 'failed on hidden test');
  assert.equal(repo.saved[0].safeDetailsJson.kind, 'hidden_failure');
}

{
  const acceptedProblem = {
    ...hiddenProblem,
    slug: 'echo-lines',
    hiddenTests: [],
    visibleTests: [
      {
        id: '001',
        input: 'hello',
        expectedOutput: 'hello',
        visibility: 'visible',
      },
    ],
  };

  const { service } = buildService(
    acceptedProblem,
    async () => [
      {
        index: 0,
        status: 'accepted',
        stdout: 'hello',
        stderr: null,
        compileOutput: null,
        time: 0.01,
        memory: 64,
      },
    ],
    async () => null,
  );
  const result = await service.submit('echo-lines', 'code', 'python');
  assert.equal(result.verdict, 'accepted');
}

console.log('practice-smoke-ok');
