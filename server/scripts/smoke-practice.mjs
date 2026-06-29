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
assert.ok(
  catalog.problems.some(
    (problem) => problem.slug === 'amazon-debug-return-system',
  ),
  'amazon-debug-return-system should exist in the practice catalog',
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

function makeDraftRepo() {
  const saved = [];
  return {
    saved,
    create: (value) => value,
    findOne: async ({ where }) =>
      saved.find((entry) => entry.problemSlug === where.problemSlug) ?? null,
    save: async (value) => {
      const existingIndex = saved.findIndex(
        (entry) => entry.problemSlug === value.problemSlug,
      );
      const record = {
        id:
          value.id ??
          (existingIndex >= 0 ? saved[existingIndex].id : saved.length + 1),
        createdAt:
          existingIndex >= 0
            ? saved[existingIndex].createdAt
            : new Date('2026-06-27T00:00:00Z'),
        updatedAt: new Date('2026-06-28T00:00:00Z'),
        ...value,
      };
      if (existingIndex >= 0) {
        saved[existingIndex] = record;
      } else {
        saved.push(record);
      }
      return record;
    },
  };
}

function buildService(problem, executeBatch, execute) {
  const repo = makeRepo();
  const draftRepo = makeDraftRepo();
  let savedEditorial = problem.editorial ?? '';
  const service = new PracticeService(
    {
      get: () => ({ ...problem, editorial: savedEditorial }),
      list: () => [],
      saveEditorial: async (_slug, editorial) => {
        savedEditorial = editorial.replace(/\r\n/g, '\n').trimEnd();
        return { ...problem, editorial: savedEditorial };
      },
    },
    { executeBatch, execute },
    repo,
    draftRepo,
    { query: async () => {} },
  );
  return { service, repo, draftRepo };
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

{
  const editableProblem = {
    ...hiddenProblem,
    source: 'amazon-oa',
    editorial: '# Original\n\nKeep me.',
  };

  const { service } = buildService(
    editableProblem,
    async () => [],
    async () => null,
  );
  const result = await service.saveEditorial(
    'sum-pair',
    '# Updated\n\nSaved editorial.',
  );
  assert.equal(result.editorial, '# Updated\n\nSaved editorial.');
  assert.equal(result.source, 'amazon-oa');
}

{
  const debugProblem = catalog.problems.find(
    (problem) => problem.slug === 'amazon-debug-return-system',
  );
  assert.ok(debugProblem, 'expected amazon-debug-return-system to load');
  assert.equal(debugProblem.questionType, 'debug-workspace');
  assert.deepEqual(
    debugProblem.debugWorkspace.files.map((file) => file.path).sort(),
    [
      'src/repositories/loanRepository.js',
      'src/services/accountService.js',
      'src/services/loanService.js',
    ],
  );
  assert.ok(
    !debugProblem.debugWorkspace.files.some(
      (file) => file.path === 'tests/run-hidden.js',
    ),
    'hidden test scripts must not be exposed in the client workspace payload',
  );

  const { service, repo, draftRepo } = buildService(
    debugProblem,
    async () => [],
    async () => null,
  );

  const visibleRun = await service.runDebugWorkspace(
    'amazon-debug-return-system',
    {},
  );
  assert.ok(
    visibleRun.results.some((result) => result.passed === false),
    'broken seed workspace should fail at least one visible test',
  );

  const workspaceFiles = new Map(
    debugProblem.debugWorkspace.files.map((file) => [file.path, file.content]),
  );
  const editedFiles = {
    'src/repositories/loanRepository.js': workspaceFiles
      .get('src/repositories/loanRepository.js')
      .replace('    return { ...loan };\n', '    this.loans.push({ ...loan });\n    return { ...loan };\n')
      .replace('    return [];\n', '    return this.loans.map((loan) => ({ ...loan }));\n'),
    'src/services/accountService.js': workspaceFiles
      .get('src/services/accountService.js')
      .replace(
        '    return this.getAccount(userId).balance > 0;\n',
        '    return this.getAccount(userId).balance >= amount;\n',
      ),
    'src/services/loanService.js': workspaceFiles.get(
      'src/services/loanService.js',
    ),
  };

  const submitResult = await service.submitDebugWorkspace(
    'amazon-debug-return-system',
    editedFiles,
  );
  assert.equal(submitResult.verdict, 'accepted');
  assert.equal(submitResult.passedCount, submitResult.totalCount);
  assert.equal(repo.saved[0].safeDetailsJson.kind, 'accepted');
  assert.deepEqual(repo.saved[0].safeDetailsJson.editedPaths, [
    'src/repositories/loanRepository.js',
    'src/services/accountService.js',
    'src/services/loanService.js',
  ]);

  const savedDraft = await service.saveDebugWorkspaceDraft(
    'amazon-debug-return-system',
    editedFiles,
  );
  assert.deepEqual(savedDraft.editedFiles, editedFiles);

  const loadedDraft = await service.getDebugWorkspaceDraft(
    'amazon-debug-return-system',
  );
  assert.deepEqual(loadedDraft.editedFiles, editedFiles);
  assert.equal(draftRepo.saved[0].problemSlug, 'amazon-debug-return-system');
}

console.log('practice-smoke-ok');
