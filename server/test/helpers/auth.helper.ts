import { INestApplication } from '@nestjs/common';
import request from 'supertest';

let userCounter = 0;

export function resetUserCounter(): void {
  userCounter = 0;
}

export async function registerUser(
  app: INestApplication,
  overrides: Partial<{
    rollNumber: string;
    firstName: string;
    lastName: string;
    email: string;
    password: string;
  }> = {},
): Promise<{ token: string; user: Record<string, unknown> }> {
  userCounter++;
  const body = {
    rollNumber: overrides.rollNumber || `ROLL${Date.now()}${userCounter}`,
    firstName: overrides.firstName || 'Test',
    lastName: overrides.lastName || `User${userCounter}`,
    email: overrides.email || `testuser${Date.now()}${userCounter}@test.com`,
    password: overrides.password || 'password123',
    ...overrides,
  };

  const res = await request(app.getHttpServer())
    .post('/api/auth/register')
    .send(body)
    .expect(201);

  return {
    token: res.body.accessToken,
    user: res.body.user,
  };
}

export async function loginUser(
  app: INestApplication,
  email: string,
  password: string,
): Promise<{ token: string; user: Record<string, unknown> }> {
  const res = await request(app.getHttpServer())
    .post('/api/auth/login')
    .send({ email, password })
    .expect(201);

  return {
    token: res.body.accessToken,
    user: res.body.user,
  };
}

export function authHeader(token: string): { Authorization: string } {
  return { Authorization: `Bearer ${token}` };
}
