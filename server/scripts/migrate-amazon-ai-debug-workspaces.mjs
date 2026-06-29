import fs from 'node:fs';
import path from 'node:path';

const PROBLEMS_DIR = path.resolve(process.cwd(), '../problems');

function block(value, indent = '  ') {
  return String(value)
    .replace(/\r\n/g, '\n')
    .trimEnd()
    .split('\n')
    .map((line) => `${indent}${line}`)
    .join('\n');
}

function writeFile(filePath, content) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${content.trimEnd()}\n`);
}

function removeLegacy(problemDir) {
  for (const relativePath of ['starter-code', 'tests']) {
    fs.rmSync(path.join(problemDir, relativePath), { recursive: true, force: true });
  }
}

function problemYaml(problem) {
  return `slug: ${problem.slug}
source: amazon-oa
questionType: debug-workspace
title: ${problem.title}
difficulty: ${problem.difficulty ?? 'medium'}
description: |
${block(problem.description)}
inputFormat: |
${block(`This problem does not use stdin/stdout input.
Open the seeded repository workspace, read the README, inspect the allowed source files, and run the visible test suite from the practice workspace.`)}
outputFormat: |
${block(`There is no single textual output.
Success is determined by the visible and hidden repository tests.`)}
constraints: |
${block(`- Only files declared editable by the workspace manifest may be modified.
- The runtime environment is Node.js.
- The seeded repository and tests are deterministic.`)}
samples:
  - input: |
${block(`Open README.md and the source files listed in the workspace editor.`, '      ')}
    output: |
${block(`After fixing the bugs, all visible tests should report PASS.`, '      ')}
    explanation: |
${block(`This workspace problem is graded by repository tests rather than stdin and stdout.`, '      ')}
supportedLanguages:
  - javascript
timeLimitMs: 2000
memoryLimitKb: 262144`;
}

function manifest(serviceFile, repositoryFile) {
  return JSON.stringify(
    {
      stack: 'node',
      runnerProfile: 'node-script',
      entryFiles: [
        'README.md',
        serviceFile,
        repositoryFile,
        'tests/run-visible.js',
      ],
      editablePaths: [serviceFile, repositoryFile],
      visibleTestScript: 'tests/run-visible.js',
      submitTestScript: 'tests/run-hidden.js',
    },
    null,
    2,
  );
}

function helpers(className, serviceFile, repoName, repoFile) {
  const serviceImport = serviceFile.replace(/^src\//, '../src/');
  const repoImport = repoFile.replace(/^src\//, '../src/');
  return `const { ${repoName} } = require('${repoImport.slice(0, -3)}');
const { ${className} } = require('${serviceImport.slice(0, -3)}');

function createFixture(seed = []) {
  const repository = new ${repoName}(seed);
  const service = new ${className}({ repository });
  return { repository, service };
}

function runTest(name, visibility, fn) {
  try {
    fn();
    return { name, visibility, passed: true };
  } catch (error) {
    return {
      name,
      visibility,
      passed: false,
      message: error instanceof Error ? error.message : String(error),
    };
  }
}

module.exports = { createFixture, runTest };`;
}

function repositorySource(repoName, entityName) {
  return `class ${repoName} {
  constructor(seed = []) {
    this.${entityName}s = seed.map((item) => ({ ...item }));
  }

  all() {
    return this.${entityName}s.map((item) => ({ ...item }));
  }

  findById(id) {
    return this.${entityName}s.find((item) => item.id === id);
  }

  save(item) {
    const existing = this.findById(item.id);
    if (existing) {
      return { ...existing };
    }
    this.${entityName}s.push({ ...item });
    return { ...item };
  }

  update(id, patch) {
    const item = this.findById(id);
    if (!item) {
      throw new Error('${entityName.toUpperCase()}_NOT_FOUND');
    }
    Object.assign(item, patch);
    return { ...item };
  }
}

module.exports = { ${repoName} };`;
}

function testFile(visibleTests, hiddenTests = []) {
  const lines = [
    "const assert = require('node:assert/strict');",
    "const { createFixture, runTest } = require('./helpers');",
    '',
    'const results = [];',
    '',
    ...visibleTests,
    ...hiddenTests,
    "process.stdout.write(`${JSON.stringify({ results }, null, 2)}\\n`);",
  ];
  return lines.join('\n\n');
}

const problems = [
  {
    slug: 'amazon-debug-banking-rbac',
    title: 'Banking RBAC Repository Debug',
    className: 'AccessService',
    repoName: 'PolicyRepository',
    entityName: 'policy',
    serviceFile: 'src/services/accessService.js',
    repoFile: 'src/repositories/policyRepository.js',
    description: `You are given a small banking access-control repository with multiple failing tests.
The README defines how role-based permissions should be evaluated.

Known issues reported by the test suite:

- administrator wildcard permissions are not honored
- missing roles are allowed by default
- permission checks use substring matching instead of exact permission names

Fix the repository so access decisions match the README and all predefined tests pass.`,
    readme: `# Banking RBAC

## Contract

- A role has an explicit list of permissions.
- A permission must match exactly.
- The special permission "*" allows every action for that role.
- Unknown roles are denied.
- Access checks return true for allow and false for deny.`,
    service: `class AccessService {
  constructor({ repository }) {
    this.repository = repository;
  }

  canAccess(role, permission) {
    const policy = this.repository.findById(role);
    if (!policy) return true;
    return policy.permissions.some((item) => permission.includes(item));
  }
}

module.exports = { AccessService };`,
    visibleTests: [
      `results.push(runTest('admin wildcard allows any permission', 'visible', () => {
  const { service } = createFixture([{ id: 'admin', permissions: ['*'] }]);
  assert.equal(service.canAccess('admin', 'wire:approve'), true);
}));`,
      `results.push(runTest('unknown role is denied', 'visible', () => {
  const { service } = createFixture([{ id: 'viewer', permissions: ['read'] }]);
  assert.equal(service.canAccess('missing', 'read'), false);
}));`,
    ],
    hiddenTests: [
      `results.push(runTest('permission names must match exactly', 'hidden', () => {
  const { service } = createFixture([{ id: 'teller', permissions: ['read'] }]);
  assert.equal(service.canAccess('teller', 'spreadsheet:read'), false);
}));`,
    ],
    editorial: `Check the role first. If it is missing, deny. Then allow only when the role has "*" or the exact requested permission.`,
  },
  {
    slug: 'amazon-debug-django-api-tests',
    title: 'Backend API Test Suite Repository Debug',
    className: 'TicketApi',
    repoName: 'TicketRepository',
    entityName: 'ticket',
    serviceFile: 'src/api/ticketApi.js',
    repoFile: 'src/repositories/ticketRepository.js',
    description: `You are given a small API-handler repository modeled after a backend API test suite.
Several route-level tests fail because the handlers do not follow the README contract.

Known issues reported by the test suite:

- create accepts blank titles
- missing records return the wrong status code
- status updates do not persist

Fix the repository behavior so the API-style tests pass.`,
    readme: `# Ticket API

## Contract

- createTicket(payload) returns { status: 201, body } for a valid title.
- Blank titles return status 400.
- getTicket(id) returns 404 when the record is missing.
- updateStatus(id, status) persists the new status and returns 200.`,
    service: `class TicketApi {
  constructor({ repository }) {
    this.repository = repository;
  }

  createTicket(payload) {
    if (payload.title === '') {
      return { status: 201, body: this.repository.save({ id: payload.id, title: payload.title, status: 'open' }) };
    }
    return { status: 201, body: this.repository.save({ id: payload.id, title: payload.title, status: 'open' }) };
  }

  getTicket(id) {
    const ticket = this.repository.findById(id);
    return { status: 200, body: ticket ?? null };
  }

  updateStatus(id, status) {
    const ticket = this.repository.findById(id);
    if (!ticket) return { status: 404, body: null };
    ticket.status === status;
    return { status: 200, body: this.repository.update(id, ticket) };
  }
}

module.exports = { TicketApi };`,
    visibleTests: [
      `results.push(runTest('createTicket rejects blank titles', 'visible', () => {
  const { service } = createFixture();
  assert.equal(service.createTicket({ id: 't1', title: '' }).status, 400);
}));`,
      `results.push(runTest('getTicket returns 404 for missing tickets', 'visible', () => {
  const { service } = createFixture();
  assert.equal(service.getTicket('missing').status, 404);
}));`,
    ],
    hiddenTests: [
      `results.push(runTest('updateStatus persists the new status', 'hidden', () => {
  const { repository, service } = createFixture([{ id: 't1', title: 'Bug', status: 'open' }]);
  const response = service.updateStatus('t1', 'closed');
  assert.equal(response.status, 200);
  assert.equal(repository.findById('t1').status, 'closed');
}));`,
    ],
    editorial: `Validate request payloads before saving, return 404 for missing records, and assign the updated status before persisting it.`,
  },
  {
    slug: 'amazon-debug-issue-activity-logs',
    title: 'Issue Activity Log Repository Debug',
    className: 'ActivityLogService',
    repoName: 'ActivityRepository',
    entityName: 'activity',
    serviceFile: 'src/services/activityLogService.js',
    repoFile: 'src/repositories/activityRepository.js',
    description: `You are given an issue activity log repository with failing tests around activity counting and deduplication.

Known issues reported by the test suite:

- COMMENT events are ignored
- duplicate event IDs are inserted twice
- summary output is not sorted deterministically

Fix the repository and service behavior so activity summaries follow the README.`,
    readme: `# Issue Activity Logs

## Contract

- Supported actions are CREATE, UPDATE, COMMENT, and CLOSE.
- Event IDs are unique; duplicates must be ignored.
- summarizeByIssue() returns issue counts sorted by issue ID.`,
    service: `class ActivityLogService {
  constructor({ repository }) {
    this.repository = repository;
  }

  record(event) {
    if (!['CREATE', 'UPDATE', 'CLOSE'].includes(event.action)) {
      return null;
    }
    return this.repository.save(event);
  }

  summarizeByIssue() {
    const counts = new Map();
    for (const event of this.repository.all()) {
      counts.set(event.issueId, (counts.get(event.issueId) ?? 0) + 1);
    }
    return Array.from(counts.entries()).map(([issueId, count]) => ({ issueId, count }));
  }
}

module.exports = { ActivityLogService };`,
    visibleTests: [
      `results.push(runTest('record accepts COMMENT events', 'visible', () => {
  const { repository, service } = createFixture();
  service.record({ id: 'e1', issueId: 'ISSUE-1', action: 'COMMENT' });
  assert.equal(repository.all().length, 1);
}));`,
      `results.push(runTest('duplicate event IDs are ignored', 'visible', () => {
  const { repository, service } = createFixture();
  service.record({ id: 'e1', issueId: 'ISSUE-1', action: 'CREATE' });
  service.record({ id: 'e1', issueId: 'ISSUE-1', action: 'UPDATE' });
  assert.equal(repository.all().length, 1);
}));`,
    ],
    hiddenTests: [
      `results.push(runTest('summary is sorted by issue ID', 'hidden', () => {
  const { service } = createFixture();
  service.record({ id: 'e2', issueId: 'ISSUE-2', action: 'CREATE' });
  service.record({ id: 'e1', issueId: 'ISSUE-1', action: 'COMMENT' });
  assert.deepEqual(service.summarizeByIssue().map((row) => row.issueId), ['ISSUE-1', 'ISSUE-2']);
}));`,
    ],
    editorial: `Include COMMENT in the supported action set, reject duplicate IDs in the repository, and sort summaries before returning them.`,
  },
  {
    slug: 'amazon-debug-issue-comments',
    title: 'Issue Comment Platform Repository Debug',
    className: 'CommentService',
    repoName: 'CommentRepository',
    entityName: 'comment',
    serviceFile: 'src/services/commentService.js',
    repoFile: 'src/repositories/commentRepository.js',
    description: `You are given a small issue-comment repository with failing tests around comment creation and deletion.

Known issues reported by the test suite:

- blank comment bodies are accepted
- deleting a comment does not persist deleted state
- active comment counts include deleted comments

Fix the repository so the comment platform follows the README contract.`,
    readme: `# Issue Comments

## Contract

- createComment requires a non-empty body.
- deleteComment marks the comment as deleted.
- countActiveComments(issueId) counts only comments for that issue where deleted is false.`,
    service: `class CommentService {
  constructor({ repository }) {
    this.repository = repository;
  }

  createComment(comment) {
    if (comment.body === null) {
      throw new Error('COMMENT_BODY_REQUIRED');
    }
    return this.repository.save({ ...comment, deleted: false });
  }

  deleteComment(id) {
    const comment = this.repository.findById(id);
    if (!comment) throw new Error('COMMENT_NOT_FOUND');
    comment.deleted === true;
    return this.repository.update(id, comment);
  }

  countActiveComments(issueId) {
    return this.repository.all().filter((comment) => comment.issueId === issueId).length;
  }
}

module.exports = { CommentService };`,
    visibleTests: [
      `results.push(runTest('createComment rejects blank bodies', 'visible', () => {
  const { service } = createFixture();
  assert.throws(() => service.createComment({ id: 'c1', issueId: 'I1', body: '' }), /COMMENT_BODY_REQUIRED/);
}));`,
      `results.push(runTest('deleteComment marks the comment as deleted', 'visible', () => {
  const { repository, service } = createFixture([{ id: 'c1', issueId: 'I1', body: 'x', deleted: false }]);
  service.deleteComment('c1');
  assert.equal(repository.findById('c1').deleted, true);
}));`,
    ],
    hiddenTests: [
      `results.push(runTest('countActiveComments excludes deleted comments', 'hidden', () => {
  const { service } = createFixture([
    { id: 'c1', issueId: 'I1', body: 'x', deleted: false },
    { id: 'c2', issueId: 'I1', body: 'y', deleted: true },
  ]);
  assert.equal(service.countActiveComments('I1'), 1);
}));`,
    ],
    editorial: `Reject empty or whitespace-only bodies, assign deleted state during deletion, and filter deleted comments out of active counts.`,
  },
  {
    slug: 'amazon-debug-movie-review-moderation',
    title: 'Movie Review Moderation Repository Debug',
    className: 'ReviewModerationService',
    repoName: 'ReviewRepository',
    entityName: 'review',
    serviceFile: 'src/services/reviewModerationService.js',
    repoFile: 'src/repositories/reviewRepository.js',
    description: `You are given a movie-review moderation repository with failing tests around banned words and per-user rate limits.

Known issues reported by the test suite:

- banned words are checked case-sensitively
- the rate-limit boundary is off by one
- rejected reviews are still persisted

Fix the moderation behavior so it matches the README.`,
    readme: `# Review Moderation

## Contract

- Reviews containing banned words are rejected case-insensitively.
- A user may create at most maxReviews accepted reviews.
- Rejected reviews are not persisted.
- Accepted reviews are stored with status "accepted".`,
    service: `class ReviewModerationService {
  constructor({ repository }) {
    this.repository = repository;
    this.bannedWords = ['spam', 'scam', 'abuse'];
  }

  submitReview(review, maxReviews) {
    if (this.bannedWords.some((word) => review.body.includes(word))) {
      this.repository.save({ ...review, status: 'rejected' });
      return { accepted: false };
    }
    const acceptedForUser = this.repository.all().filter((item) => item.userId === review.userId).length;
    if (acceptedForUser > maxReviews) {
      this.repository.save({ ...review, status: 'rejected' });
      return { accepted: false };
    }
    this.repository.save({ ...review, status: 'accepted' });
    return { accepted: true };
  }
}

module.exports = { ReviewModerationService };`,
    visibleTests: [
      `results.push(runTest('banned words are case-insensitive', 'visible', () => {
  const { repository, service } = createFixture();
  const result = service.submitReview({ id: 'r1', userId: 'u1', body: 'This is SPAM' }, 2);
  assert.equal(result.accepted, false);
  assert.equal(repository.all().length, 0);
}));`,
      `results.push(runTest('maxReviews is an inclusive accepted-review limit', 'visible', () => {
  const { service } = createFixture([{ id: 'old', userId: 'u1', body: 'ok', status: 'accepted' }]);
  assert.equal(service.submitReview({ id: 'r2', userId: 'u1', body: 'fine' }, 1).accepted, false);
}));`,
    ],
    hiddenTests: [
      `results.push(runTest('accepted reviews are persisted with accepted status', 'hidden', () => {
  const { repository, service } = createFixture();
  assert.equal(service.submitReview({ id: 'r1', userId: 'u1', body: 'great' }, 2).accepted, true);
  assert.equal(repository.findById('r1').status, 'accepted');
}));`,
    ],
    editorial: `Normalize review text before banned-word checks, reject once accepted reviews are already at the limit, and persist only accepted reviews.`,
  },
  {
    slug: 'amazon-debug-moviedb-recommendation',
    title: 'MovieDB Recommendation Repository Debug',
    className: 'RecommendationService',
    repoName: 'MovieRepository',
    entityName: 'movie',
    serviceFile: 'src/services/recommendationService.js',
    repoFile: 'src/repositories/movieRepository.js',
    description: `You are given a MovieDB recommendation repository with failing recommendation tests.

Known issues reported by the test suite:

- movies already watched by the user are recommended again
- minimum rating uses the wrong boundary
- results are sorted in the wrong order

Fix the recommendation logic so it follows the README.`,
    readme: `# MovieDB Recommendations

## Contract

- Do not recommend movies whose IDs are in user.watchedMovieIds.
- A movie is eligible when rating >= minRating.
- A movie must share at least one preferred genre.
- Results are sorted by rating descending, then title ascending.`,
    service: `class RecommendationService {
  constructor({ repository }) {
    this.repository = repository;
  }

  recommend(user, minRating) {
    return this.repository
      .all()
      .filter((movie) => movie.rating > minRating)
      .filter((movie) => movie.genres.every((genre) => user.preferredGenres.includes(genre)))
      .sort((left, right) => left.rating - right.rating);
  }
}

module.exports = { RecommendationService };`,
    visibleTests: [
      `results.push(runTest('recommend excludes watched movies', 'visible', () => {
  const { service } = createFixture([
    { id: 'm1', title: 'A', rating: 5, genres: ['drama'] },
  ]);
  assert.deepEqual(service.recommend({ watchedMovieIds: ['m1'], preferredGenres: ['drama'] }, 4), []);
}));`,
      `results.push(runTest('recommend includes rating equal to minRating', 'visible', () => {
  const { service } = createFixture([{ id: 'm1', title: 'A', rating: 4, genres: ['drama'] }]);
  assert.equal(service.recommend({ watchedMovieIds: [], preferredGenres: ['drama'] }, 4).length, 1);
}));`,
    ],
    hiddenTests: [
      `results.push(runTest('recommend sorts by rating desc then title asc', 'hidden', () => {
  const { service } = createFixture([
    { id: 'm2', title: 'Beta', rating: 5, genres: ['drama'] },
    { id: 'm1', title: 'Alpha', rating: 5, genres: ['drama'] },
  ]);
  assert.deepEqual(service.recommend({ watchedMovieIds: [], preferredGenres: ['drama'] }, 1).map((m) => m.title), ['Alpha', 'Beta']);
}));`,
    ],
    editorial: `Filter out watched movies, use >= for the rating threshold, require any genre overlap, and sort by rating descending with title as tie-breaker.`,
  },
  {
    slug: 'amazon-debug-user-reset-password',
    title: 'Password Reset Token Repository Debug',
    className: 'ResetPasswordService',
    repoName: 'TokenRepository',
    entityName: 'token',
    serviceFile: 'src/services/resetPasswordService.js',
    repoFile: 'src/repositories/tokenRepository.js',
    description: `You are given a password-reset repository with failing token validation tests.

Known issues reported by the test suite:

- tokens expiring exactly now are rejected
- revoked tokens can still be used
- consuming a token does not persist used state

Fix the repository so token validation matches the README.`,
    readme: `# Password Reset Tokens

## Contract

- A token is valid when it exists, is not used, is not revoked, and now <= expiresAt.
- consumeToken(id, now) marks a valid token as used.
- Invalid or missing tokens throw INVALID_TOKEN.`,
    service: `class ResetPasswordService {
  constructor({ repository }) {
    this.repository = repository;
  }

  validateToken(id, now) {
    const token = this.repository.findById(id);
    return Boolean(token && !token.used && now < token.expiresAt);
  }

  consumeToken(id, now) {
    const token = this.repository.findById(id);
    if (!this.validateToken(id, now)) {
      throw new Error('INVALID_TOKEN');
    }
    token.used === true;
    return this.repository.update(id, token);
  }
}

module.exports = { ResetPasswordService };`,
    visibleTests: [
      `results.push(runTest('validateToken accepts expiry equal to now', 'visible', () => {
  const { service } = createFixture([{ id: 't1', expiresAt: 1000, used: false, revoked: false }]);
  assert.equal(service.validateToken('t1', 1000), true);
}));`,
      `results.push(runTest('validateToken rejects revoked tokens', 'visible', () => {
  const { service } = createFixture([{ id: 't1', expiresAt: 2000, used: false, revoked: true }]);
  assert.equal(service.validateToken('t1', 1000), false);
}));`,
    ],
    hiddenTests: [
      `results.push(runTest('consumeToken persists used state', 'hidden', () => {
  const { repository, service } = createFixture([{ id: 't1', expiresAt: 2000, used: false, revoked: false }]);
  service.consumeToken('t1', 1000);
  assert.equal(repository.findById('t1').used, true);
}));`,
    ],
    editorial: `Check revoked state, use now <= expiresAt, and assign used = true before persisting token consumption.`,
  },
  {
    slug: 'amazon-debug-wallet-recurring-payments',
    title: 'Wallet Recurring Payments Repository Debug',
    className: 'RecurringPaymentService',
    repoName: 'RecurringPaymentRepository',
    entityName: 'payment',
    serviceFile: 'src/services/recurringPaymentService.js',
    repoFile: 'src/repositories/recurringPaymentRepository.js',
    description: `You are given a wallet recurring-payment repository with failing tests around balance and schedule boundaries.

Known issues reported by the test suite:

- payments equal to the available balance are rejected
- payments due exactly now are skipped
- successful execution does not persist the next run timestamp

Fix the recurring payment behavior so it matches the README.`,
    readme: `# Wallet Recurring Payments

## Contract

- executeDue(now, balance) executes active payments whose nextRunAt <= now.
- A payment may execute when amount <= balance.
- Executed payments update nextRunAt by intervalDays.
- Insufficient balance leaves the payment unchanged.`,
    service: `class RecurringPaymentService {
  constructor({ repository }) {
    this.repository = repository;
  }

  executeDue(now, balance) {
    const executed = [];
    let remaining = balance;
    for (const payment of this.repository.all()) {
      if (!payment.active || payment.nextRunAt < now) continue;
      if (payment.amount >= remaining) continue;
      payment.nextRunAt === payment.nextRunAt + payment.intervalDays;
      remaining -= payment.amount;
      executed.push(this.repository.update(payment.id, payment));
    }
    return { executed, remaining };
  }
}

module.exports = { RecurringPaymentService };`,
    visibleTests: [
      `results.push(runTest('executeDue allows amount equal to balance', 'visible', () => {
  const { service } = createFixture([{ id: 'p1', amount: 50, active: true, nextRunAt: 10, intervalDays: 30 }]);
  assert.equal(service.executeDue(10, 50).executed.length, 1);
}));`,
      `results.push(runTest('executeDue runs payments due exactly now', 'visible', () => {
  const { service } = createFixture([{ id: 'p1', amount: 10, active: true, nextRunAt: 10, intervalDays: 30 }]);
  assert.equal(service.executeDue(10, 100).executed.length, 1);
}));`,
    ],
    hiddenTests: [
      `results.push(runTest('executeDue persists nextRunAt after success', 'hidden', () => {
  const { repository, service } = createFixture([{ id: 'p1', amount: 10, active: true, nextRunAt: 10, intervalDays: 30 }]);
  service.executeDue(10, 100);
  assert.equal(repository.findById('p1').nextRunAt, 40);
}));`,
    ],
    editorial: `Select active records with nextRunAt <= now, allow amount <= remaining balance, and assign the updated nextRunAt before saving.`,
  },
  {
    slug: 'amazon-debug-workflow-subissues',
    title: 'Workflow Sub-Issue Repository Debug',
    className: 'WorkflowService',
    repoName: 'IssueRepository',
    entityName: 'issue',
    serviceFile: 'src/services/workflowService.js',
    repoFile: 'src/repositories/issueRepository.js',
    description: `You are given a workflow repository with failing tests around issue and sub-issue creation.

Known issues reported by the test suite:

- sub-issues can be created for missing parents
- duplicate sub-issue IDs are allowed
- parent child counts are not persisted

Fix the workflow behavior so it follows the README.`,
    readme: `# Workflow Sub-Issues

## Contract

- createIssue(id) creates a root issue.
- createSubIssue(parentId, childId) requires an existing parent.
- child IDs must be unique.
- creating a sub-issue increments the parent's childCount.`,
    service: `class WorkflowService {
  constructor({ repository }) {
    this.repository = repository;
  }

  createIssue(id) {
    return this.repository.save({ id, parentId: null, childCount: 0 });
  }

  createSubIssue(parentId, childId) {
    const parent = this.repository.findById(parentId);
    if (parentId === childId) {
      throw new Error('INVALID_PARENT');
    }
    const child = this.repository.save({ id: childId, parentId, childCount: 0 });
    if (parent) {
      parent.childCount === parent.childCount + 1;
      this.repository.update(parent.id, parent);
    }
    return child;
  }
}

module.exports = { WorkflowService };`,
    visibleTests: [
      `results.push(runTest('createSubIssue requires an existing parent', 'visible', () => {
  const { service } = createFixture();
  assert.throws(() => service.createSubIssue('missing', 'child-1'), /PARENT_NOT_FOUND/);
}));`,
      `results.push(runTest('createSubIssue rejects duplicate child IDs', 'visible', () => {
  const { service } = createFixture([{ id: 'parent', parentId: null, childCount: 0 }, { id: 'child', parentId: 'parent', childCount: 0 }]);
  assert.throws(() => service.createSubIssue('parent', 'child'), /DUPLICATE_ISSUE/);
}));`,
    ],
    hiddenTests: [
      `results.push(runTest('createSubIssue increments parent childCount', 'hidden', () => {
  const { repository, service } = createFixture([{ id: 'parent', parentId: null, childCount: 0 }]);
  service.createSubIssue('parent', 'child');
  assert.equal(repository.findById('parent').childCount, 1);
}));`,
    ],
    editorial: `Validate the parent exists, reject duplicate child IDs, and assign then persist the parent's incremented childCount.`,
  },
];

function writeProblem(problem) {
  const problemDir = path.join(PROBLEMS_DIR, problem.slug);
  const workspaceDir = path.join(problemDir, 'workspace');

  removeLegacy(problemDir);
  writeFile(path.join(problemDir, 'problem.yaml'), problemYaml(problem));
  writeFile(
    path.join(problemDir, 'editorial.md'),
    `# ${problem.title}

${problem.editorial}

The repository tests are deterministic practice tests. Fix the implementation instead of changing test files.`,
  );
  writeFile(path.join(workspaceDir, 'manifest.json'), manifest(problem.serviceFile, problem.repoFile));
  writeFile(path.join(workspaceDir, 'seed/README.md'), problem.readme);
  writeFile(path.join(workspaceDir, 'seed', problem.repoFile), repositorySource(problem.repoName, problem.entityName));
  writeFile(path.join(workspaceDir, 'seed', problem.serviceFile), problem.service);
  writeFile(path.join(workspaceDir, 'seed/tests/helpers.js'), helpers(problem.className, problem.serviceFile, problem.repoName, problem.repoFile));
  writeFile(path.join(workspaceDir, 'seed/tests/run-visible.js'), testFile(problem.visibleTests));
  writeFile(path.join(workspaceDir, 'seed/tests/run-hidden.js'), testFile(problem.visibleTests, problem.hiddenTests));
}

for (const problem of problems) {
  writeProblem(problem);
}

console.log(`Migrated ${problems.length} Amazon AI/debug problem(s) to debug-workspace.`);
