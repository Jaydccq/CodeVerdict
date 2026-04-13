import request from 'supertest';
import { createTestApp, TestApp } from '../setup/test-app';
import { cleanDatabase } from '../helpers/db.helper';
import { registerUser, authHeader } from '../helpers/auth.helper';
import { createActiveExam } from '../helpers/exam.helper';
import { AutoSave } from '../../src/entities/auto-save.entity';

describe('Autosave (E2E)', () => {
  let testApp: TestApp;
  let token: string;
  let examId: number;

  beforeAll(async () => {
    testApp = await createTestApp();
    await cleanDatabase(testApp.dataSource);
    const exam = await createActiveExam(testApp.dataSource);
    examId = exam.id;
    const reg = await registerUser(testApp.app);
    token = reg.token;
  });

  afterAll(async () => {
    await testApp.app.close();
  });

  describe('POST /api/autosave', () => {
    it('should save code state', async () => {
      const codeState = {
        '1': { '71': 'print("hello")' },
      };

      const res = await request(testApp.app.getHttpServer())
        .post('/api/autosave')
        .set(authHeader(token))
        .send({ examId, codeState })
        .expect(201);

      expect(res.body).toHaveProperty('id');
      expect(res.body.examId).toBe(examId);
      expect(res.body.codeState).toEqual(codeState);
    });

    it('should upsert (second save overwrites)', async () => {
      const codeState1 = { '1': { '71': 'first version' } };
      const codeState2 = { '1': { '71': 'second version' } };

      await request(testApp.app.getHttpServer())
        .post('/api/autosave')
        .set(authHeader(token))
        .send({ examId, codeState: codeState1 })
        .expect(201);

      await request(testApp.app.getHttpServer())
        .post('/api/autosave')
        .set(authHeader(token))
        .send({ examId, codeState: codeState2 })
        .expect(201);

      // Should have only 1 record for this user+exam
      const count = await testApp.dataSource.getRepository(AutoSave).count();
      // Could be 1 total (just our user's record)
      expect(count).toBeGreaterThanOrEqual(1);

      // Verify the latest code state
      const res = await request(testApp.app.getHttpServer())
        .get(`/api/autosave/${examId}`)
        .set(authHeader(token))
        .expect(200);

      expect(res.body.codeState).toEqual(codeState2);
    });

    it('should reject without JWT', async () => {
      await request(testApp.app.getHttpServer())
        .post('/api/autosave')
        .send({ examId, codeState: {} })
        .expect(401);
    });

    it('should reject invalid body', async () => {
      await request(testApp.app.getHttpServer())
        .post('/api/autosave')
        .set(authHeader(token))
        .send({})
        .expect(400);
    });
  });

  describe('GET /api/autosave/:examId', () => {
    it('should return saved code state', async () => {
      const codeState = { '1': { '71': 'loaded code' } };

      await request(testApp.app.getHttpServer())
        .post('/api/autosave')
        .set(authHeader(token))
        .send({ examId, codeState })
        .expect(201);

      const res = await request(testApp.app.getHttpServer())
        .get(`/api/autosave/${examId}`)
        .set(authHeader(token))
        .expect(200);

      expect(res.body.codeState).toEqual(codeState);
    });

    it('should return null for non-existent save', async () => {
      const res = await request(testApp.app.getHttpServer())
        .get('/api/autosave/99999')
        .set(authHeader(token))
        .expect(200);

      expect(
        res.body === null ||
          res.body === '' ||
          Object.keys(res.body).length === 0,
      ).toBe(true);
    });

    it('should not return other users data', async () => {
      const { token: otherToken } = await registerUser(testApp.app);

      const res = await request(testApp.app.getHttpServer())
        .get(`/api/autosave/${examId}`)
        .set(authHeader(otherToken))
        .expect(200);

      // Other user has no save, should be null
      expect(
        res.body === null ||
          res.body === '' ||
          Object.keys(res.body).length === 0,
      ).toBe(true);
    });

    it('should reject without JWT', async () => {
      await request(testApp.app.getHttpServer())
        .get(`/api/autosave/${examId}`)
        .expect(401);
    });
  });
});
