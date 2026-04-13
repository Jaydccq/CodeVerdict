import request from 'supertest';
import { createTestApp, TestApp } from '../setup/test-app';
import { cleanDatabase } from '../helpers/db.helper';
import { registerUser, loginUser, authHeader } from '../helpers/auth.helper';

describe('Auth (E2E)', () => {
  let testApp: TestApp;

  beforeAll(async () => {
    testApp = await createTestApp();
    await cleanDatabase(testApp.dataSource);
  });

  afterAll(async () => {
    await testApp.app.close();
  });

  describe('POST /api/auth/register', () => {
    it('should register a new user and return token + user', async () => {
      const body = {
        rollNumber: 'REG001',
        firstName: 'John',
        lastName: 'Doe',
        email: 'john.doe@test.com',
        password: 'password123',
      };

      const res = await request(testApp.app.getHttpServer())
        .post('/api/auth/register')
        .send(body)
        .expect(201);

      expect(res.body).toHaveProperty('accessToken');
      expect(typeof res.body.accessToken).toBe('string');
      expect(res.body.user).toMatchObject({
        email: 'john.doe@test.com',
        rollNumber: 'REG001',
        firstName: 'John',
        lastName: 'Doe',
        role: 'STUDENT',
      });
      expect(res.body.user).toHaveProperty('id');
      expect(res.body.user).not.toHaveProperty('password');
    });

    it('should reject duplicate email', async () => {
      await request(testApp.app.getHttpServer())
        .post('/api/auth/register')
        .send({
          rollNumber: 'REG002',
          firstName: 'Jane',
          lastName: 'Doe',
          email: 'john.doe@test.com', // same email as above
          password: 'password123',
        })
        .expect(409);
    });

    it('should reject duplicate rollNumber', async () => {
      await request(testApp.app.getHttpServer())
        .post('/api/auth/register')
        .send({
          rollNumber: 'REG001', // same roll as above
          firstName: 'Jane',
          lastName: 'Doe',
          email: 'jane.unique@test.com',
          password: 'password123',
        })
        .expect(409);
    });

    it('should reject missing required fields', async () => {
      const res = await request(testApp.app.getHttpServer())
        .post('/api/auth/register')
        .send({})
        .expect(400);

      expect(res.body.message).toBeDefined();
    });

    it('should reject empty body', async () => {
      await request(testApp.app.getHttpServer())
        .post('/api/auth/register')
        .send({})
        .expect(400);
    });
  });

  describe('POST /api/auth/login', () => {
    it('should login with valid credentials', async () => {
      const res = await request(testApp.app.getHttpServer())
        .post('/api/auth/login')
        .send({ email: 'john.doe@test.com', password: 'password123' })
        .expect(201);

      expect(res.body).toHaveProperty('accessToken');
      expect(res.body.user.email).toBe('john.doe@test.com');
    });

    it('should reject wrong password', async () => {
      await request(testApp.app.getHttpServer())
        .post('/api/auth/login')
        .send({ email: 'john.doe@test.com', password: 'wrongpassword' })
        .expect(401);
    });

    it('should reject non-existent email', async () => {
      await request(testApp.app.getHttpServer())
        .post('/api/auth/login')
        .send({ email: 'nobody@test.com', password: 'password123' })
        .expect(401);
    });

    it('should reject missing fields', async () => {
      await request(testApp.app.getHttpServer())
        .post('/api/auth/login')
        .send({})
        .expect(400);
    });
  });

  describe('GET /api/auth/me', () => {
    it('should return user profile with valid JWT', async () => {
      const { token } = await loginUser(
        testApp.app,
        'john.doe@test.com',
        'password123',
      );

      const res = await request(testApp.app.getHttpServer())
        .get('/api/auth/me')
        .set(authHeader(token))
        .expect(200);

      expect(res.body).toMatchObject({
        email: 'john.doe@test.com',
        rollNumber: 'REG001',
        firstName: 'John',
        lastName: 'Doe',
        role: 'STUDENT',
      });
      expect(res.body).not.toHaveProperty('password');
    });

    it('should return 401 without JWT', async () => {
      await request(testApp.app.getHttpServer())
        .get('/api/auth/me')
        .expect(401);
    });

    it('should return 401 with invalid JWT', async () => {
      await request(testApp.app.getHttpServer())
        .get('/api/auth/me')
        .set(authHeader('invalid.token.here'))
        .expect(401);
    });

    it('should return the JWT from register works for /me', async () => {
      const { token, user } = await registerUser(testApp.app, {
        rollNumber: 'REG_ME_TEST',
        email: 'metest@test.com',
      });

      const res = await request(testApp.app.getHttpServer())
        .get('/api/auth/me')
        .set(authHeader(token))
        .expect(200);

      expect(res.body.id).toBe(user.id);
      expect(res.body.email).toBe('metest@test.com');
    });
  });
});
