import request from 'supertest';
import { createTestApp, TestApp } from '../setup/test-app';
import { cleanDatabase } from '../helpers/db.helper';
import { registerUser, authHeader } from '../helpers/auth.helper';
import { createActiveExam } from '../helpers/exam.helper';

describe('Exams (E2E)', () => {
  let testApp: TestApp;
  let token: string;

  beforeAll(async () => {
    testApp = await createTestApp();
    await cleanDatabase(testApp.dataSource);
    const registered = await registerUser(testApp.app);
    token = registered.token;
  });

  afterAll(async () => {
    await testApp.app.close();
  });

  describe('GET /api/exams/active', () => {
    it('should return null when no active exam', async () => {
      const res = await request(testApp.app.getHttpServer())
        .get('/api/exams/active')
        .expect(200);

      // null serializes to empty body or literal null
      expect(
        res.body === null ||
          res.body === '' ||
          Object.keys(res.body).length === 0,
      ).toBe(true);
    });

    it('should return active exam after creating one', async () => {
      const exam = await createActiveExam(testApp.dataSource);

      const res = await request(testApp.app.getHttpServer())
        .get('/api/exams/active')
        .expect(200);

      expect(res.body).toMatchObject({
        id: exam.id,
        title: 'Test Exam',
        durationMinutes: 180,
      });
      expect(res.body).toHaveProperty('startTime');
      expect(res.body).toHaveProperty('endTime');
      expect(res.body).toHaveProperty('allowedLanguages');
      expect(Array.isArray(res.body.allowedLanguages)).toBe(true);
    });
  });

  describe('GET /api/exams/status', () => {
    it('should return 401 without JWT', async () => {
      await request(testApp.app.getHttpServer())
        .get('/api/exams/status')
        .expect(401);
    });

    it('should return exam status with JWT', async () => {
      const res = await request(testApp.app.getHttpServer())
        .get('/api/exams/status')
        .set(authHeader(token))
        .expect(200);

      expect(res.body).toHaveProperty('examId');
      expect(res.body).toHaveProperty('examEndTime');
      expect(res.body).toHaveProperty('serverTime');
    });

    it('should return 404 when no active exam', async () => {
      // Clean to remove the exam
      await cleanDatabase(testApp.dataSource);
      // Re-register since we truncated users
      const reg = await registerUser(testApp.app);
      token = reg.token;

      await request(testApp.app.getHttpServer())
        .get('/api/exams/status')
        .set(authHeader(token))
        .expect(404);
    });
  });
});
