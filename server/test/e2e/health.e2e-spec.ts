import request from 'supertest';
import { createTestApp, TestApp } from '../setup/test-app';
import { cleanDatabase } from '../helpers/db.helper';
import { registerUser, authHeader } from '../helpers/auth.helper';

describe('Health & Languages (E2E)', () => {
  let testApp: TestApp;

  beforeAll(async () => {
    testApp = await createTestApp();
    await cleanDatabase(testApp.dataSource);
  });

  afterAll(async () => {
    await testApp.app.close();
  });

  describe('GET /api/health', () => {
    it('should return 200 with status ok', async () => {
      const res = await request(testApp.app.getHttpServer())
        .get('/api/health')
        .expect(200);

      expect(res.body).toMatchObject({ status: 'ok' });
    });
  });

  describe('GET /api/languages', () => {
    it('should return 401 without JWT', async () => {
      await request(testApp.app.getHttpServer())
        .get('/api/languages')
        .expect(401);
    });

    it('should return languages with valid JWT', async () => {
      const { token } = await registerUser(testApp.app);

      const res = await request(testApp.app.getHttpServer())
        .get('/api/languages')
        .set(authHeader(token))
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBeGreaterThan(0);
      expect(res.body[0]).toHaveProperty('id');
      expect(res.body[0]).toHaveProperty('name');
    });
  });
});
