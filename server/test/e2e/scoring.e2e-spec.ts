import request from 'supertest';
import { createTestApp, TestApp } from '../setup/test-app';
import { cleanDatabase } from '../helpers/db.helper';
import { registerUser, authHeader } from '../helpers/auth.helper';
import { createExamWithProblems } from '../helpers/exam.helper';
import type { ExamWithProblems } from '../helpers/exam.helper';
import { Score } from '../../src/entities/score.entity';

describe('ICPC Scoring (E2E)', () => {
  let testApp: TestApp;
  let token: string;
  let userId: number;
  let seed: ExamWithProblems;

  beforeAll(async () => {
    testApp = await createTestApp();
  });

  afterAll(async () => {
    await testApp.app.close();
  });

  beforeEach(async () => {
    await cleanDatabase(testApp.dataSource);
    seed = await createExamWithProblems(testApp.dataSource);
    const reg = await registerUser(testApp.app);
    token = reg.token;
    userId = reg.user.id as number;
    testApp.mockJudge0.reset();
  });

  it('should create a Score record on first submission', async () => {
    testApp.mockJudge0.setAllPassing();

    await request(testApp.app.getHttpServer())
      .post('/api/submissions')
      .set(authHeader(token))
      .send({
        problemId: seed.problems[0].id,
        sourceCode: 'correct code',
        languageId: 71,
      })
      .expect(201);

    const score = await testApp.dataSource.getRepository(Score).findOne({
      where: {
        userId,
        problemId: seed.problems[0].id,
        examId: seed.exam.id,
      },
    });

    expect(score).toBeDefined();
    expect(score!.totalAttempts).toBe(1);
    expect(score!.wrongAttempts).toBe(0);
    expect(score!.firstSolvedAt).not.toBeNull();
    expect(Number(score!.bestScore)).toBeGreaterThan(0);
  });

  it('should give score > 3 for first correct submission', async () => {
    testApp.mockJudge0.setAllPassing();

    await request(testApp.app.getHttpServer())
      .post('/api/submissions')
      .set(authHeader(token))
      .send({
        problemId: seed.problems[0].id,
        sourceCode: 'correct code',
        languageId: 71,
      })
      .expect(201);

    const score = await testApp.dataSource.getRepository(Score).findOne({
      where: { userId, problemId: seed.problems[0].id },
    });

    // Exam started 1 hour ago, duration 180 min
    // solveTime ≈ 60 min, penalty = 0, effective ≈ 60
    // remaining ≈ 120, score ≈ 10 * (120/180) ≈ 6.67
    expect(Number(score!.bestScore)).toBeGreaterThan(3);
  });

  it('should track wrong attempts before first solve', async () => {
    // First: wrong answer
    testApp.mockJudge0.setAllFailing();
    await request(testApp.app.getHttpServer())
      .post('/api/submissions')
      .set(authHeader(token))
      .send({
        problemId: seed.problems[0].id,
        sourceCode: 'wrong code',
        languageId: 71,
      })
      .expect(201);

    // Second: wrong answer
    await request(testApp.app.getHttpServer())
      .post('/api/submissions')
      .set(authHeader(token))
      .send({
        problemId: seed.problems[0].id,
        sourceCode: 'still wrong',
        languageId: 71,
      })
      .expect(201);

    const score = await testApp.dataSource.getRepository(Score).findOne({
      where: { userId, problemId: seed.problems[0].id },
    });

    expect(score!.totalAttempts).toBe(2);
    expect(score!.wrongAttempts).toBe(2);
    expect(score!.firstSolvedAt).toBeNull();
    expect(Number(score!.bestScore)).toBe(0);
  });

  it('should apply penalty for wrong attempts when solved', async () => {
    // Submit 2 wrong answers first
    testApp.mockJudge0.setAllFailing();
    await request(testApp.app.getHttpServer())
      .post('/api/submissions')
      .set(authHeader(token))
      .send({
        problemId: seed.problems[0].id,
        sourceCode: 'wrong 1',
        languageId: 71,
      });
    await request(testApp.app.getHttpServer())
      .post('/api/submissions')
      .set(authHeader(token))
      .send({
        problemId: seed.problems[0].id,
        sourceCode: 'wrong 2',
        languageId: 71,
      });

    // Now submit correct
    testApp.mockJudge0.setAllPassing();
    await request(testApp.app.getHttpServer())
      .post('/api/submissions')
      .set(authHeader(token))
      .send({
        problemId: seed.problems[0].id,
        sourceCode: 'correct code',
        languageId: 71,
      })
      .expect(201);

    const score = await testApp.dataSource.getRepository(Score).findOne({
      where: { userId, problemId: seed.problems[0].id },
    });

    expect(score!.totalAttempts).toBe(3);
    expect(score!.wrongAttempts).toBe(2);
    expect(score!.firstSolvedAt).not.toBeNull();
    // Score should reflect penalty: 2 wrong * 5 min = 10 min penalty
    expect(Number(score!.bestScore)).toBeGreaterThanOrEqual(3);
  });

  it('should block re-submission after first solve', async () => {
    // First: correct
    testApp.mockJudge0.setAllPassing();
    await request(testApp.app.getHttpServer())
      .post('/api/submissions')
      .set(authHeader(token))
      .send({
        problemId: seed.problems[0].id,
        sourceCode: 'correct code',
        languageId: 71,
      })
      .expect(201);

    // Second submission should be blocked
    testApp.mockJudge0.setAllFailing();
    await request(testApp.app.getHttpServer())
      .post('/api/submissions')
      .set(authHeader(token))
      .send({
        problemId: seed.problems[0].id,
        sourceCode: 'wrong after solve',
        languageId: 71,
      })
      .expect(400);

    const score = await testApp.dataSource.getRepository(Score).findOne({
      where: { userId, problemId: seed.problems[0].id },
    });

    expect(score!.totalAttempts).toBe(1);
    expect(score!.wrongAttempts).toBe(0);
  });

  it('should preserve score after blocked re-submission', async () => {
    testApp.mockJudge0.setAllPassing();

    // First correct submission
    await request(testApp.app.getHttpServer())
      .post('/api/submissions')
      .set(authHeader(token))
      .send({
        problemId: seed.problems[0].id,
        sourceCode: 'first correct',
        languageId: 71,
      })
      .expect(201);

    const score1 = await testApp.dataSource.getRepository(Score).findOne({
      where: { userId, problemId: seed.problems[0].id },
    });
    const bestScore1 = Number(score1!.bestScore);
    expect(bestScore1).toBeGreaterThan(0);

    // Second submission should be blocked (already solved → 400, or rate-limited → 429)
    const res = await request(testApp.app.getHttpServer())
      .post('/api/submissions')
      .set(authHeader(token))
      .send({
        problemId: seed.problems[0].id,
        sourceCode: 'second correct',
        languageId: 71,
      });
    expect([400, 429]).toContain(res.status);

    // Score should remain unchanged
    const score2 = await testApp.dataSource.getRepository(Score).findOne({
      where: { userId, problemId: seed.problems[0].id },
    });

    expect(Number(score2!.bestScore)).toBe(bestScore1);
  });
});
