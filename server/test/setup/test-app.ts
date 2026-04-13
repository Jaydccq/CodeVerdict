import { Test, TestingModule } from '@nestjs/testing';
import {
  INestApplication,
  ValidationPipe,
  CanActivate,
  ExecutionContext,
} from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';
import { DataSource } from 'typeorm';
import dotenv from 'dotenv';
import path from 'path';
import { AppModule } from '../../src/app.module';
import { Judge0Service } from '../../src/submissions/judge0.service';
import { MockJudge0Service } from '../mocks/mock-judge0.service';

// Load test env before module compilation
dotenv.config({ path: path.resolve(__dirname, '../../.env.test') });

class NoopThrottlerGuard implements CanActivate {
  canActivate(_context: ExecutionContext): boolean {
    return true;
  }
}

export interface TestApp {
  app: INestApplication;
  module: TestingModule;
  mockJudge0: MockJudge0Service;
  dataSource: DataSource;
}

export async function createTestApp(): Promise<TestApp> {
  const mockJudge0 = new MockJudge0Service();

  const module = await Test.createTestingModule({
    imports: [AppModule],
  })
    .overrideProvider(Judge0Service)
    .useValue(mockJudge0)
    .overrideProvider(ThrottlerGuard)
    .useClass(NoopThrottlerGuard)
    .overrideGuard(ThrottlerGuard)
    .useValue(new NoopThrottlerGuard())
    .compile();

  const app = module.createNestApplication();

  // Mirror main.ts configuration
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  app.setGlobalPrefix('api');

  await app.init();

  const dataSource = module.get(DataSource);

  return { app, module, mockJudge0, dataSource };
}
