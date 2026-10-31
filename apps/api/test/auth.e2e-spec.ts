import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module.js';
import { configureApp } from '../src/bootstrap.js';

// Needs Postgres (migrated) and Redis: `make infra-up && make migrate`.
describe('API (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication({ bufferLogs: true });
    configureApp(app);
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('GET /health reports every dependency up', async () => {
    const res = await request(app.getHttpServer()).get('/api/v1/health').expect(200);
    expect(res.body.status).toBe('ok');
    expect(Object.keys(res.body.details)).toEqual(['database', 'redis', 'storage']);
  });

  it('rejects protected routes without a token', async () => {
    await request(app.getHttpServer()).get('/api/v1/auth/me').expect(401);
    await request(app.getHttpServer()).get('/api/v1/iam/roles').expect(401);
  });

  it('rejects an invalid mobile on OTP request', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/auth/otp/request')
      .send({ mobile: '12345' })
      .expect(400);
  });

  it('rejects a wrong OTP code', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/auth/otp/verify')
      .send({ mobile: '09129999999', code: '00000' })
      .expect(401);
  });
});
