import request from 'supertest';
import { createTestApp, TestApp } from '../setup/test-app';
import { cleanDatabase } from '../helpers/db.helper';
import { registerUser, authHeader } from '../helpers/auth.helper';
import {
  createExamWithProblems,
  createExpiredExam,
} from '../helpers/exam.helper';
import type { ExamWithProblems } from '../helpers/exam.helper';
import { Submission } from '../../src/entities/submission.entity';

describe('Submissions (E2E)', () => {
  let testApp: TestApp;
  let token: string;
  let userId: number;
  let seed: ExamWithProblems;

  beforeAll(async () => {
    testApp = await createTestApp();
    await cleanDatabase(testApp.dataSource);
    seed = await createExamWithProblems(testApp.dataSource);
    const reg = await registerUser(testApp.app);
    token = reg.token;
    userId = reg.user.id as number;
    testApp.mockJudge0.reset();
  });

  afterAll(async () => {
    await testApp.app.close();
  });

  beforeEach(() => {
    testApp.mockJudge0.reset(); // Reset to all-passing by default
  });

  describe('POST /api/submissions (submit for grading)', () => {
    it('should accept submission with all-passing code', async () => {
      testApp.mockJudge0.setAllPassing();

      const res = await request(testApp.app.getHttpServer())
        .post('/api/submissions')
        .set(authHeader(token))
        .send({
          problemId: seed.problems[0].id,
          sourceCode: 'print(sum(map(int, input().split())))',
          languageId: 71, // python
        })
        .expect(201);

      expect(res.body.verdict).toBe('accepted');
      expect(res.body.passedTestCases).toBe(res.body.totalTestCases);
      expect(res.body).toHaveProperty('id');
      expect(res.body).toHaveProperty('testResults');
      expect(Array.isArray(res.body.testResults)).toBe(true);
    });

    it('should return wrong_answer for failing code', async () => {
      testApp.mockJudge0.setAllFailing();

      const res = await request(testApp.app.getHttpServer())
        .post('/api/submissions')
        .set(authHeader(token))
        .send({
          problemId: seed.problems[1].id,
          sourceCode: 'print("wrong")',
          languageId: 71,
        })
        .expect(201);

      expect(res.body.verdict).toBe('wrong_answer');
      expect(res.body.passedTestCases).toBe(0);
    });

    it('should return compilation_error', async () => {
      testApp.mockJudge0.setCompilationError();

      const res = await request(testApp.app.getHttpServer())
        .post('/api/submissions')
        .set(authHeader(token))
        .send({
          problemId: seed.problems[1].id,
          sourceCode: 'invalid code {{{{',
          languageId: 54, // cpp
        })
        .expect(201);

      expect(res.body.verdict).toBe('compilation_error');
    });

    it('should reject invalid languageId', async () => {
      await request(testApp.app.getHttpServer())
        .post('/api/submissions')
        .set(authHeader(token))
        .send({
          problemId: seed.problems[0].id,
          sourceCode: 'print("hello")',
          languageId: 999,
        })
        .expect(400);
    });

    it('should reject disallowed language for exam', async () => {
      // Create exam that only allows python
      await cleanDatabase(testApp.dataSource);
      seed = await createExamWithProblems(testApp.dataSource, {
        allowedLanguages: [92],
      });
      const reg = await registerUser(testApp.app);
      token = reg.token;
      userId = reg.user.id as number;

      await request(testApp.app.getHttpServer())
        .post('/api/submissions')
        .set(authHeader(token))
        .send({
          problemId: seed.problems[0].id,
          sourceCode: '#include <stdio.h>',
          languageId: 54, // cpp - not allowed
        })
        .expect(403);

      // Restore full language support
      await cleanDatabase(testApp.dataSource);
      seed = await createExamWithProblems(testApp.dataSource);
      const reg2 = await registerUser(testApp.app);
      token = reg2.token;
      userId = reg2.user.id as number;
    });

    it('should reject submission outside exam window', async () => {
      await cleanDatabase(testApp.dataSource);
      await createExpiredExam(testApp.dataSource);
      const reg = await registerUser(testApp.app);

      await request(testApp.app.getHttpServer())
        .post('/api/submissions')
        .set(authHeader(reg.token))
        .send({
          problemId: 1,
          sourceCode: 'print("hello")',
          languageId: 71,
        })
        .expect(403);

      // Restore
      await cleanDatabase(testApp.dataSource);
      seed = await createExamWithProblems(testApp.dataSource);
      const reg2 = await registerUser(testApp.app);
      token = reg2.token;
      userId = reg2.user.id as number;
    });

    it('should reject without JWT', async () => {
      await request(testApp.app.getHttpServer())
        .post('/api/submissions')
        .send({
          problemId: seed.problems[0].id,
          sourceCode: 'print("hello")',
          languageId: 71,
        })
        .expect(401);
    });

    it('should reject empty body', async () => {
      await request(testApp.app.getHttpServer())
        .post('/api/submissions')
        .set(authHeader(token))
        .send({})
        .expect(400);
    });
  });

  describe('POST /api/submissions/run (test run without scoring)', () => {
    it('should run code and return results', async () => {
      testApp.mockJudge0.setAllPassing();

      const res = await request(testApp.app.getHttpServer())
        .post('/api/submissions/run')
        .set(authHeader(token))
        .send({
          problemId: seed.problems[0].id,
          sourceCode: 'print(sum(map(int, input().split())))',
          languageId: 71,
        })
        .expect(201);

      expect(res.body).toHaveProperty('results');
      expect(Array.isArray(res.body.results)).toBe(true);
    });

    it('should include customResult when customInput provided', async () => {
      testApp.mockJudge0.setAllPassing();

      const res = await request(testApp.app.getHttpServer())
        .post('/api/submissions/run')
        .set(authHeader(token))
        .send({
          problemId: seed.problems[0].id,
          sourceCode: 'print(sum(map(int, input().split())))',
          languageId: 71,
          customInput: '5 10',
        })
        .expect(201);

      expect(res.body).toHaveProperty('results');
      expect(res.body).toHaveProperty('customResult');
    });

    it('should NOT create a Submission record in database', async () => {
      const countBefore = await testApp.dataSource
        .getRepository(Submission)
        .count();

      await request(testApp.app.getHttpServer())
        .post('/api/submissions/run')
        .set(authHeader(token))
        .send({
          problemId: seed.problems[0].id,
          sourceCode: 'print("test")',
          languageId: 71,
        })
        .expect(201);

      const countAfter = await testApp.dataSource
        .getRepository(Submission)
        .count();

      expect(countAfter).toBe(countBefore);
    });
  });

  describe('GET /api/submissions (list own submissions)', () => {
    it('should list own submissions', async () => {
      // Make a submission first
      testApp.mockJudge0.setAllPassing();
      await request(testApp.app.getHttpServer())
        .post('/api/submissions')
        .set(authHeader(token))
        .send({
          problemId: seed.problems[0].id,
          sourceCode: 'print(sum(map(int, input().split())))',
          languageId: 71,
        })
        .expect(201);

      const res = await request(testApp.app.getHttpServer())
        .get('/api/submissions')
        .set(authHeader(token))
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBeGreaterThan(0);
      expect(res.body[0]).toHaveProperty('id');
      expect(res.body[0]).toHaveProperty('verdict');
      expect(res.body[0]).toHaveProperty('submittedAt');
    });

    it('should filter by problemId', async () => {
      const res = await request(testApp.app.getHttpServer())
        .get(`/api/submissions?problemId=${seed.problems[0].id}`)
        .set(authHeader(token))
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
      for (const sub of res.body) {
        expect(sub.problemId).toBe(seed.problems[0].id);
      }
    });

    it('should not show other users submissions', async () => {
      const { token: otherToken } = await registerUser(testApp.app);

      const res = await request(testApp.app.getHttpServer())
        .get('/api/submissions')
        .set(authHeader(otherToken))
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBe(0);
    });
  });

  describe('GET /api/submissions/:id', () => {
    it('should return own submission with test results', async () => {
      testApp.mockJudge0.setAllPassing();
      const submitRes = await request(testApp.app.getHttpServer())
        .post('/api/submissions')
        .set(authHeader(token))
        .send({
          problemId: seed.problems[1].id,
          sourceCode: 'final submission',
          languageId: 71,
        })
        .expect(201);

      const res = await request(testApp.app.getHttpServer())
        .get(`/api/submissions/${submitRes.body.id}`)
        .set(authHeader(token))
        .expect(200);

      expect(res.body.id).toBe(submitRes.body.id);
      expect(res.body).toHaveProperty('testResults');
      expect(res.body).toHaveProperty('code');
    });

    it('should return 403 for another users submission', async () => {
      // Use an existing submission from previous tests instead of creating a new one
      const existingSubmission = await testApp.dataSource
        .getRepository(Submission)
        .findOne({ where: { userId }, order: { id: 'DESC' } });

      expect(existingSubmission).toBeDefined();

      const { token: otherToken } = await registerUser(testApp.app);

      await request(testApp.app.getHttpServer())
        .get(`/api/submissions/${existingSubmission!.id}`)
        .set(authHeader(otherToken))
        .expect(403);
    });

    it('should return 404 for non-existent submission', async () => {
      await request(testApp.app.getHttpServer())
        .get('/api/submissions/99999')
        .set(authHeader(token))
        .expect(404);
    });
  });
});
