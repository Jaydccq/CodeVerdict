import request from 'supertest';
import { createTestApp, TestApp } from '../setup/test-app';
import { cleanDatabase } from '../helpers/db.helper';
import { registerUser, authHeader } from '../helpers/auth.helper';
import {
  createExamWithProblems,
  createExpiredExam,
  createProblem,
  createTestCase,
} from '../helpers/exam.helper';
import type { ExamWithProblems } from '../helpers/exam.helper';

describe('Problems (E2E)', () => {
  let testApp: TestApp;
  let token: string;
  let seed: ExamWithProblems;

  beforeAll(async () => {
    testApp = await createTestApp();
    await cleanDatabase(testApp.dataSource);
    const reg = await registerUser(testApp.app);
    token = reg.token;
    seed = await createExamWithProblems(testApp.dataSource);
  });

  afterAll(async () => {
    await testApp.app.close();
  });

  describe('GET /api/problems', () => {
    it('should return problems during active exam window', async () => {
      const res = await request(testApp.app.getHttpServer())
        .get('/api/problems')
        .set(authHeader(token))
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBe(2);
      // Ordered by displayOrder
      expect(res.body[0].title).toBe('Sum of Two');
      expect(res.body[1].title).toBe('Product of Two');
    });

    it('should return expected fields for each problem', async () => {
      const res = await request(testApp.app.getHttpServer())
        .get('/api/problems')
        .set(authHeader(token))
        .expect(200);

      const problem = res.body[0];
      expect(problem).toHaveProperty('id');
      expect(problem).toHaveProperty('title');
      expect(problem).toHaveProperty('difficulty');
      expect(problem).toHaveProperty('displayOrder');
      expect(problem).toHaveProperty('maxScore');
    });

    it('should return 401 without JWT', async () => {
      await request(testApp.app.getHttpServer())
        .get('/api/problems')
        .expect(401);
    });

    it('should return 403 outside exam window', async () => {
      await cleanDatabase(testApp.dataSource);
      const reg = await registerUser(testApp.app);
      token = reg.token;
      // Create expired exam
      await createExpiredExam(testApp.dataSource);

      await request(testApp.app.getHttpServer())
        .get('/api/problems')
        .set(authHeader(token))
        .expect(403);

      // Restore active exam for remaining tests
      await cleanDatabase(testApp.dataSource);
      const reg2 = await registerUser(testApp.app);
      token = reg2.token;
      seed = await createExamWithProblems(testApp.dataSource);
    });

    it('should return 403 when no active exam', async () => {
      await cleanDatabase(testApp.dataSource);
      const reg = await registerUser(testApp.app);

      await request(testApp.app.getHttpServer())
        .get('/api/problems')
        .set(authHeader(reg.token))
        .expect(403);

      // Restore
      seed = await createExamWithProblems(testApp.dataSource);
      const reg2 = await registerUser(testApp.app);
      token = reg2.token;
    });
  });

  describe('GET /api/problems/:id', () => {
    it('should return problem with only visible test cases', async () => {
      const problemId = seed.problems[0].id;

      const res = await request(testApp.app.getHttpServer())
        .get(`/api/problems/${problemId}`)
        .set(authHeader(token))
        .expect(200);

      expect(res.body.id).toBe(problemId);
      expect(res.body.title).toBe('Sum of Two');

      // Should only have visible test cases (2 visible, 1 hidden)
      if (res.body.testCases) {
        const visibleOnly = res.body.testCases.every(
          (tc: { isVisible: boolean }) => tc.isVisible === true,
        );
        expect(visibleOnly).toBe(true);
        expect(res.body.testCases.length).toBe(2);
      }
    });

    it('should return 404 for non-existent problem', async () => {
      await request(testApp.app.getHttpServer())
        .get('/api/problems/99999')
        .set(authHeader(token))
        .expect(404);
    });

    it('should return 401 without JWT', async () => {
      await request(testApp.app.getHttpServer())
        .get(`/api/problems/${seed.problems[0].id}`)
        .expect(401);
    });
  });
});
